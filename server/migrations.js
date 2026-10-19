import { db, nowIso } from './db.js';

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

/* Users: email verification */
const addedVerification = addColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
addColumn('users', 'email_verified_at', 'TEXT');
addColumn('users', 'email_verification_token_hash', 'TEXT');
addColumn('users', 'email_verification_expires', 'TEXT');

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
