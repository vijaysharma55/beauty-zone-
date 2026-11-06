import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : process.env.VERCEL
    ? '/tmp/beautyzone-data'
    : path.join(ROOT, 'data');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });

export const DATA_PATH = DATA_DIR;
export const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');

const DB_FILE = process.env.DATABASE_PATH || path.join(DATA_DIR, 'beautyzone.db');

export const db = new DatabaseSync(DB_FILE);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password' CHECK (auth_provider IN ('password', 'google')),
    google_sub TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'salon_owner' CHECK (role IN ('super_admin', 'salon_owner')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    email_verified INTEGER NOT NULL DEFAULT 0,
    email_verified_at TEXT,
    email_verification_token_hash TEXT,
    email_verification_expires TEXT,
    failed_logins INTEGER NOT NULL DEFAULT 0,
    locked_until TEXT,
    password_reset_token_hash TEXT,
    password_reset_expires TEXT,
    last_login_at TEXT,
    date_of_birth TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

  CREATE TABLE IF NOT EXISTS salons (
    id TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
    tagline TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '',
    cover_image TEXT NOT NULL DEFAULT '',
    gallery_json TEXT NOT NULL DEFAULT '[]',
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '',
    address_line TEXT NOT NULL DEFAULT '',
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL DEFAULT '',
    country TEXT NOT NULL DEFAULT 'India',
    map_url TEXT NOT NULL DEFAULT '',
    instagram TEXT NOT NULL DEFAULT '',
    facebook TEXT NOT NULL DEFAULT '',
    hero_title TEXT NOT NULL DEFAULT '',
    hero_subtitle TEXT NOT NULL DEFAULT '',
    theme_json TEXT NOT NULL DEFAULT '{}',
    website_published INTEGER NOT NULL DEFAULT 0,
    published_at TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','rejected','changes_requested')),
    submitted_at TEXT,
    approved_at TEXT,
    review_note TEXT NOT NULL DEFAULT '',
    reviewed_at TEXT,
    suspended INTEGER NOT NULL DEFAULT 0,
    suspended_reason TEXT NOT NULL DEFAULT '',
    suspended_at TEXT,
    template_id TEXT NOT NULL DEFAULT 'luxe',
    timings_json TEXT NOT NULL DEFAULT '[]',
    owner_name TEXT NOT NULL DEFAULT '',
    owner_phone TEXT NOT NULL DEFAULT '',
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'other',
    description TEXT NOT NULL DEFAULT '',
    price_paise INTEGER NOT NULL DEFAULT 0 CHECK (price_paise >= 0),
    duration_minutes INTEGER NOT NULL DEFAULT 30 CHECK (duration_minutes > 0 AND duration_minutes <= 1440),
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    advance_mode TEXT NOT NULL DEFAULT 'inherit' CHECK (advance_mode IN ('inherit','percent','fixed','none')),
    advance_percent REAL,
    advance_fixed_paise INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id);

  /* Salon-owner-controlled booking & advance payment settings. One row per
     salon; salons without a row fall back to the platform defaults. */
  CREATE TABLE IF NOT EXISTS salon_payment_settings (
    salon_id TEXT PRIMARY KEY REFERENCES salons(id) ON DELETE CASCADE,
    advance_enabled INTEGER NOT NULL DEFAULT 1,
    advance_type TEXT NOT NULL DEFAULT 'percent' CHECK (advance_type IN ('percent','fixed')),
    advance_percent REAL NOT NULL DEFAULT 25,
    advance_fixed_paise INTEGER NOT NULL DEFAULT 0,
    balance_policy TEXT NOT NULL DEFAULT 'at_salon' CHECK (balance_policy IN ('at_salon','online')),
    disabled_policy TEXT NOT NULL DEFAULT 'pay_at_salon' CHECK (disabled_policy IN ('pay_at_salon','block_booking')),
    gateway_enabled INTEGER NOT NULL DEFAULT 1,
    manual_upi_enabled INTEGER NOT NULL DEFAULT 0,
    upi_id TEXT NOT NULL DEFAULT '',
    payment_display_name TEXT NOT NULL DEFAULT '',
    upi_qr_url TEXT NOT NULL DEFAULT '',
    methods_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role_title TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    specialties_json TEXT NOT NULL DEFAULT '[]',
    qualifications_json TEXT NOT NULL DEFAULT '[]',
    work_photos_json TEXT NOT NULL DEFAULT '[]',
    work_photos_consent INTEGER NOT NULL DEFAULT 0,
    rating REAL,
    review_count INTEGER NOT NULL DEFAULT 0,
    experience TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    booking_enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_staff_salon ON staff(salon_id);

  CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL UNIQUE REFERENCES salons(id) ON DELETE CASCADE,
    plan TEXT NOT NULL DEFAULT 'trial' CHECK (plan IN ('trial', 'starter', 'pro', 'elite')),
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled')),
    current_period_end TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    salon_id TEXT REFERENCES salons(id) ON DELETE CASCADE,
    reference TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    service TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT '',
    stylist TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'salon' CHECK (location_type IN ('salon','home')),
    branch TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    locality TEXT NOT NULL DEFAULT '',
    distance_km REAL,
    bridal_trial INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    promo_code TEXT,
    estimated_total INTEGER NOT NULL DEFAULT 0,
    final_bill_amount INTEGER CHECK (final_bill_amount IS NULL OR (final_bill_amount > 0 AND final_bill_amount <= 10000000)),
    loyalty_award_status TEXT NOT NULL DEFAULT 'not_awarded' CHECK (loyalty_award_status IN ('not_awarded','pending','awarded','failed','not_eligible')),
    loyalty_points_awarded INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points_awarded >= 0),
    loyalty_award_error TEXT NOT NULL DEFAULT '',
    loyalty_voucher_status TEXT NOT NULL DEFAULT 'none' CHECK (loyalty_voucher_status IN ('none','reserved','used','released','release_failed')),
    loyalty_voucher_error TEXT NOT NULL DEFAULT '',
    advance_paid INTEGER NOT NULL DEFAULT 0,
    advance_ref TEXT,
    amount_paise INTEGER NOT NULL DEFAULT 0,
    advance_paise INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'not_required',
    balance_policy TEXT NOT NULL DEFAULT 'at_salon',
    payment_method TEXT NOT NULL DEFAULT '',
    confirmed_at TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','pending_payment','payment_verification_pending','payment_failed','advance_paid','confirmed','declined','completed','cancelled','expired')),
    source TEXT NOT NULL DEFAULT 'public',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id, date);
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

  /* Payment orders (mock test orders, Razorpay orders and manual UPI orders
     share this table). */
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    salon_id TEXT REFERENCES salons(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('mock','razorpay','manual_upi')),
    method TEXT NOT NULL DEFAULT '',
    kind TEXT NOT NULL DEFAULT 'advance' CHECK (kind IN ('advance','balance')),
    provider_order_id TEXT NOT NULL UNIQUE,
    provider_payment_id TEXT UNIQUE,
    amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
    total_paise INTEGER NOT NULL DEFAULT 0,
    remaining_paise INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created'
      CHECK (status IN ('created','pending','verification_pending','paid','failed','cancelled','expired')),
    failure_reason TEXT NOT NULL DEFAULT '',
    instrument TEXT NOT NULL DEFAULT '',
    manual_reference TEXT,
    customer_note TEXT NOT NULL DEFAULT '',
    claimed_at TEXT,
    verified_by TEXT,
    verification_note TEXT NOT NULL DEFAULT '',
    raw_json TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

  /* Server-issued mock transactions. A mock success is only honoured when the
     transaction id exists here and belongs to the order being verified. */
  CREATE TABLE IF NOT EXISTS mock_transactions (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    booking_id TEXT NOT NULL,
    provider_order_id TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('success','failed','pending','cancelled')),
    method TEXT NOT NULL DEFAULT '',
    instrument TEXT NOT NULL DEFAULT '',
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    consumed_at TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_mock_txn_payment ON mock_transactions(payment_id);

  /* Webhook deliveries are recorded so a retry can never double-process. */
  CREATE TABLE IF NOT EXISTS payment_webhook_events (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL DEFAULT '',
    payload_hash TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'received',
    result TEXT NOT NULL DEFAULT '',
    received_at TEXT NOT NULL,
    processed_at TEXT
  );

  /* Professional payment receipts, issued only after a verified payment.
     The public download link carries a random token; only its hash is stored. */
  CREATE TABLE IF NOT EXISTS payment_receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    payment_id TEXT NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
    salon_id TEXT REFERENCES salons(id) ON DELETE SET NULL,
    access_token TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'advance' CHECK (kind IN ('advance','balance')),
    total_paise INTEGER NOT NULL DEFAULT 0,
    paid_paise INTEGER NOT NULL DEFAULT 0,
    remaining_paise INTEGER NOT NULL DEFAULT 0,
    method TEXT NOT NULL DEFAULT '',
    transaction_ref TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'INR',
    issued_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_receipts_booking ON payment_receipts(booking_id);

  /* WhatsApp Business notification ledger. A message is only marked sent when
     the provider API accepts it; delivery/read come from provider webhooks. */
  CREATE TABLE IF NOT EXISTS whatsapp_notifications (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    salon_id TEXT,
    receipt_id TEXT,
    to_number TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'meta_cloud',
    template_name TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending','sent','delivered','read','failed','skipped')),
    provider_message_id TEXT,
    error TEXT NOT NULL DEFAULT '',
    attempts INTEGER NOT NULL DEFAULT 0,
    payload_json TEXT,
    last_attempt_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_whatsapp_booking ON whatsapp_notifications(booking_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_whatsapp_msg ON whatsapp_notifications(provider_message_id);

  CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_email TEXT,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    meta TEXT,
    ip TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loyalty_accounts (
    phone TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    member_id TEXT NOT NULL DEFAULT '',
    tier TEXT NOT NULL DEFAULT 'silver',
    total_points INTEGER NOT NULL DEFAULT 0,
    lifetime_points INTEGER NOT NULL DEFAULT 0,
    visits_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    booking_id TEXT,
    salon_id TEXT,
    service_title TEXT DEFAULT '',
    bill_amount INTEGER DEFAULT 0,
    points INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_loyalty_tx_phone ON loyalty_transactions(phone);

  CREATE TABLE IF NOT EXISTS loyalty_vouchers (
    code TEXT PRIMARY KEY,
    phone TEXT NOT NULL,
    offer_id TEXT NOT NULL,
    title TEXT NOT NULL,
    discount_amount INTEGER NOT NULL DEFAULT 0,
    points_cost INTEGER NOT NULL DEFAULT 0,
    used INTEGER NOT NULL DEFAULT 0,
    used_booking_id TEXT,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_loyalty_vouchers_phone ON loyalty_vouchers(phone);

  CREATE TABLE IF NOT EXISTS waitlist (
    id TEXT PRIMARY KEY,
    salon_id TEXT REFERENCES salons(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    service TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'expired')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_waitlist_salon ON waitlist(salon_id, date);

  CREATE TABLE IF NOT EXISTS stylist_inquiries (
    id TEXT PRIMARY KEY,
    salon_id TEXT REFERENCES salons(id) ON DELETE CASCADE,
    stylist_id TEXT NOT NULL,
    stylist_name TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'responded', 'archived')),
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_stylist_inquiries_salon ON stylist_inquiries(salon_id);
`);


// Additive compatibility migration for SQLite files created before loyalty award
// tracking was introduced. New databases already have these columns above.
const bookingColumns = new Set(db.prepare('PRAGMA table_info(bookings)').all().map((column) => column.name));
const bookingColumnMigrations = [
  ['final_bill_amount', "INTEGER CHECK (final_bill_amount IS NULL OR (final_bill_amount > 0 AND final_bill_amount <= 10000000))"],
  ['loyalty_award_status', "TEXT NOT NULL DEFAULT 'not_awarded' CHECK (loyalty_award_status IN ('not_awarded','pending','awarded','failed','not_eligible'))"],
  ['loyalty_points_awarded', 'INTEGER NOT NULL DEFAULT 0 CHECK (loyalty_points_awarded >= 0)'],
  ['loyalty_award_error', "TEXT NOT NULL DEFAULT ''"],
  ['loyalty_voucher_status', "TEXT NOT NULL DEFAULT 'none' CHECK (loyalty_voucher_status IN ('none','reserved','used','released','release_failed'))"],
  ['loyalty_voucher_error', "TEXT NOT NULL DEFAULT ''"],
];
for (const [column, definition] of bookingColumnMigrations) {
  if (!bookingColumns.has(column)) {
    db.exec('ALTER TABLE bookings ADD COLUMN ' + column + ' ' + definition);
  }
}

export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

/** Default weekly opening hours used for templates, seeds and new salons. */
export const DEFAULT_TIMINGS = [
  { day: 'mon', open: '10:00', close: '20:00', closed: false },
  { day: 'tue', open: '10:00', close: '20:00', closed: false },
  { day: 'wed', open: '10:00', close: '20:00', closed: false },
  { day: 'thu', open: '10:00', close: '20:00', closed: false },
  { day: 'fri', open: '10:00', close: '21:00', closed: false },
  { day: 'sat', open: '09:00', close: '21:00', closed: false },
  { day: 'sun', open: '11:00', close: '18:00', closed: false },
];

export const TEMPLATE_IDS = ['luxe', 'minimal', 'noir', 'blush'];

export const SALON_STATUSES = ['draft', 'pending', 'approved', 'rejected', 'changes_requested'];

export const DEFAULT_SETTINGS = {
  platformName: 'BeautyZone',
  supportEmail: 'support@beautyzone.app',
  allowRegistrations: true,
  trialDays: 14,
  maintenanceMessage: '',
  defaultPlan: 'starter',
};

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function getSettings() {
  const rows = db.prepare('SELECT key, value FROM platform_settings').all();
  const out = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    try {
      out[row.key] = JSON.parse(row.value);
    } catch {
      out[row.key] = row.value;
    }
  }
  return out;
}

export function saveSettings(patch) {
  const stmt = db.prepare(
    'INSERT INTO platform_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  );
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in DEFAULT_SETTINGS)) continue;
    stmt.run(key, JSON.stringify(value));
  }
  return getSettings();
}

/* ------------------------------------------------------------------ */
/* Serializers                                                         */
/* ------------------------------------------------------------------ */

export function safeJson(value, fallback) {
  try {
    const parsed = JSON.parse(value ?? '');
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function publicUser(row, { includePrivate = false } = {}) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    authProvider: row.auth_provider,
    emailVerified: !!row.email_verified,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    // Date of birth is private PII: it is only ever returned to the account
    // owner (includePrivate), never in admin lists or public payloads.
    ...(includePrivate ? { dateOfBirth: row.date_of_birth || null } : {}),
  };
}

export function serializeService(row) {
  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    category: row.category,
    description: row.description,
    pricePaise: row.price_paise,
    price: row.price_paise / 100,
    durationMinutes: row.duration_minutes,
    active: !!row.active,
    sortOrder: row.sort_order,
    advanceMode: row.advance_mode || 'inherit',
    advancePercent: row.advance_percent === null || row.advance_percent === undefined ? null : Number(row.advance_percent),
    advanceFixedPaise: row.advance_fixed_paise === null || row.advance_fixed_paise === undefined ? null : Number(row.advance_fixed_paise),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeStaff(row, options = {}) {
  const publicView = Boolean(options && typeof options === 'object' && options.publicView);
  const specialties = safeJson(row.specialties_json, []);
  const qualifications = safeJson(row.qualifications_json, []);
  const rawWorkPhotos = safeJson(row.work_photos_json, []);
  const workPhotos = (Array.isArray(rawWorkPhotos) ? rawWorkPhotos : [])
    .map((item) => {
      if (typeof item === 'string' && item.trim()) return { url: item.trim(), caption: '' };
      if (item && typeof item === 'object' && typeof item.url === 'string' && item.url.trim()) {
        return { url: item.url.trim(), caption: typeof item.caption === 'string' ? item.caption : '' };
      }
      return null;
    })
    .filter(Boolean);
  const workPhotosConsent = Boolean(row.work_photos_consent);
  const parsedRating = row.rating !== null && row.rating !== undefined && row.rating !== '' ? Number(row.rating) : null;
  const genuineRating = parsedRating !== null && Number.isFinite(parsedRating) && parsedRating > 0 ? parsedRating : null;
  const availabilityStatus = ['available', 'busy', 'on_leave'].includes(row.availability_status)
    ? row.availability_status
    : 'available';
  const bookingSwitchOn =
    row.booking_enabled === undefined || row.booking_enabled === null ? true : !!row.booking_enabled;

  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    roleTitle: row.role_title,
    bio: row.bio,
    photoUrl: row.photo_url,
    specialties: Array.isArray(specialties) ? specialties.filter(Boolean) : [],
    qualifications: Array.isArray(qualifications) ? qualifications.filter(Boolean) : [],
    // Work photos are strictly gated behind explicit staff consent on public payloads.
    workPhotos: publicView ? (workPhotosConsent ? workPhotos : []) : workPhotos,
    workPhotosConsent,
    rating: genuineRating,
    reviewCount: genuineRating !== null ? Math.max(0, Number(row.review_count) || 0) : 0,
    experience: row.experience || '',
    active: !!row.active,
    // Public payloads fold availability into bookingEnabled so every website
    // template stops offering busy / on-leave staff without template changes.
    bookingEnabled: publicView ? bookingSwitchOn && availabilityStatus === 'available' : bookingSwitchOn,
    availabilityStatus,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeSalon(row, { includeOwner = false, publicView = false } = {}) {
  if (!row) return null;
  let gallery = [];
  let theme = {};
  try {
    gallery = JSON.parse(row.gallery_json || '[]');
  } catch {
    gallery = [];
  }
  try {
    theme = JSON.parse(row.theme_json || '{}');
  } catch {
    theme = {};
  }
  const out = {
    id: row.id,
    ...(publicView ? {} : { ownerId: row.owner_id }),
    name: row.name,
    slug: row.slug,
    tagline: row.tagline,
    description: row.description,
    logoUrl: row.logo_url,
    coverImage: row.cover_image,
    gallery: Array.isArray(gallery) ? gallery : [],
    phone: row.phone,
    email: row.email,
    whatsapp: row.whatsapp,
    addressLine: row.address_line,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    mapUrl: row.map_url,
    instagram: row.instagram,
    facebook: row.facebook,
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    theme: theme && typeof theme === 'object' ? theme : {},
    published: !!row.website_published,
    publishedAt: row.published_at,
    status: row.status || 'draft',
    submittedAt: row.submitted_at || null,
    approvedAt: row.approved_at || null,
    reviewNote: row.review_note || '',
    reviewedAt: row.reviewed_at || null,
    suspended: !!row.suspended,
    suspendedReason: row.suspended_reason || '',
    suspendedAt: row.suspended_at || null,
    templateId: row.template_id || 'luxe',
    timings: safeJson(row.timings_json, []),
    ownerName: row.owner_name || '',
    ownerPhone: row.owner_phone || '',
    onboardingCompleted: !!row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeOwner) {
    out.owner = {
      id: row.owner_id,
      name: row.owner_name,
      email: row.owner_email,
      status: row.owner_status,
    };
    out.subscription = row.sub_plan
      ? {
          plan: row.sub_plan,
          status: row.sub_status,
          currentPeriodEnd: row.sub_period_end,
        }
      : null;
  }
  return out;
}

export function serializeSubscription(row) {
  if (!row) return null;
  return {
    id: row.id,
    salonId: row.salon_id,
    plan: row.plan,
    status: row.status,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

export const findUserByEmail = (email) =>
  db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email);

export const findUserById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);

export const findSalonByOwner = (ownerId) =>
  db.prepare('SELECT * FROM salons WHERE owner_id = ?').get(ownerId);

export const findSalonById = (id) => db.prepare('SELECT * FROM salons WHERE id = ?').get(id);

export const findSalonBySlug = (slug) =>
  db.prepare('SELECT * FROM salons WHERE slug = ? COLLATE NOCASE').get(slug);

export const getSubscriptionForSalon = (salonId) =>
  db.prepare('SELECT * FROM subscriptions WHERE salon_id = ?').get(salonId);

export const getServicesForSalon = (salonId, { onlyActive = false } = {}) =>
  db
    .prepare(
      `SELECT * FROM services WHERE salon_id = ? ${onlyActive ? 'AND active = 1' : ''}
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(salonId);

export const getStaffForSalon = (salonId, { onlyActive = false } = {}) =>
  db
    .prepare(
      `SELECT * FROM staff WHERE salon_id = ? ${onlyActive ? 'AND active = 1' : ''}
       ORDER BY sort_order ASC, created_at ASC`
    )
    .all(salonId);

export function getSalonWithOwnerRow(salonId) {
  return db
    .prepare(
      `SELECT s.*, u.name AS owner_name, u.email AS owner_email, u.status AS owner_status,
              sub.plan AS sub_plan, sub.status AS sub_status, sub.current_period_end AS sub_period_end
       FROM salons s
       JOIN users u ON u.id = s.owner_id
       LEFT JOIN subscriptions sub ON sub.salon_id = s.id
       WHERE s.id = ?`
    )
    .get(salonId);
}

export function audit(req, action, targetType = null, targetId = null, meta = null) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (id, actor_id, actor_email, action, target_type, target_id, meta, ip, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      newId(),
      req?.user?.id || null,
      req?.user?.email || null,
      action,
      targetType,
      targetId,
      meta ? JSON.stringify(meta) : null,
      req?.ip || null,
      nowIso()
    );
  } catch (err) {
    console.error('[audit] failed', err.message);
  }
}

/* ------------------------------------------------------------------ */
/* Seed                                                               */
/* ------------------------------------------------------------------ */

function seedService(salonId, service, index) {
  db.prepare(
    `INSERT INTO services (id, salon_id, name, category, description, price_paise, duration_minutes, active, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(
    newId(),
    salonId,
    service.name,
    service.category,
    service.description,
    Math.round(service.price * 100),
    service.durationMinutes,
    index,
    nowIso(),
    nowIso()
  );
}

export function seedIfEmpty(hashPassword) {
  const settingsCount = db.prepare('SELECT COUNT(*) AS n FROM platform_settings').get().n;
  if (settingsCount === 0) {
    saveSettings(DEFAULT_SETTINGS);
  }

  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount > 0) return { seeded: false };

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@beautyzone.app').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || 'owner@luminaluxe.in').toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'Owner@12345';

  const adminId = newId();
  const ownerId = newId();
  const salonId = newId();
  const ts = nowIso();

  db.prepare(
    `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, email_verified, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, 'password', ?, 'super_admin', 'active', 1, ?, ?, ?)`
  ).run(adminId, adminEmail, hashPassword(adminPassword), 'Platform Super Admin', ts, ts, ts);

  db.prepare(
    `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, email_verified, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, 'password', ?, 'salon_owner', 'active', 1, ?, ?, ?)`
  ).run(ownerId, ownerEmail, hashPassword(ownerPassword), 'Aanya Sharma', ts, ts, ts);

  const luminaGallery = JSON.stringify([
    { url: '/images/jaipur_luxury_salon_1792644552318.jpg', caption: 'Lumina Luxe Royal Interior Studio — Jaipur' },
    { url: '/images/jaipur_royal_bride_1792647664582.jpg', caption: 'Signature Royal HD Bridal Makeover & Draping' },
    { url: '/images/luxury_hair_nanoplastia_1792647835332.jpg', caption: 'Moroccan Nanoplastia & Hair Botox Suite' },
    { url: '/images/bridal_nail_art_1792647953738.jpg', caption: 'Russian Gel Nail Extensions & 24K Gold Foil Art' },
    { url: '/images/skin_spa_treatment_1790672037475.jpg', caption: 'HydraFacial Glow Ritual Room' },
  ]);

  db.prepare(
    `INSERT INTO salons (id, owner_id, name, slug, tagline, description, logo_url, cover_image, gallery_json,
        phone, email, whatsapp, address_line, city, state, postal_code, country, map_url, instagram,
        hero_title, hero_subtitle, theme_json, website_published, published_at, onboarding_completed,
        status, approved_at, template_id, timings_json, owner_name, owner_phone, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, '', '/images/jaipur_luxury_salon_1792644552318.jpg', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, 'approved', ?, 'luxe', ?, 'Aanya Sharma', '919800012345', ?, ?)`
  ).run(
    salonId,
    ownerId,
    'Lumina Luxe',
    'lumina-luxe',
    'Luxury Salon & Bridal Studio',
    'Bespoke bridal artistry, clinical skin treatments and luxury hair care by certified master stylists.',
    luminaGallery,
    '+91 98000 12345',
    ownerEmail,
    '919800012345',
    '12 Civil Lines, Ashok Nagar',
    'Jaipur',
    'Rajasthan',
    '302001',
    'India',
    'https://maps.google.com/?q=Jaipur',
    '@luminaluxestudio',
    'Signature Bridal, Hair & Skin Luxury Studio',
    'Award-winning bridal makeovers, luxury hair couture and clinical facials in the heart of Jaipur.',
    JSON.stringify({ accent: '#D09A40', primary: '#0F172A', background: '#FAF5E5', surface: '#FFFFFF' }),
    ts,
    ts,
    JSON.stringify(DEFAULT_TIMINGS),
    ts,
    ts
  );

  const services = [
    { name: 'HD Airbrush Bridal Makeover', category: 'bridal', price: 24999, durationMinutes: 180, description: 'Long-wear HD airbrush bridal look with premium products, lashes and draping.' },
    { name: 'Balayage & Gloss Couture', category: 'hair', price: 8999, durationMinutes: 150, description: 'Hand-painted balayage with bond-building gloss and blow-dry finish.' },
    { name: 'HydraFacial Glow Ritual', category: 'skin', price: 4999, durationMinutes: 75, description: 'Deep-cleansing hydra-facial with antioxidant serum infusion.' },
    { name: 'Russian Gel Nail Extensions', category: 'nails', price: 3499, durationMinutes: 90, description: 'Precision dry-manicure and durable gel extensions with custom art.' },
    { name: 'Aroma Spa De-Stress Massage', category: 'spa', price: 3999, durationMinutes: 60, description: 'Full-body aroma therapy massage with warm oils.' },
    { name: 'Professional Bridal Makeup Course', category: 'academy', price: 45000, durationMinutes: 480, description: 'Hands-on bridal makeup certification with kit and portfolio shoot.' },
  ];
  services.forEach((s, i) => seedService(salonId, s, i));

  const staffMembers = [
    {
      name: 'Ananya Rathore',
      role_title: 'Creative Director — Bridal',
      bio: 'Celebrity bridal artist with 12+ years of editorial and luxury wedding experience across palace venues.',
      photo_url: '/images/stylist_bridal_ananya_1790677391838.jpg',
      specialties: ['HD Bridal', 'Airbrush', 'Draping', 'Polki & Veil Styling'],
      qualifications: ['Temptu USA Certified Airbrush Specialist', 'London Academy Makeup Diploma', 'Senior Bridal Academy Educator'],
      work_photos: [
        { url: '/images/bridal_makeup_jaipur_1790672008691.jpg', caption: 'Royal Palace HD Bridal Makeover' },
        { url: '/images/jaipur_royal_bride_1792647664582.jpg', caption: 'Couture Reception & Dupatta Draping' },
      ],
      work_photos_consent: 1,
      rating: 5.0,
      review_count: 420,
      experience: '12+ Years',
    },
    {
      name: 'Vikram Singh',
      role_title: 'Master Hair Stylist',
      bio: 'Balayage, bond-repair and precision-cut specialist trained in London and Milan.',
      photo_url: '/images/stylist_hair_vikram_1790677441310.jpg',
      specialties: ['Balayage', 'Keratin', 'Precision Cuts', 'Moroccan Nanoplastia'],
      qualifications: ['Toni&Guy Advanced Cut & Color Diploma', 'Olaplex Certified Master Colorist'],
      work_photos: [
        { url: '/images/hair_styling_luxe_1790672021591.jpg', caption: 'Hand-Painted French Balayage & Gloss' },
        { url: '/images/luxury_hair_nanoplastia_1792647835332.jpg', caption: 'Silk Finish Moroccan Nanoplastia' },
      ],
      work_photos_consent: 1,
      rating: 4.9,
      review_count: 310,
      experience: '11+ Years',
    },
    {
      name: 'Meera Nair',
      role_title: 'Senior Skin Therapist',
      bio: 'Clinical aesthetician focused on evidence-led facial rituals, barrier repair and pre-bridal glow care.',
      photo_url: '/images/stylist_skin_meera_1790677415028.jpg',
      specialties: ['HydraFacial', 'Peels', 'Acne Care', '24K Gold Glow'],
      qualifications: ['CIDESCO International Aesthetics Diploma', 'Clinical Dermabrasion & Facial Therapy Certification'],
      work_photos: [
        { url: '/images/skin_spa_treatment_1790672037475.jpg', caption: '7-Step HydraFacial Glow Ritual' },
        { url: '/images/prebridal_spa_ritual_1790676123541.jpg', caption: 'Pre-Bridal Botanical Spa Therapy' },
      ],
      work_photos_consent: 1,
      rating: 5.0,
      review_count: 285,
      experience: '9+ Years',
    },
    {
      name: 'Zoya Khan',
      role_title: 'Nail Couture Artist',
      bio: 'Russian dry manicure and sculpted gel extension specialist known for intricate bridal nail art.',
      photo_url: '/images/stylist_nail_zoya_1790677427488.jpg',
      specialties: ['Gel Extensions', 'Nail Art', 'Spa Manicure', 'Russian Manicure'],
      qualifications: ['International Nail Couture Diploma', 'Certified Russian E-File Manicure Specialist'],
      work_photos: [
        { url: '/images/nail_art_luxe_1790676094903.jpg', caption: 'Sculpted Gel Extensions & Foil Art' },
        { url: '/images/bridal_nail_art_1792647953738.jpg', caption: 'Bridal Swarovski & Gold Leaf Couture' },
      ],
      work_photos_consent: 1,
      rating: 4.8,
      review_count: 195,
      experience: '7+ Years',
    },
  ];
  staffMembers.forEach((m, i) => {
    db.prepare(
      `INSERT INTO staff (id, salon_id, name, role_title, bio, photo_url, specialties_json, qualifications_json, work_photos_json, work_photos_consent, rating, review_count, experience, active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(
      newId(),
      salonId,
      m.name,
      m.role_title,
      m.bio,
      m.photo_url,
      JSON.stringify(m.specialties),
      JSON.stringify(m.qualifications || []),
      JSON.stringify(m.work_photos || []),
      m.work_photos_consent ?? 0,
      m.rating,
      m.review_count,
      m.experience,
      i,
      ts,
      ts
    );
  });

  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO subscriptions (id, salon_id, plan, status, current_period_end, created_at, updated_at)
     VALUES (?, ?, 'elite', 'active', ?, ?, ?)`
  ).run(newId(), salonId, periodEnd, ts, ts);

  seedJaipurSalons(ownerId, hashPassword, ts);

  return { seeded: true, adminEmail, ownerEmail };
}

export function ensureDemoUsers(hashPassword) {
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || 'admin@beautyzone.app').toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const ownerEmail = (process.env.SEED_OWNER_EMAIL || 'owner@luminaluxe.in').toLowerCase();
  const ownerPassword = process.env.SEED_OWNER_PASSWORD || 'Owner@12345';
  const ts = nowIso();

  // Ensure Admin
  let admin = findUserByEmail(adminEmail);
  if (!admin) {
    const adminId = newId();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, email_verified, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, 'password', ?, 'super_admin', 'active', 1, ?, ?, ?)`
    ).run(adminId, adminEmail, hashPassword(adminPassword), 'Platform Super Admin', ts, ts, ts);
  } else if (admin.status !== 'active' || admin.locked_until) {
    db.prepare('UPDATE users SET status = ?, locked_until = NULL, failed_logins = 0 WHERE id = ?').run('active', admin.id);
  }

  // Ensure Owner
  let owner = findUserByEmail(ownerEmail);
  if (!owner) {
    const ownerId = newId();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, email_verified, email_verified_at, created_at, updated_at)
       VALUES (?, ?, ?, 'password', ?, 'salon_owner', 'active', 1, ?, ?, ?)`
    ).run(ownerId, ownerEmail, hashPassword(ownerPassword), 'Aanya Sharma', ts, ts, ts);
    owner = findUserByEmail(ownerEmail);
  } else if (owner.status !== 'active' || owner.locked_until) {
    db.prepare('UPDATE users SET status = ?, locked_until = NULL, failed_logins = 0 WHERE id = ?').run('active', owner.id);
  }

  // Ensure salon exists for owner
  if (owner) {
    const salon = findSalonByOwner(owner.id);
    if (!salon) {
      const salonId = newId();
      const luminaGallery = JSON.stringify([
        { url: '/images/jaipur_luxury_salon_1792644552318.jpg', caption: 'Lumina Luxe Royal Interior Studio — Jaipur' },
        { url: '/images/jaipur_royal_bride_1792647664582.jpg', caption: 'Signature Royal HD Bridal Makeover & Draping' },
        { url: '/images/luxury_hair_nanoplastia_1792647835332.jpg', caption: 'Moroccan Nanoplastia & Hair Botox Suite' },
        { url: '/images/bridal_nail_art_1792647953738.jpg', caption: 'Russian Gel Nail Extensions & 24K Gold Foil Art' },
        { url: '/images/skin_spa_treatment_1790672037475.jpg', caption: 'HydraFacial Glow Ritual Room' },
      ]);
      db.prepare(
        `INSERT INTO salons (id, owner_id, name, slug, tagline, description, logo_url, cover_image, gallery_json,
            phone, email, whatsapp, address_line, city, state, postal_code, country, map_url, instagram,
            hero_title, hero_subtitle, theme_json, website_published, published_at, onboarding_completed,
            status, approved_at, template_id, timings_json, owner_name, owner_phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '', '/images/jaipur_luxury_salon_1792644552318.jpg', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, 'approved', ?, 'luxe', ?, 'Aanya Sharma', '919800012345', ?, ?)`
      ).run(
        salonId,
        owner.id,
        'Lumina Luxe',
        'lumina-luxe',
        'Luxury Salon & Bridal Studio',
        'Bespoke bridal artistry, clinical skin treatments and luxury hair care by certified master stylists.',
        luminaGallery,
        '+91 98000 12345',
        ownerEmail,
        '919800012345',
        '12 Civil Lines, Ashok Nagar',
        'Jaipur',
        'Rajasthan',
        '302001',
        'India',
        'https://maps.google.com/?q=Jaipur',
        '@luminaluxestudio',
        'Signature Bridal, Hair & Skin Luxury Studio',
        'Award-winning bridal makeovers, luxury hair couture and clinical facials in the heart of Jaipur.',
        JSON.stringify({ accent: '#D09A40', primary: '#0F172A', background: '#FAF5E5', surface: '#FFFFFF' }),
        ts,
        ts,
        JSON.stringify(DEFAULT_TIMINGS),
        ts,
        ts
      );
      const services = [
        { name: 'HD Airbrush Bridal Makeover', category: 'bridal', price: 24999, durationMinutes: 180, description: 'Long-wear HD airbrush bridal look with premium products, lashes and draping.' },
        { name: 'Balayage & Gloss Couture', category: 'hair', price: 8999, durationMinutes: 150, description: 'Hand-painted balayage with bond-building gloss and blow-dry finish.' },
        { name: 'HydraFacial Glow Ritual', category: 'skin', price: 4999, durationMinutes: 75, description: 'Deep-cleansing hydra-facial with antioxidant serum infusion.' },
        { name: 'Russian Gel Nail Extensions', category: 'nails', price: 3499, durationMinutes: 90, description: 'Precision dry-manicure and durable gel extensions with custom art.' },
        { name: 'Aroma Spa De-Stress Massage', category: 'spa', price: 3999, durationMinutes: 60, description: 'Full-body aroma therapy massage with warm oils.' },
        { name: 'Professional Bridal Makeup Course', category: 'academy', price: 45000, durationMinutes: 480, description: 'Hands-on bridal makeup certification with kit and portfolio shoot.' },
      ];
      services.forEach((s, i) => seedService(salonId, s, i));
      const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        `INSERT OR IGNORE INTO subscriptions (id, salon_id, plan, status, current_period_end, created_at, updated_at)
         VALUES (?, ?, 'elite', 'active', ?, ?, ?)`
      ).run(newId(), salonId, periodEnd, ts, ts);
    }
  }
}

function seedJaipurSalons(ownerId, hashPassword, ts) {
  const landmarks = [
    { name: 'Rambagh Palace Luxe', slug: 'rambagh-palace-luxe', addr: 'Rambagh Palace Road' },
    { name: 'City Palace Beauty Studio', slug: 'city-palace-beauty', addr: 'City Palace Complex' },
    { name: 'Jal Mahal Spa Retreat', slug: 'jal-mahal-spa', addr: 'Jal Mahal Road' },
    { name: 'Amer Fort Elegance', slug: 'amer-fort-elegance', addr: 'Amer Road' },
    { name: 'Civil Lines Premier', slug: 'civil-lines-premier', addr: 'Civil Lines' },
    { name: 'C-Scheme Chic Salon', slug: 'c-scheme-chic', addr: 'C-Scheme' },
    { name: 'Malviya Nagar Glow', slug: 'malviya-nagar-glow', addr: 'Malviya Nagar' },
    { name: 'Raja Park Style Bar', slug: 'raja-park-style', addr: 'Raja Park' },
    { name: 'Vaishali Nagar Luxe', slug: 'vaishali-nagar-luxe', addr: 'Vaishali Nagar' },
    { name: 'Tonk Road Aesthetics', slug: 'tonk-road-aesthetics', addr: 'Tonk Road' },
  ];

  landmarks.forEach((l, i) => {
    const exists = db.prepare('SELECT 1 FROM salons WHERE slug = ?').get(l.slug);
    if (exists) return;

    const jOwnerId = newId();
    const pw = hashPassword ? hashPassword('Owner@12345') : null;
    db.prepare(
      `INSERT OR IGNORE INTO users (id, email, password_hash, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'salon_owner', ?, ?)`
    ).run(jOwnerId, `owner-${l.slug}@jaipur.salon`, pw, `Owner ${l.name}`, ts, ts);

    const salonId = newId();
    db.prepare(
      `INSERT INTO salons (id, owner_id, name, slug, tagline, description, city, state, country, status, website_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Rajasthan', 'India', 'approved', 1, ?, ?)`
    ).run(
      salonId,
      jOwnerId,
      l.name,
      l.slug,
      'Premium Salon & Spa',
      `Exquisite beauty services at ${l.addr}, Jaipur.`,
      'Jaipur',
      ts,
      ts
    );
  });
}

