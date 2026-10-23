import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_DIR = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
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
    last_login_at TEXT,
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
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_services_salon ON services(salon_id);

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role_title TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    photo_url TEXT NOT NULL DEFAULT '',
    specialties_json TEXT NOT NULL DEFAULT '[]',
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
    advance_paid INTEGER NOT NULL DEFAULT 0,
    advance_ref TEXT,
    status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','declined','completed','cancelled')),
    source TEXT NOT NULL DEFAULT 'public',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id, date);
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);

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
`);

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

export function publicUser(row) {
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function serializeStaff(row) {
  let specialties = [];
  try {
    specialties = JSON.parse(row.specialties_json || '[]');
  } catch {
    specialties = [];
  }
  return {
    id: row.id,
    salonId: row.salon_id,
    name: row.name,
    roleTitle: row.role_title,
    bio: row.bio,
    photoUrl: row.photo_url,
    specialties: Array.isArray(specialties) ? specialties : [],
    active: !!row.active,
    bookingEnabled: row.booking_enabled === undefined || row.booking_enabled === null ? true : !!row.booking_enabled,
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
    { name: 'Ananya Rathore', role_title: 'Creative Director — Bridal', bio: 'Celebrity bridal artist with 12+ years of editorial and wedding experience.', specialties: ['HD Bridal', 'Airbrush', 'Draping'] },
    { name: 'Vikram Singh', role_title: 'Master Hair Stylist', bio: 'Balayage and precision-cut specialist trained in London and Milan.', specialties: ['Balayage', 'Keratin', 'Precision Cuts'] },
    { name: 'Meera Nair', role_title: 'Senior Skin Therapist', bio: 'Clinical aesthetician focused on evidence-led glow and acne care.', specialties: ['HydraFacial', 'Peels', 'Acne Care'] },
    { name: 'Zoya Khan', role_title: 'Nail Couture Artist', bio: 'Russian manicure and sculpted gel extension specialist.', specialties: ['Gel Extensions', 'Nail Art', 'Spa Manicure'] },
  ];
  staffMembers.forEach((m, i) => {
    db.prepare(
      `INSERT INTO staff (id, salon_id, name, role_title, bio, photo_url, specialties_json, active, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, '', ?, 1, ?, ?, ?)`
    ).run(newId(), salonId, m.name, m.role_title, m.bio, JSON.stringify(m.specialties), i, ts, ts);
  });

  const periodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO subscriptions (id, salon_id, plan, status, current_period_end, created_at, updated_at)
     VALUES (?, ?, 'elite', 'active', ?, ?, ?)`
  ).run(newId(), salonId, periodEnd, ts, ts);

  return { seeded: true, adminEmail, ownerEmail };
}
