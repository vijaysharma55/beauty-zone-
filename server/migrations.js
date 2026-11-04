import { db, nowIso } from './db.js';
import crypto from 'node:crypto';

/**
 * Lightweight, idempotent migrations for databases created by earlier builds.
 * `CREATE TABLE IF NOT EXISTS` in db.js covers fresh installs; these ALTERs
 * bring existing databases up to date without losing data.
 */

function columns(table) {
  try {
    return db.prepare(`PRAGMA table_info(${table})`).all().map((row) => row.name);
  } catch {
    return [];
  }
}

function addColumn(table, column, definition) {
  if (columns(table).includes(column)) return false;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  return true;
}

/* Supabase identity bridge: preserve existing local user IDs and salon foreign keys. */
addColumn('users', 'supabase_uid', 'TEXT');
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL');

/* Users: email verification & password reset */
const addedVerification = addColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
addColumn('users', 'email_verified_at', 'TEXT');
addColumn('users', 'email_verification_token_hash', 'TEXT');
addColumn('users', 'email_verification_expires', 'TEXT');
addColumn('users', 'password_reset_token_hash', 'TEXT');
addColumn('users', 'password_reset_expires', 'TEXT');

/* Legacy accounts predate email verification, so treat them as trusted and
   let owners resend/verify from their dashboard if they prefer. */
if (addedVerification) {
  db.prepare("UPDATE users SET email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?)").run(nowIso());
}

/* Salons: approval workflow + onboarding extras */
const addedTimings = addColumn('salons', 'timings_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('salons', 'status', "TEXT NOT NULL DEFAULT 'draft'");
addColumn('salons', 'submitted_at', 'TEXT');
addColumn('salons', 'approved_at', 'TEXT');
addColumn('salons', 'review_note', "TEXT NOT NULL DEFAULT ''");
addColumn('salons', 'reviewed_at', 'TEXT');
addColumn('salons', 'suspended', 'INTEGER NOT NULL DEFAULT 0');
addColumn('salons', 'suspended_reason', "TEXT NOT NULL DEFAULT ''");
addColumn('salons', 'suspended_at', 'TEXT');
addColumn('salons', 'template_id', "TEXT NOT NULL DEFAULT 'luxe'");
addColumn('salons', 'owner_name', "TEXT NOT NULL DEFAULT ''");
addColumn('salons', 'owner_phone', "TEXT NOT NULL DEFAULT ''");

/* Staff: online-booking availability toggle (defaults to enabled). */
addColumn('staff', 'booking_enabled', 'INTEGER NOT NULL DEFAULT 1');
db.prepare('UPDATE staff SET booking_enabled = 1 WHERE booking_enabled IS NULL').run();

/* Submitted / reviewed website versions (snapshot of the working content) */
db.exec(`
  CREATE TABLE IF NOT EXISTS salon_versions (
    id TEXT PRIMARY KEY,
    salon_id TEXT NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected','changes_requested','superseded')),
    snapshot_json TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    submitted_at TEXT NOT NULL,
    submitted_by TEXT,
    reviewed_at TEXT,
    reviewed_by TEXT,
    review_note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_salon_versions_salon ON salon_versions(salon_id, version DESC);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_salon_versions_one_pending
    ON salon_versions(salon_id) WHERE status = 'pending';
  CREATE INDEX IF NOT EXISTS idx_salon_versions_status ON salon_versions(status, submitted_at DESC);
`);

/* Appointment bookings captured from public salon websites.
   `CREATE TABLE IF NOT EXISTS` in db.js covers fresh installs. Databases
   created by earlier builds get rebuilt here so the payment lifecycle
   (`pending_payment` → `confirmed`) and its payment columns exist. */

const BOOKINGS_TABLE_SQL = `
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
    amount_paise INTEGER NOT NULL DEFAULT 0,
    advance_paise INTEGER NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'not_required',
    confirmed_at TEXT,
    status TEXT NOT NULL DEFAULT 'requested'
      CHECK (status IN ('requested','pending_payment','advance_paid','confirmed','declined','completed','cancelled','expired')),
    source TEXT NOT NULL DEFAULT 'public',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

function bookingsTableSql() {
  try {
    return db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'bookings'").get()?.sql || '';
  } catch {
    return '';
  }
}

const BOOKING_COLUMNS = [
  'id', 'salon_id', 'reference', 'full_name', 'phone', 'service', 'category', 'stylist', 'date',
  'time', 'location_type', 'branch', 'address', 'locality', 'distance_km', 'bridal_trial', 'notes',
  'promo_code', 'estimated_total', 'advance_paid', 'advance_ref', 'amount_paise', 'advance_paise',
  'payment_status', 'confirmed_at', 'status', 'source', 'created_at', 'updated_at',
];

const existingBookingSql = bookingsTableSql();
if (existingBookingSql && !existingBookingSql.includes('pending_payment')) {
  /* SQLite cannot alter a CHECK constraint, so the table is rebuilt in place.
     Foreign keys are disabled for the swap; the data is copied column by column
     and legacy rows get the payment defaults. */
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE');
    db.exec('DROP TABLE IF EXISTS bookings_payment_upgrade');
    db.exec(
      BOOKINGS_TABLE_SQL.replace('CREATE TABLE IF NOT EXISTS bookings', 'CREATE TABLE bookings_payment_upgrade')
    );
    const current = columns('bookings');
    const shared = BOOKING_COLUMNS.filter((c) => current.includes(c));
    db.exec(
      `INSERT INTO bookings_payment_upgrade (${shared.join(', ')})
       SELECT ${shared.join(', ')} FROM bookings`
    );
    db.exec('DROP TABLE bookings');
    db.exec('ALTER TABLE bookings_payment_upgrade RENAME TO bookings');
    db.exec('COMMIT');
    db.exec('PRAGMA foreign_keys = ON');
    console.log('[migrations] bookings table upgraded for the payment lifecycle');
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // nothing to roll back
    }
    try {
      db.exec('PRAGMA foreign_keys = ON');
    } catch {
      // ignore
    }
    throw err;
  }
}

db.exec(BOOKINGS_TABLE_SQL);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_bookings_salon ON bookings(salon_id, date);
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(date);
`);

/* Payment lifecycle columns for databases that already had the new statuses
   but not yet the payment bookkeeping. */
addColumn('bookings', 'amount_paise', 'INTEGER NOT NULL DEFAULT 0');
addColumn('bookings', 'advance_paise', 'INTEGER NOT NULL DEFAULT 0');
addColumn('bookings', 'payment_status', "TEXT NOT NULL DEFAULT 'not_required'");
addColumn('bookings', 'confirmed_at', 'TEXT');
db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status)');

/* Legacy rows that were already paid before this schema existed. */
db.prepare("UPDATE bookings SET payment_status = 'not_required' WHERE payment_status IS NULL OR payment_status = ''").run();
db.prepare(
  `UPDATE bookings SET amount_paise = CAST(ROUND(estimated_total * 100) AS INTEGER)
   WHERE amount_paise = 0 AND estimated_total > 0`
).run();
db.prepare(
  `UPDATE bookings SET advance_paise = CAST(ROUND(advance_paid * 100) AS INTEGER)
   WHERE advance_paise = 0 AND advance_paid > 0`
).run();
db.prepare(
  `UPDATE bookings SET payment_status = 'advance_paid'
   WHERE advance_paise > 0 AND status IN ('confirmed','advance_paid','completed')
     AND payment_status NOT IN ('advance_paid','paid')`
).run();

/* Payment orders, mock test transactions and webhook deliveries. */
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    salon_id TEXT REFERENCES salons(id) ON DELETE SET NULL,
    provider TEXT NOT NULL CHECK (provider IN ('mock','razorpay')),
    method TEXT NOT NULL DEFAULT '',
    provider_order_id TEXT NOT NULL UNIQUE,
    provider_payment_id TEXT UNIQUE,
    amount_paise INTEGER NOT NULL CHECK (amount_paise >= 0),
    total_paise INTEGER NOT NULL DEFAULT 0,
    remaining_paise INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created'
      CHECK (status IN ('created','pending','paid','failed','cancelled','expired')),
    failure_reason TEXT NOT NULL DEFAULT '',
    instrument TEXT NOT NULL DEFAULT '',
    raw_json TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

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
`);

/* Backstop against two confirmed bookings owning the same salon slot. Created
   best-effort: an older database may already contain such duplicates, in which
   case the application-level guard in the payment service still applies. */
try {
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_confirmed_slot
      ON bookings(salon_id, date, time)
      WHERE salon_id IS NOT NULL AND status IN ('confirmed','advance_paid','completed')
  `);
} catch (err) {
  console.warn('[migrations] confirmed-slot unique index skipped:', err.message);
}

/* Existing rows created before the workflow existed: treat already-published
   websites as approved so they keep serving traffic. The matching approved
   snapshot is created by backfillApprovedVersions() in workflow.js. */
export function backfillTimings(defaultTimings) {
  if (!defaultTimings) return;
  db.prepare("UPDATE salons SET timings_json = ? WHERE timings_json IS NULL OR timings_json = '' OR timings_json = '[]'").run(
    JSON.stringify(defaultTimings)
  );
}

export function backfillApprovals() {
  const rows = db.prepare('SELECT * FROM salons').all();
  for (const salon of rows) {
    const hasVersion = db.prepare('SELECT 1 FROM salon_versions WHERE salon_id = ? LIMIT 1').get(salon.id);
    if (hasVersion) continue;
    if (salon.website_published && salon.status !== 'approved') {
      db.prepare(
        "UPDATE salons SET status = 'approved', approved_at = COALESCE(approved_at, ?) WHERE id = ?"
      ).run(salon.published_at || nowIso(), salon.id);
    } else if (!salon.status) {
      db.prepare("UPDATE salons SET status = 'draft' WHERE id = ?").run(salon.id);
    }
  }
  return rows.length;
}

export function backfillJaipurSalons() {
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
  
  const ts = nowIso();
  
  landmarks.forEach((l, i) => {
    const exists = db.prepare('SELECT 1 FROM salons WHERE slug = ?').get(l.slug);
    if (exists) return;
    
    // Create a new user for each salon to satisfy UNIQUE constraint
    const ownerId = crypto.randomUUID();
    db.prepare(
        `INSERT INTO users (id, email, name, role, created_at, updated_at)
         VALUES (?, ?, ?, 'salon_owner', ?, ?)`
    ).run(ownerId, `owner${i}@jaipur.salon`, `Owner ${l.name}`, ts, ts);
    
    db.prepare(
      `INSERT INTO salons (id, owner_id, name, slug, tagline, description, city, state, country, status, website_published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Rajasthan', 'India', 'approved', 1, ?, ?)`
    ).run(
      crypto.randomUUID(),
      ownerId,
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
