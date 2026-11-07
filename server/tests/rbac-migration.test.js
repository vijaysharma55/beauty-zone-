/**
 * SQLite users table must accept all four RBAC roles on databases created by
 * older builds. The migration rebuilds the CHECK constraint without losing
 * rows or breaking salons/sessions foreign keys.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let dataDir;
let dbFile;
let apiPort;
let apiServer;

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

async function waitForApi() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
      if (response.ok) return;
    } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Migration test API did not start');
}

before(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-rbac-migration-'));
  dbFile = path.join(dataDir, 'legacy.db');
  apiPort = await freePort();

  // A database created by an older build: only two roles allowed.
  const legacy = new DatabaseSync(dbFile);
  legacy.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT,
      auth_provider TEXT NOT NULL DEFAULT 'password',
      google_sub TEXT UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'salon_owner' CHECK (role IN ('super_admin', 'salon_owner')),
      status TEXT NOT NULL DEFAULT 'active',
      email_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE legacy_owner_notes (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      note TEXT NOT NULL
    );
    INSERT INTO users (id, email, name, role, status, created_at, updated_at)
      VALUES ('legacy-owner', 'legacy@example.com', 'Legacy Owner', 'salon_owner', 'active', '2026-01-01', '2026-01-01');
    INSERT INTO legacy_owner_notes (id, owner_id, note) VALUES ('note-legacy', 'legacy-owner', 'Keep me');
  `);
  legacy.close();

  apiServer = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATA_DIR: dataDir,
      DATABASE_PATH: dbFile,
      NODE_ENV: 'production',
      VERCEL: '',
      DISABLE_HMR: 'true',
      SUPABASE_URL: 'http://127.0.0.1:1',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
      SUPABASE_SECRET_KEY: '',
      SUPER_ADMIN_EMAILS: '',
      ADMIN_EMAILS: '',
    },
    stdio: 'ignore',
  });
  await waitForApi();
});

after(async () => {
  if (apiServer && apiServer.exitCode === null) {
    apiServer.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('the legacy users table is upgraded to the four-role CHECK constraint', () => {
  const db = new DatabaseSync(dbFile);
  const sql = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'").get()?.sql || '';
  assert.match(sql, /'admin'/);
  assert.match(sql, /'customer'/);
  db.close();
});

test('existing rows and foreign keys survive the rebuild', () => {
  const db = new DatabaseSync(dbFile);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get('legacy-owner');
  assert.ok(user);
  assert.equal(user.email, 'legacy@example.com');
  assert.equal(user.role, 'salon_owner');
  const note = db.prepare('SELECT * FROM legacy_owner_notes WHERE id = ?').get('note-legacy');
  assert.equal(note.owner_id, 'legacy-owner');
  assert.equal(note.note, 'Keep me');
  db.close();
});

test('admin and customer roles can now be persisted locally', () => {
  const db = new DatabaseSync(dbFile);
  const ts = new Date().toISOString();
  const insert = db.prepare(
    `INSERT INTO users (id, email, name, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'active', ?, ?)`
  );
  insert.run('admin-1', 'admin@example.com', 'Admin', 'admin', ts, ts);
  insert.run('customer-1', 'customer@example.com', 'Customer', 'customer', ts, ts);
  assert.equal(db.prepare('SELECT role FROM users WHERE id = ?').get('admin-1').role, 'admin');
  assert.equal(db.prepare('SELECT role FROM users WHERE id = ?').get('customer-1').role, 'customer');
  db.close();
});
