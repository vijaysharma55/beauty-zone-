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
import {
  SupabaseApiError,
  getSupabaseContext,
  getSalonForOwner,
  getStaff,
  markStaffBackfillComplete,
  insertStaff,
  updateStaff,
  deleteStaff,
} from '../supabase-store.js';
import { ownerBookingsRouter } from './bookings.js';
import { salonPaymentsRouter } from './salon-payments.js';
import { serviceAdvanceFields } from '../payments/salon-settings.js';
import { detectImage } from '../payments/proofs.js';
import { createOnboardingMirror } from '../onboarding-mirror.js';
import {
  completeSupabaseOnboarding,
  onboardingSlugAvailability,
  onboardingSupabaseContext,
  readOnboardingDraft,
  resolveOnboardingDraft,
  saveOnboardingDraft,
} from '../onboarding.js';
import { onboardingValuesSchema } from '../../src/lib/onboardingSchema.js';
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
salonRouter.use((req, res, next) => {
  if (req.onboardingRestoreError && !req.path.startsWith('/onboarding')) {
    return res.status(503).json({ error: 'Could not restore your salon data. Please retry.', code: 'ONBOARDING_RESTORE_FAILED' });
  }
  return next();
});

/* Booking & advance payment settings, payment methods, transactions,
   verification queue, receipts and WhatsApp retries. */
salonRouter.use(salonPaymentsRouter);

function requireOwnSalon(req) {
  const salon = findSalonByOwner(req.user.id);
  if (!salon) throw new HttpError(409, 'Complete salon onboarding first.');
  return salon;
}

/**
 * Staff is stored only in Supabase. The owner identity and salon foreign key
 * are resolved from the verified bearer token; neither is accepted from JSON.
 * The local salon mirror is checked only because service assignment validation
 * and the rest of the still-legacy dashboard currently use that same id.
 */
async function requireSupabaseStaffSalon(req) {
  const context = await getSupabaseContext(req);
  if (context.role !== 'salon_owner') {
    throw new HttpError(403, 'Only the authenticated salon owner can manage this staff roster.', 'STAFF_OWNER_REQUIRED');
  }
  if (req.user?.supabase_uid && req.user.supabase_uid !== context.id) {
    throw new HttpError(403, 'Your signed-in identity does not match this salon session.', 'STAFF_IDENTITY_MISMATCH');
  }
  const salon = await getSalonForOwner(context);
  if (!salon?.id) throw new HttpError(409, 'Complete salon onboarding before managing staff.', 'ONBOARDING_REQUIRED');
  const localSalon = findSalonByOwner(req.user.id);
  if (!localSalon || localSalon.id !== salon.id) {
    throw new HttpError(409, 'Your salon workspace is still syncing. Refresh your session and try again.', 'SALON_MIRROR_MISMATCH');
  }
  return { context, salon };
}

const LEGACY_STAFF_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function legacyStaffUuid(salonId, legacyId) {
  const value = String(legacyId || '');
  if (LEGACY_STAFF_UUID_RE.test(value)) return value.toLowerCase();
  const bytes = crypto.createHash('sha256').update(`beautyzone-staff:${salonId}:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Import legacy SQLite staff once per salon. The completion marker lives in
 * Supabase, so deleted Postgres rows are never resurrected from stale SQLite.
 */
async function getStaffWithLegacyBackfill(context, salon) {
  let staff = await getStaff(context, salon.id);
  if (salon.staff_migrated_at) return staff;

  const legacyRows = getStaffForSalon(salon.id);
  const existingIds = new Set(staff.map((member) => member.id));

  for (const legacyRow of legacyRows) {
    const member = serializeStaff(legacyRow);
    const id = legacyStaffUuid(salon.id, legacyRow.id);
    if (existingIds.has(id)) continue;

    const normalizedMobile = normalizeIndianMobile(member.mobileNumber || '');
    const normalizedSchedule = normalizeWeeklySchedule(member.weeklySchedule).schedule;
    const payload = {
      id,
      name: member.name,
      role_title: member.roleTitle || '',
      primary_role: member.primaryRole || '',
      app_access_role: isStaffAppAccessRole(member.appAccessRole) ? member.appAccessRole : DEFAULT_STAFF_APP_ACCESS_ROLE,
      commission_percent: member.commissionPercent ?? DEFAULT_COMMISSION_PERCENT,
      mobile_number: normalizedMobile.ok ? normalizedMobile.value : '',
      hide_mobile_number: Boolean(member.hideMobileNumber),
      bio: member.bio || '',
      photo_url: member.photoUrl || '',
      specialties: Array.isArray(member.specialties) ? member.specialties : [],
      qualifications: Array.isArray(member.qualifications) ? member.qualifications : [],
      work_photos: Array.isArray(member.workPhotos) ? member.workPhotos : [],
      work_photos_consent: Boolean(member.workPhotosConsent),
      rating: member.rating ?? null,
      review_count: Number(member.reviewCount || 0),
      experience: member.experience || '',
      active: Boolean(member.active),
      booking_enabled: member.bookingEnabled !== false,
      availability_status: isStaffAvailabilityStatus(member.availabilityStatus) ? member.availabilityStatus : 'available',
      service_ids: Array.isArray(member.serviceIds) ? member.serviceIds : [],
      weekly_schedule: normalizedSchedule.every((entry) => entry.closed)
        ? defaultWeeklySchedule()
        : normalizedSchedule,
      sort_order: Number(member.sortOrder || 0),
    };

    try {
      await insertStaff(context, salon.id, payload);
      existingIds.add(id);
    } catch (error) {
      // Two first dashboard requests may race on the deterministic staff UUID.
      if (String(error?.code || '') !== '23505') throw error;
      existingIds.add(id);
    }
  }

  await markStaffBackfillComplete(context, salon.id);
  return getStaff(context, salon.id);
}

/**
 * Workflow routes retain support for legacy cookie-only accounts that have
 * not linked a Supabase identity. Such users have no Supabase staff records
 * available; staff CRUD itself remains bearer-session-only and fails closed.
 */
async function getWorkflowStaffRows(req, localSalon) {
  const context = await getSupabaseContext(req, { required: false });
  if (!context) {
    if (req.user?.supabase_uid) {
      throw new HttpError(401, 'Your Supabase session expired. Sign in again and retry.', 'STAFF_SESSION_EXPIRED');
    }
    return [];
  }
  if (context.role !== 'salon_owner' || (req.user?.supabase_uid && req.user.supabase_uid !== context.id)) {
    throw new HttpError(403, 'Your signed-in identity does not match this salon owner.', 'STAFF_IDENTITY_MISMATCH');
  }
  const remoteSalon = await getSalonForOwner(context);
  if (!remoteSalon?.id || remoteSalon.id !== localSalon.id) {
    throw new HttpError(409, 'Your salon identity is not synchronized with Supabase. Please refresh your session.', 'SALON_ID_MISMATCH');
  }
  return getStaffWithLegacyBackfill(context, remoteSalon);
}

const STAFF_SQLITE_TO_POSTGRES = Object.freeze({
  role_title: 'role_title',
  primary_role: 'primary_role',
  app_access_role: 'app_access_role',
  commission_percent: 'commission_percent',
  mobile_number: 'mobile_number',
  hide_mobile_number: 'hide_mobile_number',
  bio: 'bio',
  photo_url: 'photo_url',
  specialties_json: 'specialties',
  qualifications_json: 'qualifications',
  work_photos_json: 'work_photos',
  work_photos_consent: 'work_photos_consent',
  rating: 'rating',
  review_count: 'review_count',
  experience: 'experience',
  active: 'active',
  booking_enabled: 'booking_enabled',
  availability_status: 'availability_status',
  service_ids_json: 'service_ids',
  weekly_schedule_json: 'weekly_schedule',
  sort_order: 'sort_order',
  updated_at: 'updated_at',
});

const STAFF_JSON_FIELDS = new Set([
  'specialties_json', 'qualifications_json', 'work_photos_json',
  'service_ids_json', 'weekly_schedule_json',
]);
const STAFF_BOOLEAN_FIELDS = new Set([
  'hide_mobile_number', 'work_photos_consent', 'active', 'booking_enabled',
]);

function staffPayloadForPostgres(values) {
  const payload = { name: values.name };
  for (const [source, target] of Object.entries(STAFF_SQLITE_TO_POSTGRES)) {
    if (values[source] === undefined) continue;
    let value = values[source];
    if (STAFF_JSON_FIELDS.has(source)) {
      try { value = JSON.parse(value); }
      catch { throw new ValidationError('Staff profile contains invalid list or schedule data.'); }
    } else if (STAFF_BOOLEAN_FIELDS.has(source)) {
      value = Boolean(value);
    }
    payload[target] = value;
  }
  return payload;
}

function translateStaffStoreError(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '');
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return new HttpError(403, 'Supabase denied this staff operation. Confirm the staff owner RLS policy is applied and your salon is linked to your signed-in account.', 'STAFF_PERMISSION_DENIED');
  }
  if (code === '23503' || /foreign key/i.test(message)) {
    return new HttpError(409, 'The linked salon record could not be found. Refresh salon onboarding before saving staff.', 'STAFF_SALON_LINK_INVALID');
  }
  if (code === '23514') {
    return new HttpError(400, 'One or more staff fields do not match the database rules. Check the role, status, commission and schedule values.', 'STAFF_CONSTRAINT_FAILED');
  }
  if (code === '22P02') {
    return new HttpError(400, 'A staff field has an invalid data type or identifier.', 'STAFF_INVALID_VALUE');
  }
  if (error instanceof SupabaseApiError && error.status === 401) {
    return new HttpError(401, 'Your Supabase session expired. Sign in again and retry.', 'STAFF_SESSION_EXPIRED');
  }
  return error;
}

async function withStaffStoreErrors(operation) {
  try { return await operation(); }
  catch (error) { throw translateStaffStoreError(error); }
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

salonRouter.get('/', asyncHandler(async (req, res) => {
  const salon = findSalonByOwner(req.user.id);
  const staffRows = salon
    ? await withStaffStoreErrors(() => getWorkflowStaffRows(req, salon))
    : [];
  return res.json({
    salon: salon ? serializeSalon(salon) : null,
    workflow: salon ? workflowInfo(salon, req.user, staffRows).workflow : null,
    versions: salon ? listVersions(salon.id).map(serializeVersion) : [],
    subscription: salon ? serializeSubscription(getSubscriptionForSalon(salon.id)) : null,
  });
}));

// In-progress data is stored separately from salons: a partial draft must not
// unlock dashboard routes or create a public-facing salon.
salonRouter.get('/onboarding/draft', asyncHandler(async (req, res) => {
  const draft = await readOnboardingDraft(req);
  return res.json({ draft });
}));

salonRouter.put('/onboarding/draft', asyncHandler(async (req, res) => {
  const draft = await saveOnboardingDraft(req, req.body);
  return res.json({ draft });
}));

salonRouter.post('/onboarding/draft/resolve', asyncHandler(async (req, res) => {
  const draft = await resolveOnboardingDraft(req, req.body);
  return res.json({ draft });
}));

const onboardingSlugLimiter = rateLimit({ windowMs: 60_000, max: 90, key: 'onboarding-slug' });
salonRouter.get('/onboarding/slug-available', onboardingSlugLimiter, asyncHandler(async (req, res) => {
  return res.json(await onboardingSlugAvailability(req, req.query.slug));
}));

salonRouter.post('/onboarding/complete', asyncHandler(async (req, res) => {
  const expectedRevision = req.body?.expectedRevision;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    throw new HttpError(400, 'Save your onboarding draft before completing setup.', 'ONBOARDING_INVALID_DRAFT');
  }
  const context = onboardingSupabaseContext(req);
  const existing = findSalonByOwner(req.user.id);
  if (existing) {
    return res.json({ salon: serializeSalon(existing), subscription: serializeSubscription(getSubscriptionForSalon(existing.id)) });
  }
  const stored = await readOnboardingDraft(req, context);
  if (!stored) throw new HttpError(400, 'Save your onboarding draft before completing setup.');
  if (!stored.completed && stored.revision !== expectedRevision) {
    throw new HttpError(409, 'Your saved draft changed in another session.', 'ONBOARDING_CONFLICT');
  }
  if (stored.draft.currentStep !== 4 || !onboardingValuesSchema.safeParse(stored.draft.values).success) {
    throw new HttpError(400, 'Complete all required fields and steps before creating your salon.', 'ONBOARDING_INCOMPLETE');
  }
  if (!stored.completed) {
    const availability = await onboardingSlugAvailability(req, stored.draft.values.slug, context);
    if (!availability.available) throw new HttpError(409, availability.reason, 'ONBOARDING_SLUG_TAKEN');
  }

  let salon;
  if (context) {
    // The RPC creates the Supabase salon, subscription and completed marker in
    // one transaction; a retry after a lost response returns those same rows.
    const result = await completeSupabaseOnboarding(context, expectedRevision);
    if (!result?.salon?.id) throw new HttpError(503, 'Your salon could not be restored. Please try again.');
    salon = createOnboardingMirror(req, stored.draft.values, {
      remoteSalon: result.salon, remoteSubscription: result.subscription,
    });
  } else {
    salon = createOnboardingMirror(req, stored.draft.values, { localRevision: stored.revision });
  }
  return res.status(201).json({
    salon: serializeSalon(salon), subscription: serializeSubscription(getSubscriptionForSalon(salon.id)),
  });
}));

// Kept for local legacy integrations. Supabase owners must go through the
// validated, revisioned /onboarding/complete endpoint above.
salonRouter.post(
  '/onboarding',
  onboardingSlugLimiter,
  asyncHandler(async (req, res) => {
    if (req.supabaseIdentity || req.user.supabase_uid) {
      throw new HttpError(409, 'Complete the saved salon setup first.', 'ONBOARDING_REQUIRED');
    }
    if (findSalonByOwner(req.user.id)) {
      throw new HttpError(409, 'You have already completed salon onboarding.');
    }
    const settings = getSettings();
    const name = str(req.body?.name, { min: 2, max: 120, field: 'Salon name', required: true });
    const slug = slugFromBody(req.body?.slug || req.body?.name);
    assertSlugAvailable(slug);
    // The legacy single-submit route must not bypass the cross-store check.
    const availability = await onboardingSlugAvailability(req, slug, null);
    if (!availability.available) throw new HttpError(409, availability.reason, 'ONBOARDING_SLUG_TAKEN');

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

salonRouter.patch('/', asyncHandler(async (req, res) => {
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
  const staffRows = await withStaffStoreErrors(() => getWorkflowStaffRows(req, updated));
  return res.json({
    salon: serializeSalon(updated),
    workflow: workflowInfo(updated, req.user, staffRows).workflow,
  });
}));

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
    const staffRows = await withStaffStoreErrors(() => getWorkflowStaffRows(req, salon));
    const { workflow } = workflowInfo(salon, req.user, staffRows);
    if (workflow.blockers.length > 0) {
      const blocker = workflow.blockers[0];
      return res.status(400).json({ error: blocker.message, code: blocker.code, blockers: workflow.blockers });
    }
    const version = submitForApproval(salon, req.user.id, staffRows);
    audit(req, 'salon.submitted_for_review', 'salon', salon.id, { version: version.version });
    const updated = findSalonByOwner(req.user.id);
    return res.status(201).json({
      salon: serializeSalon(updated),
      workflow: workflowInfo(updated, req.user, staffRows).workflow,
      version: serializeVersion(version),
    });
  })
);

salonRouter.get('/versions', asyncHandler(async (req, res) => {
  const salon = requireOwnSalon(req);
  const staffRows = await withStaffStoreErrors(() => getWorkflowStaffRows(req, salon));
  return res.json({
    versions: listVersions(salon.id).map((row) => ({
      ...serializeVersion(row),
      pendingChanges: row.status === 'pending',
    })),
    workflow: workflowInfo(salon, req.user, staffRows).workflow,
  });
}));

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
    const kind = String(req.query.kind || 'image');
    if (!['logo', 'cover', 'gallery', 'staff', 'service', 'payment_qr'].includes(kind)) {
      return res.status(400).json({ error: 'Unsupported upload type' });
    }
    req.salon = findSalonByOwner(req.user.id);
    // Local-only owner accounts can add the two onboarding assets before a
    // salon exists. Supabase owners use their owner-scoped Storage folder.
    if (!req.salon && !['logo', 'cover'].includes(kind)) {
      throw new HttpError(409, 'Complete salon onboarding first.', 'ONBOARDING_REQUIRED');
    }
    if (!req.salon && onboardingSupabaseContext(req)) {
      throw new HttpError(409, 'Upload onboarding images to your online storage.', 'ONBOARDING_USE_STORAGE');
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
    if (schedule.every((entry) => entry.closed)) {
      throw new ValidationError('Set at least one working day in the weekly schedule.');
    }
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
  const rawAvailabilityStatus = body.availabilityStatus ?? body.status;
  if (rawAvailabilityStatus !== undefined) {
    if (!isStaffAvailabilityStatus(rawAvailabilityStatus)) {
      throw new ValidationError(
        `Availability must be one of: ${STAFF_AVAILABILITY_STATUSES.join(', ')}`
      );
    }
    out.availability_status = rawAvailabilityStatus;
  }
  if (body.sortOrder !== undefined) out.sort_order = int(body.sortOrder, { min: 0, max: 10_000, field: 'Sort order' });
  return out;
}

salonRouter.get('/staff', asyncHandler(async (req, res) => {
  const { context, salon } = await withStaffStoreErrors(() => requireSupabaseStaffSalon(req));
  const staff = await withStaffStoreErrors(() => getStaffWithLegacyBackfill(context, salon));
  return res.json({ staff });
}));

salonRouter.post('/staff', asyncHandler(async (req, res) => {
  if (
    req.body?.isDemo === true ||
    (typeof req.body?.id === 'string' && /^demo[-_:]/i.test(req.body.id.trim()))
  ) {
    return res.status(400).json({
      error: 'Demo staff profiles are for preview only and cannot be saved as salon employees.',
      code: 'DEMO_STAFF_NOT_SAVEABLE',
    });
  }

  const { context, salon } = await withStaffStoreErrors(() => requireSupabaseStaffSalon(req));
  const data = staffPayload(req.body || {}, { salonId: salon.id });
  const currentStaff = await withStaffStoreErrors(() => getStaffWithLegacyBackfill(context, salon));
  const fullPayload = {
    name: data.name,
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
    sort_order: currentStaff.length,
    ...data,
  };
  const saved = await withStaffStoreErrors(() =>
    insertStaff(context, salon.id, staffPayloadForPostgres(fullPayload))
  );
  audit(req, 'staff.created', 'staff', saved.id);
  return res.status(201).json({ staff: saved });
}));

salonRouter.patch('/staff/:staffId', asyncHandler(async (req, res) => {
  const { context, salon } = await withStaffStoreErrors(() => requireSupabaseStaffSalon(req));
  const data = staffPayload(req.body || {}, { partial: true, salonId: salon.id });
  if (Object.keys(data).length === 0) {
    const current = await withStaffStoreErrors(() => getStaffWithLegacyBackfill(context, salon));
    const unchanged = current.find((member) => member.id === req.params.staffId);
    if (!unchanged) return res.status(404).json({ error: 'Staff member not found', code: 'STAFF_NOT_FOUND' });
    return res.json({ staff: unchanged });
  }
  data.updated_at = nowIso();
  const saved = await withStaffStoreErrors(() =>
    updateStaff(context, salon.id, req.params.staffId, staffPayloadForPostgres(data))
  );
  if (!saved) return res.status(404).json({ error: 'Staff member not found', code: 'STAFF_NOT_FOUND' });
  audit(req, 'staff.updated', 'staff', saved.id);
  return res.json({ staff: saved });
}));

salonRouter.delete('/staff/:staffId', asyncHandler(async (req, res) => {
  const { context, salon } = await withStaffStoreErrors(() => requireSupabaseStaffSalon(req));
  const deleted = await withStaffStoreErrors(() => deleteStaff(context, salon.id, req.params.staffId));
  if (!deleted) return res.status(404).json({ error: 'Staff member not found', code: 'STAFF_NOT_FOUND' });
  audit(req, 'staff.deleted', 'staff', req.params.staffId);
  return res.json({ ok: true });
}));

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
