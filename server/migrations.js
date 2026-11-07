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

/* Mandatory date of birth (private profile field). Existing accounts keep a
   NULL value and are asked to complete it on their next dashboard visit. */
addColumn('users', 'date_of_birth', 'TEXT');

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

/* ---------------------------------------------------------------------------
 * RBAC: add the `admin` and `customer` application roles.
 *
 * SQLite cannot ALTER a CHECK constraint, so databases created by older builds
 * are rebuilt in place. Foreign keys are disabled for the swap and every
 * column is copied explicitly, so existing local user IDs (and therefore the
 * salons/sessions foreign keys that reference them) are preserved.
 * ------------------------------------------------------------------------- */
const USERS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password' CHECK (auth_provider IN ('password', 'google')),
    google_sub TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'salon_owner' CHECK (role IN ('super_admin', 'admin', 'salon_owner', 'customer')),
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
    supabase_uid TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`;

const USER_COLUMNS = [
  'id', 'email', 'password_hash', 'auth_provider', 'google_sub', 'name', 'role', 'status',
  'email_verified', 'email_verified_at', 'email_verification_token_hash',
  'email_verification_expires', 'failed_logins', 'locked_until',
  'password_reset_token_hash', 'password_reset_expires', 'last_login_at',
  'date_of_birth', 'supabase_uid', 'created_at', 'updated_at',
];

function usersTableSql() {
  try {
    return db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()?.sql || '';
  } catch {
    return '';
  }
}

if (usersTableSql() && !usersTableSql().includes("'admin'")) {
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE');
    db.exec('DROP TABLE IF EXISTS users_rbac_upgrade');
    db.exec(USERS_TABLE_SQL.replace('CREATE TABLE IF NOT EXISTS users', 'CREATE TABLE users_rbac_upgrade'));
    const current = columns('users');
    const shared = USER_COLUMNS.filter((column) => current.includes(column));
    db.exec(
      `INSERT INTO users_rbac_upgrade (${shared.join(', ')})
       SELECT ${shared.join(', ')} FROM users`
    );
    db.exec('DROP TABLE users');
    db.exec('ALTER TABLE users_rbac_upgrade RENAME TO users');
    db.exec('COMMIT');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL');
    console.log('[migrations] users table upgraded for admin/customer RBAC roles');
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* nothing to roll back */ }
    try { db.exec('PRAGMA foreign_keys = ON'); } catch { /* ignore */ }
    throw err;
  }
}
db.exec(USERS_TABLE_SQL);
db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid) WHERE supabase_uid IS NOT NULL');

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

/* Staff: optional reputation + experience + rich profile details (qualifications
   and consented work photos) shown on public booking cards and inside the full
   staff profile modal. */
addColumn('staff', 'rating', 'REAL');
addColumn('staff', 'review_count', 'INTEGER NOT NULL DEFAULT 0');
addColumn('staff', 'experience', "TEXT NOT NULL DEFAULT ''");
addColumn('staff', 'qualifications_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('staff', 'work_photos_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('staff', 'work_photos_consent', 'INTEGER NOT NULL DEFAULT 0');
db.prepare("UPDATE staff SET qualifications_json = '[]' WHERE qualifications_json IS NULL OR qualifications_json = ''").run();
db.prepare("UPDATE staff SET work_photos_json = '[]' WHERE work_photos_json IS NULL OR work_photos_json = ''").run();
db.prepare('UPDATE staff SET work_photos_consent = 0 WHERE work_photos_consent IS NULL').run();

/* Staff: owner-managed availability status (available | busy | on_leave | off_duty).
   Only 'available' staff can be booked online; existing rows default to it. */
addColumn('staff', 'availability_status', "TEXT NOT NULL DEFAULT 'available'");
db.prepare(
  "UPDATE staff SET availability_status = 'available' WHERE availability_status IS NULL OR availability_status NOT IN ('available','busy','on_leave','off_duty')"
).run();

/* ---------------------------------------------------------------------------
 * Staff onboarding ("Add New Staff Member").
 *
 * Adds the identity / role / service-mapping / roster columns required by the
 * owner dashboard. Every column is additive and defaults are backfilled so
 * existing rosters keep working without a data migration step:
 *   - app_access_role defaults to 'service_provider' (least privilege)
 *   - commission_percent defaults to 15%
 *   - weekly_schedule_json defaults to an empty list, which the API resolves to
 *     the platform default week (Mon–Sat 10:00–20:00, Sunday closed)
 * ------------------------------------------------------------------------- */
addColumn('staff', 'primary_role', "TEXT NOT NULL DEFAULT ''");
addColumn('staff', 'app_access_role', "TEXT NOT NULL DEFAULT 'service_provider'");
addColumn('staff', 'commission_percent', 'REAL NOT NULL DEFAULT 15');
addColumn('staff', 'mobile_number', "TEXT NOT NULL DEFAULT ''");
addColumn('staff', 'hide_mobile_number', 'INTEGER NOT NULL DEFAULT 0');
addColumn('staff', 'service_ids_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('staff', 'weekly_schedule_json', "TEXT NOT NULL DEFAULT '[]'");
db.prepare(
  "UPDATE staff SET app_access_role = 'service_provider' WHERE app_access_role IS NULL OR app_access_role NOT IN ('manager','service_provider','receptionist')"
).run();
db.prepare("UPDATE staff SET primary_role = '' WHERE primary_role IS NULL").run();
db.prepare('UPDATE staff SET commission_percent = 15 WHERE commission_percent IS NULL').run();
db.prepare('UPDATE staff SET mobile_number = \'\' WHERE mobile_number IS NULL').run();
db.prepare('UPDATE staff SET hide_mobile_number = 0 WHERE hide_mobile_number IS NULL').run();
db.prepare("UPDATE staff SET service_ids_json = '[]' WHERE service_ids_json IS NULL OR service_ids_json = ''").run();
db.prepare("UPDATE staff SET weekly_schedule_json = '[]' WHERE weekly_schedule_json IS NULL OR weekly_schedule_json = ''").run();

/* Backfill a primary role for legacy rows that only stored a free-text title,
   so the "Primary role" dropdown never opens empty on an existing employee. */
const legacyRoleRows = db
  .prepare("SELECT id, role_title FROM staff WHERE primary_role = '' OR primary_role IS NULL")
  .all();
if (legacyRoleRows.length > 0) {
  const inferPrimaryRole = (title) => {
    const t = String(title || '').toLowerCase();
    if (t.includes('manager')) return 'salon_manager';
    if (t.includes('reception') || t.includes('front desk')) return 'receptionist';
    if (t.includes('nail')) return 'nail_artist';
    if (t.includes('spa') || t.includes('massage') || t.includes('therapist')) return 'spa_therapist';
    if (t.includes('makeup') || t.includes('make-up') || t.includes('bridal artist')) return 'makeup_artist';
    if (t.includes('junior')) return 'junior_stylist';
    if (t.includes('hairdress') || t.includes('hair dresser') || t.includes('barber')) return 'hair_dresser';
    if (t.includes('stylist') || t.includes('hair')) return 'senior_stylist';
    return '';
  };
  const updatePrimaryRole = db.prepare('UPDATE staff SET primary_role = ? WHERE id = ?');
  for (const row of legacyRoleRows) {
    const inferred = inferPrimaryRole(row.role_title);
    if (inferred) updatePrimaryRole.run(inferred, row.id);
  }
}

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
    stylist_id TEXT NOT NULL DEFAULT '',
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
    balance_policy TEXT NOT NULL DEFAULT 'at_salon',
    payment_method TEXT NOT NULL DEFAULT '',
    confirmed_at TEXT,
    status TEXT NOT NULL DEFAULT 'requested'
      CHECK (status IN ('requested','pending_payment','payment_verification_pending','payment_failed','advance_paid','confirmed','declined','completed','cancelled','expired')),
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
  'id', 'salon_id', 'reference', 'full_name', 'phone', 'service', 'category', 'stylist', 'stylist_id', 'date',
  'time', 'location_type', 'branch', 'address', 'locality', 'distance_km', 'bridal_trial', 'notes',
  'promo_code', 'estimated_total', 'advance_paid', 'advance_ref', 'amount_paise', 'advance_paise',
  'payment_status', 'balance_policy', 'payment_method', 'confirmed_at', 'status', 'source', 'created_at', 'updated_at',
];

const existingBookingSql = bookingsTableSql();
if (existingBookingSql && !existingBookingSql.includes('payment_verification_pending')) {
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
addColumn('bookings', 'balance_policy', "TEXT NOT NULL DEFAULT 'at_salon'");
addColumn('bookings', 'payment_method', "TEXT NOT NULL DEFAULT ''");
addColumn('bookings', 'confirmed_at', 'TEXT');
/* Preferred specialist captured by the booking flow (catalogue or staff id). */
addColumn('bookings', 'stylist_id', "TEXT NOT NULL DEFAULT ''");
db.exec('CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status)');

/* Canonical payment status names: the legacy 'unpaid' value becomes 'pending'. */
db.prepare("UPDATE bookings SET payment_status = 'pending' WHERE payment_status = 'unpaid'").run();

/* Per-service advance overrides (salon owners can price deposits per service). */
addColumn('services', 'advance_mode', "TEXT NOT NULL DEFAULT 'inherit'");
addColumn('services', 'advance_percent', 'REAL');
addColumn('services', 'advance_fixed_paise', 'INTEGER');

/* Salon-owner booking & advance payment settings. */
db.exec(`
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
`);

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
const PAYMENTS_TABLE_SQL = `
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
`;

const PAYMENT_COLUMNS = [
  'id', 'booking_id', 'salon_id', 'provider', 'method', 'kind', 'provider_order_id',
  'provider_payment_id', 'amount_paise', 'total_paise', 'remaining_paise', 'currency', 'status',
  'failure_reason', 'instrument', 'manual_reference', 'customer_note', 'claimed_at',
  'verified_by', 'verification_note', 'raw_json', 'verified_at', 'created_at', 'updated_at',
];

const existingPaymentsSql = (() => {
  try {
    return db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'payments'").get()?.sql || '';
  } catch {
    return '';
  }
})();

if (existingPaymentsSql && !existingPaymentsSql.includes('manual_upi')) {
  /* Extend the provider/status CHECK constraints by rebuilding in place. */
  try {
    db.exec('PRAGMA foreign_keys = OFF');
    db.exec('BEGIN IMMEDIATE');
    db.exec('DROP TABLE IF EXISTS payments_owner_upgrade');
    db.exec(PAYMENTS_TABLE_SQL.replace('CREATE TABLE IF NOT EXISTS payments', 'CREATE TABLE payments_owner_upgrade'));
    const current = columns('payments');
    const shared = PAYMENT_COLUMNS.filter((c) => current.includes(c));
    db.exec(`INSERT INTO payments_owner_upgrade (${shared.join(', ')}) SELECT ${shared.join(', ')} FROM payments`);
    db.exec('DROP TABLE payments');
    db.exec('ALTER TABLE payments_owner_upgrade RENAME TO payments');
    db.exec('COMMIT');
    db.exec('PRAGMA foreign_keys = ON');
    console.log('[migrations] payments table upgraded for owner-controlled payments');
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

db.exec(PAYMENTS_TABLE_SQL);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments(booking_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
`);
addColumn('payments', 'kind', "TEXT NOT NULL DEFAULT 'advance'");
addColumn('payments', 'manual_reference', 'TEXT');
addColumn('payments', 'customer_note', "TEXT NOT NULL DEFAULT ''");
addColumn('payments', 'claimed_at', 'TEXT');
addColumn('payments', 'verified_by', 'TEXT');
addColumn('payments', 'verification_note', "TEXT NOT NULL DEFAULT ''");
addColumn('payments', 'payment_proof_url', 'TEXT');
addColumn('payments', 'refunded_amount_paise', 'INTEGER NOT NULL DEFAULT 0');
addColumn('payments', 'refund_reference', "TEXT NOT NULL DEFAULT ''");
addColumn('payments', 'refund_reason', "TEXT NOT NULL DEFAULT ''");
addColumn('payments', 'refunded_at', 'TEXT');
addColumn('payments', 'refunded_by', 'TEXT');

/* Salon identity, instructions and optional provider linked-account metadata. */
addColumn('salon_payment_settings', 'bank_name', "TEXT NOT NULL DEFAULT ''");
addColumn('salon_payment_settings', 'payment_instructions', "TEXT NOT NULL DEFAULT ''");
addColumn('salon_payment_settings', 'verification_mode', "TEXT NOT NULL DEFAULT 'static_qr'");
addColumn('salon_payment_settings', 'provider_account_id', "TEXT NOT NULL DEFAULT ''");
addColumn('salon_payment_settings', 'provider_onboarding_status', "TEXT NOT NULL DEFAULT 'not_started'");

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_payments_salon_created ON payments(salon_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_payments_salon_status ON payments(salon_id, status);

  CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id TEXT PRIMARY KEY,
    payment_id TEXT REFERENCES payments(id) ON DELETE CASCADE,
    salon_id TEXT REFERENCES salons(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    performed_by TEXT,
    notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_payment_audit_payment ON payment_audit_logs(payment_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_payment_audit_salon ON payment_audit_logs(salon_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS payment_refunds (
    id TEXT PRIMARY KEY,
    payment_id TEXT NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    salon_id TEXT REFERENCES salons(id) ON DELETE CASCADE,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    provider_refund_id TEXT UNIQUE,
    reference TEXT NOT NULL DEFAULT '',
    reason TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('processed','recorded')),
    performed_by TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(payment_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_payment_refunds_salon ON payment_refunds(salon_id, created_at DESC);
`);

/* The bank/UTR reference is unique across active claims. The service performs
   the same check for a portable, descriptive 409 response; this index is the
   concurrency backstop. Existing rejected attempts do not block a correction. */
try {
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_manual_reference_active
    ON payments(manual_reference)
    WHERE manual_reference IS NOT NULL AND manual_reference <> ''
      AND status IN ('verification_pending', 'paid')`);
} catch (err) {
  console.warn('[migrations] active UPI-reference unique index skipped:', err.message);
}

/* Receipts + WhatsApp notification ledger. */
db.exec(`
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
`);

db.exec(`
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
