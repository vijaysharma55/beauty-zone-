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

export const salonRouter = Router();

/* Every route in this router is salon-owner only. Ownership is resolved from the
   session, so there is no client-supplied salon id anywhere in this file. */
salonRouter.use(requireAuth, requireRole('salon_owner'));

function requireOwnSalon(req) {
  const salon = findSalonByOwner(req.user.id);
  if (!salon) throw new HttpError(409, 'Complete salon onboarding first.');
  return salon;
}

const SERVICE_CATEGORIES = new Set(['bridal', 'hair', 'skin', 'nails', 'spa', 'academy', 'makeup', 'other']);

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
};

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
  return res.json({ salon: serializeSalon(findSalonByOwner(req.user.id)) });
});

salonRouter.post(
  '/publish',
  asyncHandler(async (req, res) => {
    const salon = requireOwnSalon(req);
    const servicesCount = getServicesForSalon(salon.id, { onlyActive: true }).length;
    const missing = [];
    if (!salon.name) missing.push('salon name');
    if (!salon.city) missing.push('city');
    if (!salon.address_line) missing.push('address');
    if (!salon.phone) missing.push('phone');
    if (servicesCount === 0) missing.push('at least one active service');
    if (missing.length > 0) {
      return res.status(400).json({
        error: `Before publishing, please add: ${missing.join(', ')}.`,
        missing,
      });
    }
    const ts = nowIso();
    db.prepare(
      'UPDATE salons SET website_published = 1, published_at = COALESCE(published_at, ?), updated_at = ? WHERE id = ?'
    ).run(ts, ts, salon.id);
    audit(req, 'salon.published', 'salon', salon.id);
    return res.json({ salon: serializeSalon(findSalonByOwner(req.user.id)), url: `/salon/${salon.slug}` });
  })
);

salonRouter.post('/unpublish', (req, res) => {
  const salon = requireOwnSalon(req);
  db.prepare('UPDATE salons SET website_published = 0, updated_at = ? WHERE id = ?').run(nowIso(), salon.id);
  audit(req, 'salon.unpublished', 'salon', salon.id);
  return res.json({ salon: serializeSalon(findSalonByOwner(req.user.id)) });
});

salonRouter.get('/subscription', (req, res) => {
  const salon = requireOwnSalon(req);
  return res.json({ subscription: serializeSubscription(getSubscriptionForSalon(salon.id)) });
});

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
    if (!['logo', 'cover', 'gallery', 'staff'].includes(kind)) {
      return res.status(400).json({ error: 'Unsupported upload type' });
    }
    const mime = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const ext = MIME_EXT[mime];
    if (!ext) return res.status(415).json({ error: 'Only PNG, JPEG, WEBP or GIF images are allowed.' });

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    if (buffer.length === 0) return res.status(400).json({ error: 'Empty upload' });
    if (!looksLikeImage(buffer)) return res.status(415).json({ error: 'File content is not a valid image.' });

    const fileName = `${req.user.id.slice(0, 8)}-${crypto.randomBytes(12).toString('hex')}${ext}`;
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

function servicePayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.name !== undefined) out.name = str(body.name, { min: 2, max: 120, field: 'Service name', required: true });
  if (!partial || body.category !== undefined) {
    const category = str(body.category || 'other', { max: 30, field: 'Category' }).toLowerCase();
    if (!SERVICE_CATEGORIES.has(category)) throw new ValidationError('Invalid service category');
    out.category = category;
  }
  if (!partial || body.description !== undefined) {
    out.description = sanitizeText(str(body.description, { max: 2000, field: 'Description' }), 2000);
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
  return out;
}

salonRouter.get('/services', (req, res) => {
  const salon = requireOwnSalon(req);
  res.json({ services: getServicesForSalon(salon.id).map(serializeService) });
});

salonRouter.post('/services', (req, res) => {
  const salon = requireOwnSalon(req);
  const data = servicePayload(req.body || {});
  const id = newId();
  const ts = nowIso();
  const count = getServicesForSalon(salon.id).length;
  db.prepare(
    `INSERT INTO services (id, salon_id, name, category, description, price_paise, duration_minutes, active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    salon.id,
    data.name,
    data.category,
    data.description,
    data.price_paise,
    data.duration_minutes,
    data.active ?? 1,
    data.sort_order ?? count,
    ts,
    ts
  );
  audit(req, 'service.created', 'service', id);
  const row = db.prepare('SELECT * FROM services WHERE id = ? AND salon_id = ?').get(id, salon.id);
  res.status(201).json({ service: serializeService(row) });
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
  res.json({ service: serializeService(row) });
});

salonRouter.delete('/services/:serviceId', (req, res) => {
  const salon = requireOwnSalon(req);
  const result = db
    .prepare('DELETE FROM services WHERE id = ? AND salon_id = ?')
    .run(req.params.serviceId, salon.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Service not found' });
  audit(req, 'service.deleted', 'service', req.params.serviceId);
  res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

function staffPayload(body, { partial = false } = {}) {
  const out = {};
  if (!partial || body.name !== undefined) out.name = str(body.name, { min: 1, max: 120, field: 'Staff name', required: true });
  if (!partial || body.roleTitle !== undefined) out.role_title = str(body.roleTitle, { max: 120, field: 'Role' });
  if (!partial || body.bio !== undefined) out.bio = sanitizeText(str(body.bio, { max: 1500, field: 'Bio' }), 1500);
  if (!partial || body.photoUrl !== undefined) out.photo_url = imageField('Photo')(body.photoUrl);
  if (!partial || body.specialties !== undefined) {
    const list = Array.isArray(body.specialties) ? body.specialties : [];
    if (list.length > 20) throw new ValidationError('A staff member can have at most 20 specialties');
    out.specialties_json = JSON.stringify(
      list.map((s) => str(s, { max: 60, field: 'Specialty' })).filter(Boolean)
    );
  }
  if (body.active !== undefined) out.active = bool(body.active, true) ? 1 : 0;
  if (body.sortOrder !== undefined) out.sort_order = int(body.sortOrder, { min: 0, max: 10_000, field: 'Sort order' });
  return out;
}

salonRouter.get('/staff', (req, res) => {
  const salon = requireOwnSalon(req);
  res.json({ staff: getStaffForSalon(salon.id).map(serializeStaff) });
});

salonRouter.post('/staff', (req, res) => {
  const salon = requireOwnSalon(req);
  const data = staffPayload(req.body || {});
  const id = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO staff (id, salon_id, name, role_title, bio, photo_url, specialties_json, active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    salon.id,
    data.name,
    data.role_title,
    data.bio,
    data.photo_url,
    data.specialties_json,
    data.active ?? 1,
    data.sort_order ?? getStaffForSalon(salon.id).length,
    ts,
    ts
  );
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
  const data = staffPayload(req.body || {}, { partial: true });
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
