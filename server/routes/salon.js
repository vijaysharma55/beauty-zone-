import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  db,
  newId,
  nowIso,
  findSalonByOwner,
  findSalonBySlug,
  getServicesForSalon,
  getStaffForSalon,
  serializeSalon,
  serializeService,
  serializeStaff,
  getSubscriptionForSalon,
  serializeSubscription,
  getSettings,
  audit,
  UPLOAD_DIR,
  DEFAULT_TIMINGS,
  TEMPLATE_IDS,
} from '../db.js';
import {
  str,
  int,
  bool,
  ValidationError,
  HttpError,
  isSafeImageUrl,
  normalizeSlug,
  sanitizeText,
  rateLimit,
} from '../security.js';
import { requireAuth, requireRole, asyncHandler } from '../middleware.js';
import { workflowInfo, submitForApproval, listVersions, serializeVersion } from '../workflow.js';
import { ownerBookingsRouter } from './bookings.js';
import { salonPaymentsRouter } from './salon-payments.js';
import { serviceAdvanceFields } from '../payments/salon-settings.js';
import { detectImage } from '../payments/proofs.js';
import {
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_STAFF_APP_ACCESS_ROLE,
  MAX_STAFF_SKILLS,
  MAX_STAFF_SKILL_LENGTH,
  STAFF_APP_ACCESS_ROLE_VALUES,
  STAFF_AVAILABILITY_STATUSES,
  STAFF_PRIMARY_ROLE_VALUES,
  defaultWeeklySchedule,
  getPrimaryRoleLabel,
  isStaffAppAccessRole,
  isStaffAvailabilityStatus,
  isStaffPrimaryRole,
  normalizeCommissionPercent,
  normalizeIndianMobile,
  normalizeServiceIdList,
  normalizeSkillList,
  normalizeWeeklySchedule,
  suggestedAppAccessRole,
} from '../../src/lib/staffRoles.js';
import {
  DEFAULT_SERVICE_CATEGORY,
  MAX_SERVICE_CATEGORY_LENGTH,
  MAX_SERVICE_NOTES_LENGTH,
  MAX_SERVICE_SUBCATEGORY_LENGTH,
  groupServicesByCategory,
  normalizeServiceCategory,
  normalizeServiceSubcategory,
  serviceCategoryOptions,
} from '../../src/lib/serviceCategories.js';

export const salonRouter = Router();

/* Every route in this router is salon-owner only. Ownership is resolved from the
   session, so there is no client-supplied salon id anywhere in this file. */
salonRouter.use(requireAuth, requireRole('salon_owner'));

/* Booking & advance payment settings, payment methods, transactions,
   verification queue, receipts and WhatsApp retries. */
salonRouter.use(salonPaymentsRouter);

function requireOwnSalon(req) {
  const salon = findSalonByOwner(req.user.id);
  if (!salon) throw new HttpError(409, 'Complete salon onboarding first.');
  return salon;
}

const SALON_FIELD_MAP = {
  name: { column: 'name', validate: (v) => str(v, { min: 2, max: 120, field: 'Salon name', required: true }) },
  tagline: { column: 'tagline', validate: (v) => str(v, { max: 160, field: 'Tagline' }) },
  description: { column: 'description', validate: (v) => sanitizeText(str(v, { max: 3000, field: 'Description' }), 3000) },
  logoUrl: { column: 'logo_url', validate: imageField('Logo') },
  coverImage: { column: 'cover_image', validate: imageField('Cover image') },
  phone: { column: 'phone', validate: (v) => str(v, { max: 40, field: 'Phone' }) },
  email: {
    column: 'email',
    validate: (v) => {
      const email = str(v, { max: 254, field: 'Business email' });
      if (email && !/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) {
        throw new ValidationError('Business email must be a valid email address');
      }
      return email;
    },
  },
  whatsapp: { column: 'whatsapp', validate: (v) => str(v, { max: 40, field: 'WhatsApp number' }) },
  addressLine: { column: 'address_line', validate: (v) => str(v, { max: 300, field: 'Address' }) },
  city: { column: 'city', validate: (v) => str(v, { max: 100, field: 'City' }) },
  state: { column: 'state', validate: (v) => str(v, { max: 100, field: 'State' }) },
  postalCode: { column: 'postal_code', validate: (v) => str(v, { max: 20, field: 'Postal code' }) },
  country: { column: 'country', validate: (v) => str(v, { max: 100, field: 'Country' }) },
  mapUrl: { column: 'map_url', validate: urlField('Map link') },
  instagram: { column: 'instagram', validate: (v) => str(v, { max: 200, field: 'Instagram' }) },
  facebook: { column: 'facebook', validate: (v) => str(v, { max: 200, field: 'Facebook' }) },
  heroTitle: { column: 'hero_title', validate: (v) => str(v, { max: 160, field: 'Hero title' }) },
  heroSubtitle: { column: 'hero_subtitle', validate: (v) => str(v, { max: 400, field: 'Hero subtitle' }) },
  ownerName: { column: 'owner_name', validate: (v) => str(v, { max: 120, field: 'Owner name' }) },
  ownerPhone: { column: 'owner_phone', validate: (v) => str(v, { max: 40, field: 'Owner phone' }) },
  templateId: {
    column: 'template_id',
    validate: (v) => {
      const id = str(v, { max: 30, field: 'Template' }).toLowerCase();
      if (id && !TEMPLATE_IDS.includes(id)) throw new ValidationError('Unknown website template');
      return id || 'luxe';
    },
  },
};

const DAY_IDS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Validates weekly opening hours: 7 entries, HH:MM times, open < close. */
export function validateTimings(input) {
  if (!Array.isArray(input)) throw new ValidationError('Opening hours must be a list of days');
  if (input.length > 7) throw new ValidationError('Opening hours can only cover the seven weekdays');
  const seen = new Set();
  return input.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new ValidationError('Invalid opening hours entry');
    const day = String(entry.day || '').toLowerCase();
    if (!DAY_IDS.includes(day)) throw new ValidationError('Invalid weekday in opening hours');
    if (seen.has(day)) throw new ValidationError('Each weekday can only appear once');
    seen.add(day);
    const closed = bool(entry.closed, false);
    const open = str(entry.open ?? '10:00', { max: 5, field: 'Opening time' }) || '10:00';
    const close = str(entry.close ?? '20:00', { max: 5, field: 'Closing time' }) || '20:00';
    if (!closed) {
      if (!TIME_RE.test(open) || !TIME_RE.test(close)) {
        throw new ValidationError('Opening hours must use 24-hour HH:MM format');
      }
      if (open >= close) throw new ValidationError('Closing time must be after opening time');
    }
    return { day, open, close, closed };
  });
}

function imageField(label) {
  return (value) => {
    const v = str(value, { max: 2_000_000, field: label });
    if (v && !isSafeImageUrl(v)) throw new ValidationError(`${label} must be a valid http(s) image URL or uploaded file`);
    return v;
  };
}

function urlField(label) {
  return (value) => {
    const v = str(value, { max: 500, field: label });
    if (!v) return '';
    try {
      const u = new URL(v);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('bad protocol');
      return v;
    } catch {
      throw new ValidationError(`${label} must be a valid http(s) URL`);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Salon profile + onboarding                                          */
/* ------------------------------------------------------------------ */

salonRouter.get('/', (req, res) => {
  const salon = findSalonByOwner(req.user.id);
  return res.json({
    salon: salon ? serializeSalon(salon) : null,
    workflow: salon ? workflowInfo(salon, req.user).workflow : null,
    versions: salon
      ? listVersions(salon.id).map(serializeVersion)
      : [],
    subscription: salon ? serializeSubscription(getSubscriptionForSalon(salon.id)) : null,
  });
});

salonRouter.post(
  '/onboarding',
  asyncHandler(async (req, res) => {
    if (findSalonByOwner(req.user.id)) {
      throw new HttpError(409, 'You have already completed salon onboarding.');
    }
    const settings = getSettings();
    const name = str(req.body?.name, { min: 2, max: 120, field: 'Salon name', required: true });
    const slug = slugFromBody(req.body?.slug || req.body?.name);
    assertSlugAvailable(slug);

    const id = newId();
    const ts = nowIso();
    const fields = collectSalonFields(req.body, { includeEmpty: true });
    fields.hero_title = fields.hero_title || name;
    fields.status = 'draft';
    fields.owner_name = fields.owner_name || req.user.name || '';
    fields.owner_phone = fields.owner_phone || fields.phone || '';
    fields.timings_json = JSON.stringify(
      req.body?.timings !== undefined ? validateTimings(req.body.timings) : DEFAULT_TIMINGS
    );
    if (!fields.template_id) fields.template_id = TEMPLATE_IDS[0];

    const columns = ['id', 'owner_id', 'name', 'slug', 'created_at', 'updated_at', 'onboarding_completed'];
    const values = [id, req.user.id, name, slug, ts, ts, 1];
    for (const [col, val] of Object.entries(fields)) {
      columns.push(col);
      values.push(val);
    }
    db.prepare(
      `INSERT INTO salons (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`
    ).run(...values);

    const trialDays = Number(settings.trialDays) || 14;
    db.prepare(
      `INSERT INTO subscriptions (id, salon_id, plan, status, current_period_end, created_at, updated_at)
       VALUES (?, ?, ?, 'trialing', ?, ?, ?)`
    ).run(
      newId(),
      id,
      settings.defaultPlan || 'starter',
      new Date(Date.now() + trialDays * 86_400_000).toISOString(),
      ts,
      ts
    );

    audit(req, 'salon.onboarding_completed', 'salon', id);
    const salon = findSalonByOwner(req.user.id);
    return res.status(201).json({
      salon: serializeSalon(salon),
      subscription: serializeSubscription(getSubscriptionForSalon(id)),
    });
  })
);

salonRouter.patch('/', (req, res) => {
  const salon = requireOwnSalon(req);
  const updates = collectSalonFields(req.body, { includeEmpty: false });
  const slugRaw = req.body?.slug;
  if (typeof slugRaw === 'string' && slugRaw.trim() && slugRaw.trim() !== salon.slug) {
    const slug = slugFromBody(slugRaw);
    if (slug !== salon.slug) {
      assertSlugAvailable(slug, salon.id);
      updates.slug = slug;
    }
  }
  if (req.body?.gallery !== undefined) {
    updates.gallery_json = serializeGallery(req.body.gallery);
  }
  if (req.body?.theme !== undefined) {
    updates.theme_json = JSON.stringify(sanitizeTheme(req.body.theme));
  }
  if (req.body?.timings !== undefined) {
    updates.timings_json = JSON.stringify(validateTimings(req.body.timings));
  }

  if (Object.keys(updates).length === 0) {
    return res.json({ salon: serializeSalon(salon) });
  }
  updates.updated_at = nowIso();
  const cols = Object.keys(updates);
  db.prepare(`UPDATE salons SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(
    ...cols.map((c) => updates[c]),
    salon.id
  );
  audit(req, 'salon.updated', 'salon', salon.id, { fields: cols.filter((c) => c !== 'updated_at') });
  const updated = findSalonByOwner(req.user.id);
  return res.json({
    salon: serializeSalon(updated),
    workflow: workflowInfo(updated, req.user).workflow,
  });
});

/* ------------------------------------------------------------------ */
/* Approval workflow                                                   */
/*                                                                     */
/* The ONLY state transition a salon owner may perform is               */
/* Draft → Pending Approval (POST /salon/submit).                       */
/*                                                                     */
/* Reviewing (approve / reject / request changes) and publishing live   */
/* (Approved → Published) are super-admin-only transitions exposed by   */
/* /api/admin/*. The former owner publish/unpublish endpoints were      */
/* removed because they let an owner make their own website live        */
/* without any platform review. Requests to them now fail closed with   */
/* 403 SELF_APPROVAL_FORBIDDEN instead of silently doing nothing.       */
/* ------------------------------------------------------------------ */

const ownerPublishBlocked = (req, res) =>
  res.status(403).json({
    error:
      'Publishing is a platform decision. Submit your website for review and a super admin will approve and publish it.',
    code: 'SELF_APPROVAL_FORBIDDEN',
  });

salonRouter.post('/publish', ownerPublishBlocked);
salonRouter.post('/unpublish', ownerPublishBlocked);

salonRouter.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const salon = requireOwnSalon(req);
    const { workflow } = workflowInfo(salon, req.user);
    if (workflow.blockers.length > 0) {
      const blocker = workflow.blockers[0];
      return res.status(400).json({ error: blocker.message, code: blocker.code, blockers: workflow.blockers });
    }
    const version = submitForApproval(salon, req.user.id);
    audit(req, 'salon.submitted_for_review', 'salon', salon.id, { version: version.version });
    const updated = findSalonByOwner(req.user.id);
    return res.status(201).json({
      salon: serializeSalon(updated),
      workflow: workflowInfo(updated, req.user).workflow,
      version: serializeVersion(version),
    });
  })
);

salonRouter.get('/versions', (req, res) => {
  const salon = requireOwnSalon(req);
  res.json({
    versions: listVersions(salon.id).map((row) => ({
      ...serializeVersion(row),
      pendingChanges: row.status === 'pending',
    })),
    workflow: workflowInfo(salon, req.user).workflow,
  });
});

salonRouter.get('/subscription', (req, res) => {
  const salon = requireOwnSalon(req);
  return res.json({ subscription: serializeSubscription(getSubscriptionForSalon(salon.id)) });
});

/* ------------------------------------------------------------------ */
/* Appointments (owner's own salon only)                               */
/* ------------------------------------------------------------------ */

salonRouter.use('/bookings', (req, res, next) => {
  // Resolve the salon from the session so nested booking routes stay tenant-scoped.
  try {
    req.salon = findSalonByOwner(req.user.id);
  } catch (err) {
    return next(err);
  }
  if (!req.salon) {
    return res.status(409).json({ error: 'Complete salon onboarding first.', code: 'ONBOARDING_REQUIRED' });
  }
  return next();
}, ownerBookingsRouter);

/* ------------------------------------------------------------------ */
/* Image uploads                                                       */
/* ------------------------------------------------------------------ */

const uploadLimiter = rateLimit({ windowMs: 60_000, max: 20, key: 'upload' });
const MIME_EXT = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

salonRouter.post(
  '/uploads',
  uploadLimiter,
  asyncHandler(async (req, res) => {
    req.salon = requireOwnSalon(req);
    const kind = String(req.query.kind || 'image');
    if (!['logo', 'cover', 'gallery', 'staff', 'service', 'payment_qr'].includes(kind)) {
      return res.status(400).json({ error: 'Unsupported upload type' });
    }
    const mime = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = MIME_EXT[mime];
    if (!ext) return res.status(415).json({ error: 'Only PNG, JPEG, WEBP or GIF images are allowed.' });
    if (kind === 'payment_qr' && !['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(mime)) {
      return res.status(415).json({ error: 'Payment QR codes must be PNG, JPEG or WEBP.' });
    }

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (buffer.length === 0) return res.status(400).json({ error: 'Empty upload' });
    if (kind === 'payment_qr' && buffer.length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: 'Payment QR codes must be 2 MB or smaller.' });
    }
    const validContent = kind === 'payment_qr' ? detectImage(buffer, mime) : looksLikeImage(buffer);
    if (!validContent) return res.status(415).json({ error: 'File content does not match a valid supported image.' });

    const fileName = `${kind === 'payment_qr' ? 'qr-' : ''}${req.user.id.slice(0, 8)}-${crypto.randomBytes(12).toString('hex')}${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, fileName), buffer);
    audit(req, 'salon.image_uploaded', 'salon', req.salon?.id || null, { kind, size: buffer.length });
    return res.status(201).json({ url: `/api/uploads/${fileName}` });
  })
);

function looksLikeImage(buf) {
  if (buf.length < 12) return false;
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return true;
  // GIF
  if (buf.slice(0, 3).toString('ascii') === 'GIF') return true;
  // WEBP: RIFF....WEBP
  if (buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return true;
  return false;
}

/* ------------------------------------------------------------------ */
/* Services                                                            */
/* ------------------------------------------------------------------ */

/**
 * Validate a category / subcategory pair from a service payload.
 *
 * Presets collapse to their canonical key (`Hair` → `hair`); any other label the
 * owner typed is kept verbatim so custom categories survive a round-trip. The
 * subcategory is optional but, when it names a platform preset, it is spelled
 * the official way so identical groups never split.
 */
function serviceCategoryFields(body, out, { partial }) {
  const hasCategory = body.category !== undefined || body.categoryLabel !== undefined;
  const hasSubcategory = body.subcategory !== undefined || body.subcategoryLabel !== undefined;

  if (!partial || hasCategory) {
    const raw = body.category ?? body.categoryLabel ?? DEFAULT_SERVICE_CATEGORY;
    const label = str(String(raw), { max: MAX_SERVICE_CATEGORY_LENGTH, field: 'Category' }) || DEFAULT_SERVICE_CATEGORY;
    out.category = normalizeServiceCategory(label);
    if (!out.category) throw new ValidationError('Category must contain letters or numbers');
  }
  if (!partial || hasSubcategory) {
    const raw = body.subcategory ?? body.subcategoryLabel ?? '';
    const label = str(String(raw), { max: MAX_SERVICE_SUBCATEGORY_LENGTH, field: 'Subcategory' });
    out.subcategory = normalizeServiceSubcategory(label);
  }
}

/** Cover image for a service: our uploads, static images, https URLs or nothing. */
function serviceImageField(body, out, { partial }) {
  if (partial && body.imageUrl === undefined) return;
  const value = str(body.imageUrl ?? '', { max: 2_000_000, field: 'Service image' });
  if (value && !isSafeImageUrl(value)) {
    throw new ValidationError('Service images must be an uploaded file, a data URL or an http(s) link');
  }
  out.image_url = value;
}

function servicePayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.name !== undefined) out.name = str(body.name, { min: 2, max: 120, field: 'Service name', required: true });
  serviceCategoryFields(body, out, { partial });
  serviceImageField(body, out, { partial });
  if (!partial || body.description !== undefined) {
    out.description = sanitizeText(str(body.description, { max: 2000, field: 'Description' }), 2000);
  }
  if (!partial || body.notes !== undefined) {
    out.notes = sanitizeText(
      str(body.notes, { max: MAX_SERVICE_NOTES_LENGTH, field: 'Important notes' }),
      MAX_SERVICE_NOTES_LENGTH
    );
  }
  if (!partial || body.pricePaise !== undefined || body.price !== undefined) {
    const raw = body.pricePaise ?? (body.price !== undefined ? Math.round(Number(body.price) * 100) : undefined);
    out.price_paise = int(raw, { min: 0, max: 100_000_000, field: 'Price' });
  }
  if (!partial || body.durationMinutes !== undefined) {
    out.duration_minutes = int(body.durationMinutes ?? 30, { min: 5, max: 1440, field: 'Duration' });
  }
  if (body.active !== undefined) out.active = bool(body.active, true) ? 1 : 0;
  if (body.sortOrder !== undefined) out.sort_order = int(body.sortOrder, { min: 0, max: 10_000, field: 'Sort order' });
  Object.assign(out, serviceAdvanceFields(body, { partial }));
  return out;
}

/**
 * Read the salon's catalogue with the vocabulary the dashboard needs to render
 * the category tree: presets, custom categories already in use and the bucket
 * counts per category/subcategory.
 *
 * `services` is omitted for mutations, which already return the changed row.
 */
function readCatalogue(salonId, { includeServices = true } = {}) {
  const services = getServicesForSalon(salonId).map(serializeService);
  const meta = { categories: serviceCategoryOptions(services), groups: groupServicesByCategory(services) };
  return includeServices ? { services, ...meta } : meta;
}

const catalogueMeta = (salonId) => readCatalogue(salonId, { includeServices: false });

salonRouter.get('/services', (req, res) => {
  const salon = requireOwnSalon(req);
  res.json(readCatalogue(salon.id));
});

/** Reusable category tree for pickers outside the catalogue page. */
salonRouter.get('/service-categories', (req, res) => {
  const salon = requireOwnSalon(req);
  res.json(catalogueMeta(salon.id));
});

salonRouter.post('/services', (req, res) => {
  const salon = requireOwnSalon(req);
  const data = servicePayload(req.body || {});
  const id = newId();
  const ts = nowIso();
  const count = getServicesForSalon(salon.id).length;
  db.prepare(
    `INSERT INTO services (id, salon_id, name, category, subcategory, description, notes, image_url,
       price_paise, duration_minutes, active, sort_order,
       advance_mode, advance_percent, advance_fixed_paise, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    salon.id,
    data.name,
    data.category,
    data.subcategory ?? '',
    data.description,
    data.notes ?? '',
    data.image_url ?? '',
    data.price_paise,
    data.duration_minutes,
    data.active ?? 1,
    data.sort_order ?? count,
    data.advance_mode ?? 'inherit',
    data.advance_percent ?? null,
    data.advance_fixed_paise ?? null,
    ts,
    ts
  );
  audit(req, 'service.created', 'service', id);
  const row = db.prepare('SELECT * FROM services WHERE id = ? AND salon_id = ?').get(id, salon.id);
  res.status(201).json({ service: serializeService(row), ...catalogueMeta(salon.id) });
});

salonRouter.patch('/services/:serviceId', (req, res) => {
  const salon = requireOwnSalon(req);
  const existing = db
    .prepare('SELECT * FROM services WHERE id = ? AND salon_id = ?')
    .get(req.params.serviceId, salon.id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });
  const data = servicePayload(req.body || {}, { partial: true });
  if (Object.keys(data).length === 0) return res.json({ service: serializeService(existing) });
  data.updated_at = nowIso();
  const cols = Object.keys(data);
  db.prepare(`UPDATE services SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND salon_id = ?`).run(
    ...cols.map((c) => data[c]),
    existing.id,
    salon.id
  );
  audit(req, 'service.updated', 'service', existing.id);
  const row = db.prepare('SELECT * FROM services WHERE id = ? AND salon_id = ?').get(existing.id, salon.id);
  // The refreshed vocabulary lets inline edits (rate, image, notes) update the
  // grouped catalogue without a second request.
  res.json({ service: serializeService(row), ...catalogueMeta(salon.id) });
});

salonRouter.delete('/services/:serviceId', (req, res) => {
  const salon = requireOwnSalon(req);
  const result = db
    .prepare('DELETE FROM services WHERE id = ? AND salon_id = ?')
    .run(req.params.serviceId, salon.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Service not found' });
  audit(req, 'service.deleted', 'service', req.params.serviceId);
  res.json({ ok: true, ...catalogueMeta(salon.id) });
});

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

function serializeStaffWorkPhotos(workPhotos) {
  if (!Array.isArray(workPhotos)) throw new ValidationError('Work photos must be a list of images');
  if (workPhotos.length > 20) throw new ValidationError('A staff member can have at most 20 work photos');
  return JSON.stringify(
    workPhotos
      .map((item) => {
        const url = typeof item === 'string' ? item : item?.url;
        const caption = typeof item === 'object' && item ? sanitizeText(item.caption || item.title || '', 200) : '';
        const v = str(url, { max: 2_000_000, field: 'Work photo' });
        if (v && !isSafeImageUrl(v)) {
          throw new ValidationError('Work photos must be valid http(s) URLs or uploaded images');
        }
        return v ? { url: v, caption } : null;
      })
      .filter(Boolean)
  );
}

/**
 * Resolve the salon ids a staff member is assigned to deliver.
 * Every id must belong to this salon, so a cross-tenant id is rejected before
 * it can ever reach the booking flow.
 */
function resolveStaffServiceIds(salonId, rawList) {
  if (!Array.isArray(rawList)) throw new ValidationError('Assigned services must be a list of service ids');
  const ids = normalizeServiceIdList(rawList);
  if (ids.length > 200) throw new ValidationError('A staff member can be assigned at most 200 services');
  if (ids.length === 0) return [];
  const ownServices = new Set(getServicesForSalon(salonId).map((row) => row.id));
  const unknown = ids.filter((id) => !ownServices.has(id));
  if (unknown.length > 0) {
    throw new ValidationError('Assigned services must belong to your salon catalogue');
  }
  return ids;
}

/**
 * Build the `staff` column payload for POST/PATCH.
 *
 * New onboarding fields:
 *  - primaryRole        → professional title slug (see STAFF_PRIMARY_ROLES)
 *  - appAccessRole      → system permission level (see STAFF_APP_ACCESS_ROLES)
 *  - commissionPercent  → 0–100, defaults to 15
 *  - mobileNumber       → normalized "+91XXXXXXXXXX"
 *  - hideMobileNumber   → keeps the number out of public/staff lists
 *  - serviceIds         → salon-owned service mapping
 *  - weeklySchedule     → Monday→Sunday start/end times + closed flag
 */
function staffPayload(body, { partial = false, salonId = null } = {}) {
  if (body?.isDemo === true || (typeof body?.id === 'string' && /^demo[-_:]/i.test(body.id.trim()))) {
    throw new ValidationError('Demo staff profiles are for preview only and cannot be saved as salon employees.');
  }
  const out = {};
  if (!partial || body.name !== undefined) out.name = str(body.name, { min: 1, max: 120, field: 'Staff name', required: true });

  /* ---- Primary role + free-text title ---- */
  if (body.primaryRole !== undefined) {
    if (body.primaryRole === '' || body.primaryRole === null) {
      out.primary_role = '';
    } else if (!isStaffPrimaryRole(body.primaryRole)) {
      throw new ValidationError(
        `Primary role must be one of: ${STAFF_PRIMARY_ROLE_VALUES.join(', ')}`
      );
    } else {
      out.primary_role = body.primaryRole;
    }
  } else if (!partial) {
    out.primary_role = '';
  }

  const rawRoleTitle = body.roleTitle ?? body.designation;
  if (!partial || rawRoleTitle !== undefined) {
    // When only a slug is supplied, store the canonical label as the title so
    // public templates always render "Senior Stylist", never "senior_stylist".
    const supplied = str(rawRoleTitle, { max: 120, field: 'Designation' });
    const fallbackLabel = getPrimaryRoleLabel(out.primary_role);
    out.role_title = supplied || fallbackLabel;
  } else if (out.primary_role) {
    out.role_title = getPrimaryRoleLabel(out.primary_role);
  }

  /* ---- App access role ---- */
  if (body.appAccessRole !== undefined) {
    if (!isStaffAppAccessRole(body.appAccessRole)) {
      throw new ValidationError(
        `App access role must be one of: ${STAFF_APP_ACCESS_ROLE_VALUES.join(', ')}`
      );
    }
    out.app_access_role = body.appAccessRole;
  } else if (!partial) {
    out.app_access_role = suggestedAppAccessRole(out.primary_role);
  }

  /* ---- Commission ---- */
  if (body.commissionPercent !== undefined || body.commission !== undefined) {
    const commission = normalizeCommissionPercent(body.commissionPercent ?? body.commission);
    if (!commission.ok) throw new ValidationError(commission.error);
    out.commission_percent = commission.value;
  } else if (!partial) {
    out.commission_percent = DEFAULT_COMMISSION_PERCENT;
  }

  /* ---- Mobile number + privacy flag ---- */
  if (body.mobileNumber !== undefined || body.mobile !== undefined || body.phone !== undefined) {
    const mobile = normalizeIndianMobile(body.mobileNumber ?? body.mobile ?? body.phone);
    if (!mobile.ok) throw new ValidationError(mobile.error);
    out.mobile_number = mobile.value;
  } else if (!partial) {
    out.mobile_number = '';
  }
  if (body.hideMobileNumber !== undefined || body.hideMobile !== undefined) {
    out.hide_mobile_number = bool(body.hideMobileNumber ?? body.hideMobile, false) ? 1 : 0;
  } else if (!partial) {
    out.hide_mobile_number = 0;
  }

  /* ---- Service assignment ---- */
  if (body.serviceIds !== undefined || body.assignedServiceIds !== undefined || body.services !== undefined) {
    if (!salonId) throw new ValidationError('Assigned services require a salon context');
    out.service_ids_json = JSON.stringify(
      resolveStaffServiceIds(salonId, body.serviceIds ?? body.assignedServiceIds ?? body.services)
    );
  } else if (!partial) {
    out.service_ids_json = '[]';
  }

  /* ---- Weekly schedule ---- */
  if (body.weeklySchedule !== undefined || body.schedule !== undefined) {
    const { schedule, errors } = normalizeWeeklySchedule(body.weeklySchedule ?? body.schedule);
    if (errors.length > 0) throw new ValidationError(errors[0]);
    out.weekly_schedule_json = JSON.stringify(schedule);
  } else if (!partial) {
    out.weekly_schedule_json = JSON.stringify(defaultWeeklySchedule());
  }

  if (!partial || body.bio !== undefined) out.bio = sanitizeText(str(body.bio, { max: 2000, field: 'Bio' }), 2000);
  if (!partial || body.photoUrl !== undefined) out.photo_url = imageField('Photo')(body.photoUrl);
  if (!partial || body.specialties !== undefined) {
    const raw = body.specialties;
    const rawList = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(',') : [];
    if (rawList.length > MAX_STAFF_SKILLS) {
      throw new ValidationError(`A staff member can have at most ${MAX_STAFF_SKILLS} skills`);
    }
    const list = normalizeSkillList(rawList);
    for (const skill of list) {
      if (skill.length > MAX_STAFF_SKILL_LENGTH) {
        throw new ValidationError(`Each skill must be at most ${MAX_STAFF_SKILL_LENGTH} characters`);
      }
    }
    out.specialties_json = JSON.stringify(list);
  }
  const rawQualifications = body.qualifications !== undefined ? body.qualifications : body.certifications;
  if (!partial || rawQualifications !== undefined) {
    const list = Array.isArray(rawQualifications) ? rawQualifications : [];
    if (list.length > 20) throw new ValidationError('A staff member can have at most 20 qualifications');
    out.qualifications_json = JSON.stringify(
      list.map((q) => str(q, { max: 160, field: 'Qualification' })).filter(Boolean)
    );
  }
  if (!partial || body.workPhotos !== undefined) {
    out.work_photos_json = serializeStaffWorkPhotos(body.workPhotos || []);
  }
  if (!partial || body.workPhotosConsent !== undefined) {
    out.work_photos_consent = bool(body.workPhotosConsent, false) ? 1 : 0;
  }
  if (!partial || body.rating !== undefined) {
    if (body.rating === null || body.rating === '' || body.rating === undefined) out.rating = null;
    else {
      const rating = Number(body.rating);
      if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
        throw new ValidationError('Rating must be between 0 and 5');
      }
      out.rating = rating > 0 ? Math.round(rating * 10) / 10 : null;
    }
  }
  if (!partial || body.reviewCount !== undefined) {
    out.review_count =
      body.reviewCount === null || body.reviewCount === '' || body.reviewCount === undefined
        ? 0
        : int(body.reviewCount, { min: 0, max: 1_000_000, field: 'Review count' });
  }
  if (!partial || body.experience !== undefined) {
    out.experience = str(body.experience, { max: 80, field: 'Experience' });
  }
  if (body.active !== undefined) out.active = bool(body.active, true) ? 1 : 0;
  // "Accepts online booking" — when off the specialist is still shown on the
  // website but is not offered in the booking picker.
  if (body.bookingEnabled !== undefined) out.booking_enabled = bool(body.bookingEnabled, true) ? 1 : 0;
  // Availability status — only 'available' staff are offered for online booking.
  if (body.availabilityStatus !== undefined) {
    if (!isStaffAvailabilityStatus(body.availabilityStatus)) {
      throw new ValidationError(
        `Availability must be one of: ${STAFF_AVAILABILITY_STATUSES.join(', ')}`
      );
    }
    out.availability_status = body.availabilityStatus;
  }
  if (body.sortOrder !== undefined) out.sort_order = int(body.sortOrder, { min: 0, max: 10_000, field: 'Sort order' });
  return out;
}

salonRouter.get('/staff', (req, res) => {
  const salon = requireOwnSalon(req);
  res.json({ staff: getStaffForSalon(salon.id).map(serializeStaff) });
});

salonRouter.post('/staff', (req, res) => {
  const salon = requireOwnSalon(req);
  if (
    req.body?.isDemo === true ||
    (typeof req.body?.id === 'string' && /^demo[-_:]/i.test(req.body.id.trim()))
  ) {
    return res.status(400).json({
      error: 'Demo staff profiles are for preview only and cannot be saved as salon employees.',
      code: 'DEMO_STAFF_NOT_SAVEABLE',
    });
  }
  const data = staffPayload(req.body || {}, { salonId: salon.id });
  const id = newId();
  const ts = nowIso();
  const fullPayload = {
    role_title: '',
    bio: '',
    photo_url: '',
    specialties_json: '[]',
    qualifications_json: '[]',
    work_photos_json: '[]',
    work_photos_consent: 0,
    rating: null,
    review_count: 0,
    experience: '',
    active: 1,
    booking_enabled: 1,
    availability_status: 'available',
    primary_role: '',
    app_access_role: DEFAULT_STAFF_APP_ACCESS_ROLE,
    commission_percent: DEFAULT_COMMISSION_PERCENT,
    mobile_number: '',
    hide_mobile_number: 0,
    service_ids_json: '[]',
    weekly_schedule_json: JSON.stringify(defaultWeeklySchedule()),
    sort_order: getStaffForSalon(salon.id).length,
    ...data,
  };
  const columns = Object.keys(fullPayload);
  db.prepare(
    `INSERT INTO staff (id, salon_id, ${columns.join(', ')}, created_at, updated_at)
     VALUES (?, ?, ${columns.map(() => '?').join(', ')}, ?, ?)`
  ).run(id, salon.id, ...columns.map((column) => fullPayload[column]), ts, ts);
  audit(req, 'staff.created', 'staff', id);
  const row = db.prepare('SELECT * FROM staff WHERE id = ? AND salon_id = ?').get(id, salon.id);
  res.status(201).json({ staff: serializeStaff(row) });
});

salonRouter.patch('/staff/:staffId', (req, res) => {
  const salon = requireOwnSalon(req);
  const existing = db
    .prepare('SELECT * FROM staff WHERE id = ? AND salon_id = ?')
    .get(req.params.staffId, salon.id);
  if (!existing) return res.status(404).json({ error: 'Staff member not found' });
  const data = staffPayload(req.body || {}, { partial: true, salonId: salon.id });
  if (Object.keys(data).length === 0) return res.json({ staff: serializeStaff(existing) });
  data.updated_at = nowIso();
  const cols = Object.keys(data);
  db.prepare(`UPDATE staff SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ? AND salon_id = ?`).run(
    ...cols.map((c) => data[c]),
    existing.id,
    salon.id
  );
  audit(req, 'staff.updated', 'staff', existing.id);
  const row = db.prepare('SELECT * FROM staff WHERE id = ? AND salon_id = ?').get(existing.id, salon.id);
  res.json({ staff: serializeStaff(row) });
});

salonRouter.delete('/staff/:staffId', (req, res) => {
  const salon = requireOwnSalon(req);
  const result = db.prepare('DELETE FROM staff WHERE id = ? AND salon_id = ?').run(req.params.staffId, salon.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Staff member not found' });
  audit(req, 'staff.deleted', 'staff', req.params.staffId);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function slugFromBody(input) {
  return normalizeSlug(input);
}

function assertSlugAvailable(slug, exceptSalonId = null) {
  const existing = findSalonBySlug(slug);
  if (existing && existing.id !== exceptSalonId) {
    throw new HttpError(409, 'That live website address is already taken. Please choose another one.');
  }
}

function collectSalonFields(body, _options = {}) {
  const fields = {};
  for (const [key, def] of Object.entries(SALON_FIELD_MAP)) {
    if (body[key] === undefined) continue;
    // Empty values are persisted so owners can deliberately clear optional fields
    // (e.g. remove a logo or tagline). Required fields are enforced by the validator.
    fields[def.column] = def.validate(body[key]);
  }
  return fields;
}

function serializeGallery(gallery) {
  if (!Array.isArray(gallery)) throw new ValidationError('Gallery must be a list of images');
  if (gallery.length > 60) throw new ValidationError('Gallery can hold at most 60 images');
  return JSON.stringify(
    gallery
      .map((item) => {
        const url = typeof item === 'string' ? item : item?.url;
        const caption = typeof item === 'object' && item ? sanitizeText(item.caption || '', 160) : '';
        const v = str(url, { max: 2_000_000, field: 'Gallery image' });
        if (v && !isSafeImageUrl(v)) throw new ValidationError('Gallery images must be valid http(s) URLs or uploads');
        return v ? { url: v, caption } : null;
      })
      .filter(Boolean)
  );
}

function sanitizeTheme(theme) {
  if (!theme || typeof theme !== 'object' || Array.isArray(theme)) return {};
  const out = {};
  const colorKeys = ['accent', 'primary', 'background', 'surface'];
  for (const key of colorKeys) {
    const value = theme[key];
    if (typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value.trim())) out[key] = value.trim();
  }
  return out;
}
