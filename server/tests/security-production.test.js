import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEST_USER_ID = '10000000-0000-4000-8000-000000000001';
const TEST_EMAIL = 'admin@beautyzone.app';

let apiServer;
let mockSupabase;
let apiPort;
let mockPort;
let dataDir;
let mockIdentity;
let mockProfile;

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
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${apiPort}/api/health`);
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Production-mode test API did not start in time.');
}

async function request(method, endpoint, body) {
  const response = await fetch(`http://127.0.0.1:${apiPort}${endpoint}`, {
    method,
    headers: {
      Origin: `http://127.0.0.1:${apiPort}`,
      'X-Requested-With': 'beautyzone',
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: response.status, data };
}

before(async () => {
  apiPort = await freePort();
  mockPort = await freePort();
  while (mockPort === apiPort) mockPort = await freePort();
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-production-auth-'));

  mockIdentity = {
    id: TEST_USER_ID,
    email: TEST_EMAIL,
    email_confirmed_at: '2026-01-01T00:00:00.000Z',
    app_metadata: { provider: 'email' },
    user_metadata: { name: 'Supabase Owner' },
    identities: [],
  };
  mockProfile = {
    id: TEST_USER_ID,
    email: TEST_EMAIL,
    name: 'Supabase Owner',
    role: 'salon_owner',
    status: 'active',
    date_of_birth: '1990-01-01',
  };

  mockSupabase = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'GET' && req.url.startsWith('/auth/v1/user')) {
      res.writeHead(200);
      res.end(JSON.stringify(mockIdentity));
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/rest/v1/profiles')) {
      res.writeHead(200);
      res.end(JSON.stringify([mockProfile]));
      return;
    }
    res.writeHead(404);
    res.end(JSON.stringify({ message: 'Mock Supabase endpoint not found.' }));
  });
  await new Promise((resolve, reject) => {
    mockSupabase.once('error', reject);
    mockSupabase.listen(mockPort, '127.0.0.1', resolve);
  });

  apiServer = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(apiPort),
      DATA_DIR: dataDir,
      NODE_ENV: 'production',
      VERCEL: '',
      DISABLE_HMR: 'true',
      SUPABASE_URL: `http://127.0.0.1:${mockPort}`,
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
      SEED_ADMIN_EMAIL: 'admin@beautyzone.app',
      SEED_ADMIN_PASSWORD: 'Admin@12345',
      SEED_OWNER_EMAIL: 'owner@luminaluxe.in',
      SEED_OWNER_PASSWORD: 'Owner@12345',
      ALLOW_DEMO_AUTH: 'true',
    },
    stdio: 'ignore',
  });
  await waitForApi();
});

after(async () => {
  if (apiServer && apiServer.exitCode === null) {
    apiServer.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (mockSupabase) {
    await new Promise((resolve) => mockSupabase.close(() => resolve()));
  }
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('production blocks default seeded admin, owner and synthetic salon-owner credentials', async () => {
  const cases = [
    { email: 'admin@beautyzone.app', password: 'Admin@12345' },
    { email: 'owner@luminaluxe.in', password: 'Owner@12345' },
    { email: 'owner0@jaipur.salon', password: 'Owner@12345' },
    { email: 'owner-lumina-luxe@jaipur.salon', password: 'Owner@12345' },
  ];
  for (const credentials of cases) {
    const result = await request('POST', '/api/auth/login', credentials);
    assert.equal(result.status, 401, `seed account must be blocked: ${credentials.email}`);
    assert.equal(result.data.error, 'Invalid email or password.');
  }
});

test('a local demo super-admin row cannot elevate a Supabase salon-owner profile', async () => {
  mockProfile = {
    ...mockProfile,
    role: 'salon_owner',
    status: 'active',
    email: TEST_EMAIL,
  };
  const result = await request('POST', '/api/auth/supabase-session', { accessToken: 'verified-test-access-token' });
  assert.equal(result.status, 200);
  assert.equal(result.data.user.role, 'salon_owner');
});

test('disabled and unverified Supabase identities cannot create application sessions', async () => {
  mockIdentity = { ...mockIdentity, email_confirmed_at: '2026-01-01T00:00:00.000Z' };
  mockProfile = { ...mockProfile, role: 'salon_owner', status: 'disabled' };
  const disabled = await request('POST', '/api/auth/supabase-session', { accessToken: 'verified-test-access-token' });
  assert.equal(disabled.status, 403);

  mockProfile = { ...mockProfile, status: 'active' };
  mockIdentity = { ...mockIdentity, email_confirmed_at: null, confirmed_at: null };
  const unverified = await request('POST', '/api/auth/supabase-session', { accessToken: 'unverified-test-access-token' });
  assert.equal(unverified.status, 403);
});

test('ALLOW_UNVERIFIED_EMAIL_LOGIN lets an unverified owner sign in, and stays off by default', async () => {
  mockProfile = { ...mockProfile, role: 'salon_owner', status: 'active' };
  mockIdentity = { ...mockIdentity, email_confirmed_at: null, confirmed_at: null };
  const previous = process.env.ALLOW_UNVERIFIED_EMAIL_LOGIN;
  try {
    delete process.env.ALLOW_UNVERIFIED_EMAIL_LOGIN;
    const blocked = await request('POST', '/api/auth/supabase-session', { accessToken: 'unverified-test-access-token' });
    assert.equal(blocked.status, 403);

    process.env.ALLOW_UNVERIFIED_EMAIL_LOGIN = 'true';
    const allowed = await request('POST', '/api/auth/supabase-session', { accessToken: 'unverified-test-access-token' });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.data.user.role, 'salon_owner');
  } finally {
    if (previous === undefined) delete process.env.ALLOW_UNVERIFIED_EMAIL_LOGIN;
    else process.env.ALLOW_UNVERIFIED_EMAIL_LOGIN = previous;
  }
});
