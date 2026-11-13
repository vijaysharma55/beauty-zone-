import crypto from 'node:crypto';
import { selectWithFallback, withSelect } from './postgrest.js';
import { APPLICATION_ROLES, normalizeRole, SALON_OWNER } from './roles.js';
import {
  DEFAULT_COMMISSION_PERCENT,
  DEFAULT_STAFF_APP_ACCESS_ROLE,
  isStaffAppAccessRole,
  isStaffPrimaryRole,
  parseWeeklySchedule,
} from '../src/lib/staffRoles.js';
import { serviceCategoryLabel, serviceSubcategoryLabel } from '../src/lib/serviceCategories.js';

export const SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://botkjeikjzhnbxnowdkl.supabase.co').replace(/\/+$/, '');
export const SUPABASE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f2nHVHcAdrlosQbZwAAxnQ_vnHQuuv0';

export class SupabaseApiError extends Error {
  constructor(status, message, code) {
    super(message);
    this.name = 'SupabaseApiError';
    this.status = status;
    this.code = code || null;
  }
}

function parseErrorStatus(status, code) {
  if (status === 401 || code === 'PGRST301') return 401;
  if (status === 403 || code === '42501') return 403;
  if (status === 404 || code === 'PGRST116') return 404;
  if (status === 409 || code === '23505') return 409;
  if (status === 400 || code === '22023' || code === '23514' || code === '22P02') return 400;
  return status >= 400 && status < 600 ? status : 500;
}

/** Issue a bounded Supabase request and translate PostgREST errors for API callers. */
export async function requestSupabase(path, token, options = {}) {
  const url = path.startsWith('http') ? path : SUPABASE_URL + path;
  const headers = new Headers(options.headers || {});
  headers.set('apikey', SUPABASE_KEY);
  // Match the Supabase client contract: an anonymous request carries the
  // publishable key as Bearer; authenticated requests carry the verified user JWT.
  headers.set('Authorization', 'Bearer ' + (token || SUPABASE_KEY));
  if (options.body !== undefined && !(options.body instanceof Blob) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.prefer) headers.set('Prefer', options.prefer);
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body === undefined ? undefined : options.body instanceof Blob ? options.body : JSON.stringify(options.body),
    signal: options.signal || AbortSignal.timeout(12_000),
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 500) }; }
  }
  if (!response.ok) {
    const code = data?.code || data?.error_code;
    const message = data?.message || data?.msg || data?.error_description || data?.error || ('Supabase request failed (' + response.status + ')');
    throw new SupabaseApiError(parseErrorStatus(response.status, code), message, code);
  }
  return data;
}

/* Schema variants: newest deployed schema first, oldest last. Defaults fill
   optional columns so callers never see `undefined` for status or metadata. */
export const PROFILE_SELECT_VARIANTS = [
  { select: 'id,email,name,role,status,email_verified,created_at,updated_at' },
  { select: 'id,email,name,role,status,created_at,updated_at', defaults: { email_verified: false } },
  { select: 'id,email,name,role,created_at,updated_at', defaults: { status: 'active', email_verified: false } },
  { select: '*', defaults: { status: 'active', email_verified: false } },
];

export const SERVICE_SELECT_VARIANTS = [
  {
    select:
      'id,salon_id,name,category,subcategory,description,notes,price_paise,duration_minutes,image_url,active,sort_order,created_at,updated_at',
  },
  {
    select: 'id,salon_id,name,category,description,price_paise,duration_minutes,image_url,active,sort_order,created_at,updated_at',
    defaults: { subcategory: '', notes: '' },
  },
  {
    select: 'id,salon_id,name,category,description,price_paise,duration_minutes,active,sort_order,created_at,updated_at',
    defaults: { image_url: '', subcategory: '', notes: '' },
  },
  {
    select: 'id,salon_id,name,category,description,price_paise,duration_minutes,created_at,updated_at',
    defaults: { image_url: '', subcategory: '', notes: '', active: true, sort_order: 0 },
  },
  {
    select: 'id,salon_id,name,description,price_paise,created_at,updated_at',
    defaults: { category: 'other', subcategory: '', notes: '', duration_minutes: 30, image_url: '', active: true, sort_order: 0 },
  },
  {
    select: '*',
    defaults: { active: true, sort_order: 0, duration_minutes: 30, image_url: '', subcategory: '', notes: '' },
  },
];

export const STAFF_FULL_SELECT =
  'id,salon_id,name,role_title,primary_role,app_access_role,commission_percent,mobile_number,hide_mobile_number,' +
  'bio,photo_url,specialties,qualifications,work_photos,work_photos_consent,rating,review_count,experience,' +
  'active,booking_enabled,availability_status,service_ids,weekly_schedule,sort_order,created_at,updated_at';

export const STAFF_PUBLIC_SELECT =
  'id,salon_id,name,role_title,bio,photo_url,specialties,qualifications,work_photos,work_photos_consent,hide_mobile_number,' +
  'rating,review_count,experience,active,booking_enabled,availability_status,service_ids,weekly_schedule,' +
  'sort_order,created_at,updated_at';

// Kept for compatibility with non-staff legacy callers. Staff CRUD below uses
// the full, migrated contract and never silently falls back to a partial row.
export const STAFF_SELECT_VARIANTS = [{ select: STAFF_FULL_SELECT }];

/** Resilient single-row read (used for profiles and any future metadata). */
export async function selectProfileRows(basePath, token, { label = 'public.profiles' } = {}) {
  const result = await selectWithFallback(
    PROFILE_SELECT_VARIANTS,
    (select) => requestSupabase(withSelect(basePath, select), token),
    { label }
  );
  return result.rows;
}

/** Resilient service/staff reads with safe defaults for optional columns. */
export async function selectTableRows(table, baseQuery, token, variants) {
  const result = await selectWithFallback(
    variants,
    (select) => requestSupabase(withSelect(`/rest/v1/${table}?${baseQuery}`, select), token),
    { label: `public.${table}` }
  );
  return result.rows;
}

export async function getSupabaseContext(req, { required = true } = {}) {
  const header = String(req.get('authorization') || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1] || null;
  if (!token) {
    if (required) throw new SupabaseApiError(401, 'Authentication required.');
    return null;
  }
  const authUser = await requestSupabase('/auth/v1/user', token);
  if (!authUser?.id) throw new SupabaseApiError(401, 'Your sign-in session is invalid. Please sign in again.');
  const profiles = await selectProfileRows(
    '/rest/v1/profiles?id=eq.' + encodeURIComponent(authUser.id) + '&limit=1',
    token
  );
  const profile = profiles[0] || null;
  if (!profile) throw new SupabaseApiError(409, 'Your BeautyZone profile is not ready yet. Please sign in again.');
  if (profile.status === 'disabled') throw new SupabaseApiError(403, 'This account has been disabled. Please contact support.');
  const rawRole = String(profile.role ?? '').trim();
  const role = rawRole ? normalizeRole(rawRole) : '';
  if (!rawRole || !APPLICATION_ROLES.includes(role)) {
    throw new SupabaseApiError(403, 'Your account does not have an application role.');
  }
  return {
    token,
    authUser,
    profile,
    id: authUser.id,
    email: authUser.email || profile.email || '',
    role,
    name: profile.name || authUser.user_metadata?.name || authUser.user_metadata?.full_name || '',
    emailVerified: Boolean(authUser.email_confirmed_at || authUser.confirmed_at || profile.email_verified),
    phoneVerified: Boolean(authUser.phone_confirmed_at),
    phone: authUser.phone || null,
  };
}

export async function rest(ctx, table, query = '', options = {}) {
  const q = query ? '?' + query.replace(/^\?/, '') : '';
  return requestSupabase('/rest/v1/' + table + q, ctx?.token, options);
}

export async function rpc(ctx, name, body = {}) {
  return requestSupabase('/rest/v1/rpc/' + name, ctx?.token, { method: 'POST', body });
}

export const isoNow = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();

export function profileUser(ctx) {
  return {
    id: ctx.id,
    email: ctx.email,
    name: ctx.profile.name || ctx.name || '',
    role: normalizeRole(ctx.role),
    status: ctx.profile.status || 'active',
    authProvider: ctx.authUser.app_metadata?.provider === 'google' ? 'google' : 'password',
    emailVerified: ctx.emailVerified,
    lastLoginAt: ctx.authUser.last_sign_in_at || null,
    createdAt: ctx.profile.created_at,
  };
}

export function mapSalon(row, extras = {}) {
  if (!row) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    slug: row.slug,
    tagline: row.tagline || '',
    description: row.description || '',
    logoUrl: row.logo_url || '',
    coverImage: row.cover_image || '',
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    phone: row.phone || '',
    email: row.email || '',
    whatsapp: row.whatsapp || '',
    addressLine: row.address_line || '',
    city: row.city || '',
    state: row.state || '',
    postalCode: row.postal_code || '',
    country: row.country || 'India',
    mapUrl: row.map_url || '',
    instagram: row.instagram || '',
    facebook: row.facebook || '',
    heroTitle: row.hero_title || '',
    heroSubtitle: row.hero_subtitle || '',
    theme: row.theme && typeof row.theme === 'object' ? row.theme : {},
    published: Boolean(row.website_published),
    publishedAt: row.published_at || null,
    status: row.status || 'draft',
    submittedAt: row.submitted_at || null,
    approvedAt: row.approved_at || null,
    reviewNote: row.review_note || '',
    reviewedAt: row.reviewed_at || null,
    suspended: Boolean(row.suspended),
    suspendedReason: row.suspended_reason || '',
    suspendedAt: row.suspended_at || null,
    templateId: row.template_id || 'luxe',
    timings: Array.isArray(row.timings) ? row.timings : [],
    ownerName: row.owner_name || '',
    ownerPhone: row.owner_phone || '',
    onboardingCompleted: Boolean(row.onboarding_completed),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(extras.owner ? { owner: extras.owner } : {}),
    ...(extras.subscription !== undefined ? { subscription: extras.subscription } : {}),
    ...(extras.serviceCount !== undefined ? { serviceCount: extras.serviceCount } : {}),
  };
}

export function mapService(row) {
  if (!row) return null;
  const pricePaise = Number(row.price_paise || 0);
  const category = row.category || 'other';
  const subcategory = row.subcategory || '';
  return {
    id: row.id, salonId: row.salon_id, name: row.name, category,
    categoryLabel: serviceCategoryLabel(category),
    subcategory, subcategoryLabel: serviceSubcategoryLabel(subcategory),
    description: row.description || '', notes: row.notes || '',
    pricePaise, price: pricePaise / 100,
    durationMinutes: Number(row.duration_minutes || 30), imageUrl: row.image_url || '',
    active: Boolean(row.active), sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function mapStaff(row) {
  if (!row) return null;
  const commission = Number(row.commission_percent);
  const specialties = Array.isArray(row.specialties) ? row.specialties : [];
  const qualifications = Array.isArray(row.qualifications) ? row.qualifications : [];
  const workPhotos = Array.isArray(row.work_photos) ? row.work_photos : [];
  return {
    id: row.id, salonId: row.salon_id, name: row.name, roleTitle: row.role_title || '',
    primaryRole: isStaffPrimaryRole(row.primary_role) ? row.primary_role : '',
    appAccessRole: isStaffAppAccessRole(row.app_access_role) ? row.app_access_role : DEFAULT_STAFF_APP_ACCESS_ROLE,
    commissionPercent: Number.isFinite(commission) ? Math.round(Math.min(100, Math.max(0, commission)) * 10) / 10 : DEFAULT_COMMISSION_PERCENT,
    bio: row.bio || '', photoUrl: row.photo_url || '',
    specialties, qualifications, workPhotos,
    workPhotosConsent: Boolean(row.work_photos_consent),
    rating: row.rating === null || row.rating === undefined ? null : Number(row.rating),
    reviewCount: Number(row.review_count || 0),
    experience: row.experience || '',
    active: Boolean(row.active), bookingEnabled: row.booking_enabled !== false,
    availabilityStatus: ['available', 'busy', 'on_leave', 'off_duty'].includes(row.availability_status) ? row.availability_status : 'available',
    mobileNumber: row.mobile_number || '',
    hideMobileNumber: Boolean(row.hide_mobile_number),
    serviceIds: Array.isArray(row.service_ids) ? row.service_ids.filter((id) => typeof id === 'string' && id) : [],
    weeklySchedule: parseWeeklySchedule(Array.isArray(row.weekly_schedule) ? row.weekly_schedule : undefined),
    sortOrder: Number(row.sort_order || 0), createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function mapSubscription(row) {
  if (!row) return null;
  return {
    id: row.id, salonId: row.salon_id, plan: row.plan, status: row.status,
    currentPeriodEnd: row.current_period_end || null,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

export function mapVersion(row) {
  if (!row) return null;
  return {
    id: row.id, salonId: row.salon_id, version: Number(row.version), status: row.status,
    submittedAt: row.submitted_at, reviewedAt: row.reviewed_at || null,
    reviewNote: row.review_note || '', contentHash: row.content_hash || undefined,
  };
}

/** Read the verified owner’s salon under their Supabase token and RLS. */
export async function getSalonForOwner(ctx) {
  const rows = await rest(ctx, 'salons', 'owner_id=eq.' + encodeURIComponent(ctx.id) + '&select=*&limit=1');
  return rows[0] || null;
}

export async function markStaffBackfillComplete(ctx, salonId) {
  if (!ctx?.token || !salonId) throw new SupabaseApiError(401, 'A verified salon session is required to complete staff migration.');
  const query = 'id=eq.' + encodeURIComponent(salonId) + '&select=id,staff_migrated_at';
  const rows = await rest(ctx, 'salons', query, {
    method: 'PATCH',
    body: { staff_migrated_at: isoNow() },
    prefer: 'return=representation',
  });
  if (!Array.isArray(rows) || !rows[0]) {
    throw new SupabaseApiError(403, 'Could not record the one-time staff migration for this salon.');
  }
  return rows[0];
}

export async function getSalonById(ctx, salonId) {
  const rows = await rest(ctx, 'salons', 'id=eq.' + encodeURIComponent(salonId) + '&select=*&limit=1');
  return rows[0] || null;
}

export async function getServices(ctx, salonId, { activeOnly = false } = {}) {
  const q = 'salon_id=eq.' + encodeURIComponent(salonId) + '&order=sort_order.asc,created_at.asc' + (activeOnly ? '&active=eq.true' : '');
  const rows = await selectTableRows('services', q, ctx?.token, SERVICE_SELECT_VARIANTS);
  return rows.map(mapService);
}

export async function getStaff(ctx, salonId, { activeOnly = false } = {}) {
  if (!ctx?.token || !salonId) throw new SupabaseApiError(401, 'A verified salon session is required to read staff.');
  const q = 'salon_id=eq.' + encodeURIComponent(salonId) +
    (activeOnly ? '&active=eq.true' : '') +
    '&order=sort_order.asc,created_at.asc&select=' + encodeURIComponent(STAFF_FULL_SELECT);
  const rows = await rest(ctx, 'staff', q);
  return rows.map(mapStaff);
}

/** Public roster reads use only the column allowlist granted to the anon role. */
export async function getPublicStaff(salonId, { activeOnly = true } = {}) {
  if (!salonId) return [];
  const q = 'salon_id=eq.' + encodeURIComponent(salonId) +
    (activeOnly ? '&active=eq.true' : '') +
    '&order=sort_order.asc,created_at.asc&select=' + encodeURIComponent(STAFF_PUBLIC_SELECT);
  const rows = await rest(null, 'staff_public_profiles', q);
  return rows.map(mapStaff);
}

/** Find one currently public staff row; the anon RLS policy remains authoritative. */
export async function getPublicStaffById(staffId) {
  if (!staffId || /^demo[-_:]/i.test(String(staffId))) return null;
  const q = 'id=eq.' + encodeURIComponent(staffId) +
    '&active=eq.true&limit=1&select=' + encodeURIComponent(STAFF_PUBLIC_SELECT);
  const rows = await rest(null, 'staff_public_profiles', q);
  return mapStaff(rows[0] || null);
}

export async function insertStaff(ctx, salonId, values) {
  if (!ctx?.token || !salonId) throw new SupabaseApiError(401, 'A verified salon session is required to create staff.');
  const rows = await rest(ctx, 'staff', 'select=' + encodeURIComponent(STAFF_FULL_SELECT), {
    method: 'POST',
    body: { ...values, salon_id: salonId },
    prefer: 'return=representation',
  });
  if (!Array.isArray(rows) || !rows[0]?.id) {
    throw new SupabaseApiError(500, 'Supabase did not return the saved staff record.');
  }
  return mapStaff(rows[0]);
}

export async function updateStaff(ctx, salonId, staffId, values) {
  if (!ctx?.token || !salonId) throw new SupabaseApiError(401, 'A verified salon session is required to update staff.');
  const query = 'id=eq.' + encodeURIComponent(staffId) +
    '&salon_id=eq.' + encodeURIComponent(salonId) +
    '&select=' + encodeURIComponent(STAFF_FULL_SELECT);
  const rows = await rest(ctx, 'staff', query, {
    method: 'PATCH',
    body: values,
    prefer: 'return=representation',
  });
  return Array.isArray(rows) && rows[0] ? mapStaff(rows[0]) : null;
}

export async function deleteStaff(ctx, salonId, staffId) {
  if (!ctx?.token || !salonId) throw new SupabaseApiError(401, 'A verified salon session is required to delete staff.');
  const query = 'id=eq.' + encodeURIComponent(staffId) +
    '&salon_id=eq.' + encodeURIComponent(salonId) + '&select=id';
  const rows = await rest(ctx, 'staff', query, {
    method: 'DELETE',
    prefer: 'return=representation',
  });
  return Array.isArray(rows) && rows.length > 0;
}

export async function getSubscription(ctx, salonId) {
  const rows = await rest(ctx, 'subscriptions', 'salon_id=eq.' + encodeURIComponent(salonId) + '&select=*&limit=1');
  return mapSubscription(rows[0] || null);
}

export async function getVersions(ctx, salonId) {
  return (await rest(ctx, 'salon_versions', 'salon_id=eq.' + encodeURIComponent(salonId) + '&select=*&order=version.desc')).map(mapVersion);
}

export function buildSnapshot(salon, services, staff) {
  return {
    salon: {
      name: salon.name, tagline: salon.tagline, description: salon.description,
      logoUrl: salon.logo_url, coverImage: salon.cover_image,
      gallery: Array.isArray(salon.gallery) ? salon.gallery : [],
      phone: salon.phone, email: salon.email, whatsapp: salon.whatsapp,
      addressLine: salon.address_line, city: salon.city, state: salon.state,
      postalCode: salon.postal_code, country: salon.country, mapUrl: salon.map_url,
      instagram: salon.instagram, facebook: salon.facebook, heroTitle: salon.hero_title,
      heroSubtitle: salon.hero_subtitle, theme: salon.theme || {},
      templateId: salon.template_id, timings: salon.timings || [],
      ownerName: salon.owner_name, ownerPhone: salon.owner_phone,
    },
    services: services.map((s) => ({
      id: s.id, name: s.name, category: s.category,
      categoryLabel: serviceCategoryLabel(s.category),
      subcategory: s.subcategory || '', subcategoryLabel: serviceSubcategoryLabel(s.subcategory),
      description: s.description, notes: s.notes || '', imageUrl: s.image_url || '',
      pricePaise: Number(s.price_paise || 0), durationMinutes: Number(s.duration_minutes || 30),
      active: Boolean(s.active), sortOrder: Number(s.sort_order || 0),
    })),
    staff: staff.map((s) => ({
      id: s.id, name: s.name, roleTitle: s.role_title || '', bio: s.bio || '',
      photoUrl: s.photo_url || '', specialties: Array.isArray(s.specialties) ? s.specialties : [],
      active: Boolean(s.active), bookingEnabled: s.booking_enabled !== false,
      sortOrder: Number(s.sort_order || 0),
    })),
  };
}

export function hashSnapshot(snapshot) {
  const canonical = JSON.stringify({
    salon: snapshot.salon,
    services: snapshot.services.map((s) => ({ ...s })),
    staff: snapshot.staff.map((s) => ({ ...s })),
  });
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

export async function getWorkflow(ctx, salon) {
  if (!salon) return null;
  const versions = await getVersions(ctx, salon.id);
  const pending = versions.find((v) => v.status === 'pending') || null;
  const approved = versions.find((v) => v.status === 'approved') || null;
  const [services, staff] = await Promise.all([getServices(ctx, salon.id), getStaff(ctx, salon.id)]);
  const currentHash = hashSnapshot(buildSnapshot(salon, await rawServices(ctx, salon.id), await rawStaff(ctx, salon.id)));
  const blockers = [];
  if (!ctx.emailVerified) blockers.push({ code: 'EMAIL_UNVERIFIED', message: 'Verify your email address before submitting for approval.' });
  if (salon.suspended) blockers.push({ code: 'SUSPENDED', message: 'This salon is suspended by the platform.' });
  const missing = [];
  if (!salon.name) missing.push('salon name');
  if (!salon.address_line) missing.push('street address');
  if (!salon.city) missing.push('city');
  if (!salon.phone) missing.push('phone number');
  if (!services.some((s) => s.active)) missing.push('at least one active service');
  if (missing.length) blockers.push({ code: 'INCOMPLETE', message: 'Complete your profile first: add ' + missing.join(', ') + '.', missing });
  const hasUnpublishedChanges = Boolean(approved && approved.contentHash !== currentHash);
  // Mirrors server/workflow.js: a salon owner may only submit for review.
  // Approving and publishing are super-admin-only transitions, so `canPublish`
  // is always false on the owner surface.
  const isApproved = salon.status === 'approved';
  const isLive = isApproved && Boolean(salon.website_published) && !salon.suspended;
  return {
    status: salon.status,
    reviewStatus: salon.status,
    websiteStatus: isApproved ? 'approved' : salon.status === 'pending' ? 'pending_approval' : 'draft',
    isLive,
    published: Boolean(salon.website_published),
    canBePublished: isApproved && !salon.suspended,
    awaitingReview: salon.status === 'pending',
    suspended: Boolean(salon.suspended),
    suspendedReason: salon.suspended_reason || '',
    reviewNote: salon.review_note || '',
    submittedAt: salon.submitted_at || null,
    approvedAt: salon.approved_at || null,
    reviewedAt: salon.reviewed_at || null,
    emailVerified: ctx.emailVerified,
    pendingVersion: pending,
    approvedVersion: approved,
    hasUnpublishedChanges,
    canSubmit: !pending && !salon.suspended && blockers.length === 0,
    canPublish: false,
    blockers,
  };
}

export async function rawServices(ctx, salonId) {
  return selectTableRows(
    'services',
    'salon_id=eq.' + encodeURIComponent(salonId) + '&order=sort_order.asc,created_at.asc',
    ctx?.token,
    SERVICE_SELECT_VARIANTS
  );
}
export async function rawStaff(ctx, salonId) {
  return selectTableRows(
    'staff',
    'salon_id=eq.' + encodeURIComponent(salonId) + '&order=sort_order.asc,created_at.asc',
    ctx?.token,
    STAFF_SELECT_VARIANTS
  );
}

export async function userPayload(ctx, { includeSalon = true } = {}) {
  const user = profileUser(ctx);
  const salonRow = includeSalon && ctx.role === SALON_OWNER ? await getSalonForOwner(ctx) : null;
  if (!salonRow) return {
    user, salon: null, workflow: null, subscription: null,
    onboardingRequired: ctx.role === SALON_OWNER,
  };
  const [workflow, subscription] = await Promise.all([getWorkflow(ctx, salonRow), getSubscription(ctx, salonRow.id)]);
  return {
    user, salon: mapSalon(salonRow), workflow, subscription,
    onboardingRequired: false,
  };
}

export async function writeAudit(ctx, action, targetType = null, targetId = null, metadata = null) {
  try {
    await rest(ctx, 'audit_logs', '', {
      method: 'POST',
      body: [{
        actor_id: ctx?.id || null,
        actor_email: ctx?.email || null,
        action,
        target_type: targetType,
        target_id: targetId ? String(targetId) : null,
        metadata: metadata || null,
        meta: metadata || null,
      }],
      prefer: 'return=minimal',
    });
  } catch (error) {
    console.error('[supabase audit] write failed:', error.message);
  }
}

export async function getLiveSalon(ctx, slug) {
  const rows = await rest(ctx, 'salons', 'slug=eq.' + encodeURIComponent(slug) + '&select=*&limit=1');
  const salon = rows[0] || null;
  // A public website requires publication AND super-admin approval. Pending
  // submissions never serve traffic.
  if (!salon || !salon.website_published || salon.status !== 'approved' || salon.suspended) return null;
  const versions = await rest(ctx, 'salon_versions', 'salon_id=eq.' + encodeURIComponent(salon.id) + '&status=eq.approved&select=*&order=version.desc&limit=1');
  const version = versions[0] || null;
  if (!version || !version.snapshot) return null;
  return { salon, version, snapshot: version.snapshot };
}

export function livePayload(live) {
  if (!live) return null;
  const s = live.snapshot.salon || {};
  const salon = {
    id: live.salon.id, slug: live.salon.slug, name: s.name || live.salon.name,
    tagline: s.tagline ?? live.salon.tagline ?? '',
    description: s.description ?? live.salon.description ?? '',
    logoUrl: s.logoUrl ?? live.salon.logo_url ?? '',
    coverImage: s.coverImage ?? live.salon.cover_image ?? '',
    gallery: Array.isArray(s.gallery) ? s.gallery : [],
    phone: s.phone ?? live.salon.phone ?? '', email: s.email ?? live.salon.email ?? '',
    whatsapp: s.whatsapp ?? live.salon.whatsapp ?? '', addressLine: s.addressLine ?? live.salon.address_line ?? '',
    city: s.city ?? live.salon.city ?? '', state: s.state ?? live.salon.state ?? '',
    postalCode: s.postalCode ?? live.salon.postal_code ?? '', country: s.country ?? live.salon.country ?? '',
    mapUrl: s.mapUrl ?? live.salon.map_url ?? '', instagram: s.instagram ?? live.salon.instagram ?? '',
    facebook: s.facebook ?? live.salon.facebook ?? '', heroTitle: s.heroTitle ?? live.salon.hero_title ?? '',
    heroSubtitle: s.heroSubtitle ?? live.salon.hero_subtitle ?? '', theme: s.theme || live.salon.theme || {},
    templateId: s.templateId || live.salon.template_id || 'luxe', timings: Array.isArray(s.timings) ? s.timings : [],
    ownerName: s.ownerName || '', published: true, publishedAt: live.salon.published_at,
    approvedAt: live.salon.approved_at, websiteVersion: live.version.version, updatedAt: live.version.reviewed_at || live.salon.updated_at,
  };
  const services = (live.snapshot.services || []).filter((s) => s.active).map((s) => ({
    id:s.id, salonId:live.salon.id, name:s.name, category:s.category,
    categoryLabel:s.categoryLabel || serviceCategoryLabel(s.category),
    subcategory:s.subcategory || '', subcategoryLabel:s.subcategoryLabel || serviceSubcategoryLabel(s.subcategory),
    description:s.description, notes:s.notes || '', imageUrl:s.imageUrl || '',
    pricePaise:s.pricePaise, price:s.pricePaise/100, durationMinutes:s.durationMinutes, active:true, sortOrder:s.sortOrder,
  }));
  const staff = (live.snapshot.staff || []).filter((s) => s.active).map((s) => ({
    id:s.id, salonId:live.salon.id, name:s.name, roleTitle:s.roleTitle, bio:s.bio, photoUrl:s.photoUrl,
    specialties:Array.isArray(s.specialties)?s.specialties:[], active:true, bookingEnabled:s.bookingEnabled!==false, sortOrder:s.sortOrder,
  }));
  return { salon, services, staff };
}
