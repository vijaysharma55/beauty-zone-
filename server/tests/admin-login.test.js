/**
 * Regression coverage for the deployed admin-login failure.
 *
 * 1. The login bridge resolves RBAC from public.profiles (never client data).
 * 2. Protected /api/admin/* routes survive a lost SQLite session on a Vercel
 *    cold start by verifying the Supabase bearer token directly.
 * 3. A legacy schema without profiles.status/date_of_birth still signs in.
 * 4. A deployment-configured admin email is promoted in the trusted row only.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const PERSONAS = {
  'admin-token': {
    id: '20000000-0000-4000-8000-000000000001',
    email: 'platform.admin@example.com',
    name: 'Platform Admin',
    role: 'super_admin',
    status: 'active',
    verified: true,
  },
  'owner-token': {
    id: '20000000-0000-4000-8000-000000000002',
    email: 'salon.owner@example.com',
    name: 'Salon Owner',
    role: 'salon_owner',
    status: 'active',
    verified: true,
  },
  'unverified-token': {
    id: '20000000-0000-4000-8000-000000000003',
    email: 'unconfirmed@example.com',
    name: 'Unconfirmed',
    role: 'super_admin',
    status: 'active',
    verified: false,
  },
  // Simulates a deployed schema before the new migration was applied.
  'legacy-token': {
    id: '20000000-0000-4000-8000-000000000004',
    email: 'legacy.admin@example.com',
    name: 'Legacy Admin',
    role: 'super_admin',
    status: 'active',
    verified: true,
    legacySchema: true,
  },
  'promote-admin-token': {
    id: '20000000-0000-4000-8000-000000000009',
    email: 'promote.admin@example.com',
    name: 'Promoted Admin',
    role: 'salon_owner',
    status: 'active',
    verified: true,
  },
  'ops-admin-token': {
    id: '20000000-0000-4000-8000-000000000007',
    email: 'ops.admin@example.com',
    name: 'Operations Admin',
    role: 'admin',
    status: 'active',
    verified: true,
  },
  'customer-token': {
    id: '20000000-0000-4000-8000-000000000008',
    email: 'guest@example.com',
    name: 'Guest',
    role: 'customer',
    status: 'active',
    verified: true,
  },
  'bootstrap-token': {
    id: '20000000-0000-4000-8000-000000000005',
    email: 'bootstrap.admin@example.com',
    name: 'Bootstrap Admin',
    role: 'salon_owner',
    status: 'active',
    verified: true,
  },
  // Customer rewards OTP session: a valid Supabase identity with no email.
  'phone-token': {
    id: '20000000-0000-4000-8000-000000000006',
    phone: '+919999999999',
    name: 'Customer',
    role: 'salon_owner',
    status: 'active',
    verified: true,
    phoneOnly: true,
  },
};

const promotedRoles = new Map();
let apiServer;
let mockSupabase;
let apiPort;
let mockPort;
let dataDir;

function personaForRequest(req) {
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1]?.trim();
  return PERSONAS[bearer] || null;
}

function identityFor(persona) {
  if (persona.phoneOnly) {
    return {
      id: persona.id,
      phone: persona.phone,
      phone_confirmed_at: '2026-01-01T00:00:00.000Z',
      app_metadata: { provider: 'phone' },
      user_metadata: {},
      identities: [],
    };
  }
  return {
    id: persona.id,
    email: persona.email,
    email_confirmed_at: persona.verified ? '2026-01-01T00:00:00.000Z' : null,
    confirmed_at: null,
    app_metadata: { provider: 'email' },
    user_metadata: { name: persona.name },
    identities: [],
  };
}

function profileFor(persona) {
  const role = promotedRoles.get(persona.id) || persona.role;
  const minimal = { id: persona.id, email: persona.email, name: persona.name, role };
  if (persona.legacySchema) return minimal;
  return { ...minimal, status: persona.status, date_of_birth: '1990-01-01' };
}

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
    } catch { /* still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Admin-login test API did not start in time.');
}

async function request(method, endpoint, body, { token } = {}) {
  const response = await fetch(`http://127.0.0.1:${apiPort}${endpoint}`, {
    method,
    headers: {
      Origin: `http://127.0.0.1:${apiPort}`,
      'X-Requested-With': 'beautyzone',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  return { status: response.status, data, headers: response.headers };
}

before(async () => {
  apiPort = await freePort();
  mockPort = await freePort();
  while (mockPort === apiPort) mockPort = await freePort();
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-admin-login-'));

  mockSupabase = createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const url = new URL(req.url, `http://127.0.0.1:${mockPort}`);

    if (req.method === 'GET' && url.pathname === '/auth/v1/user') {
      const persona = personaForRequest(req);
      if (!persona) { res.writeHead(401); res.end(JSON.stringify({ msg: 'bad token' })); return; }
      res.writeHead(200); res.end(JSON.stringify(identityFor(persona))); return;
    }

    if (req.method === 'GET' && url.pathname === '/rest/v1/profiles') {
      const persona = personaForRequest(req);
      if (!persona) { res.writeHead(401); res.end(JSON.stringify({ message: 'bad token' })); return; }
      const select = url.searchParams.get('select') || '';
      // PostgREST returns 400 when the deployed schema lacks a column.
      if (persona.legacySchema && (select.includes('status') || select.includes('date_of_birth'))) {
        res.writeHead(400);
        res.end(JSON.stringify({ code: '42703', message: 'column profiles.status does not exist' }));
        return;
      }
      res.writeHead(200); res.end(JSON.stringify([profileFor(persona)])); return;
    }

    if (req.method === 'PATCH' && url.pathname === '/rest/v1/profiles') {
      const id = /id=eq\.([^&]+)/.exec(url.search) ?.[1];
      const persona = Object.values(PERSONAS).find((item) => item.id === id);
      if (!persona) { res.writeHead(404); res.end('[]'); return; }
      // Guard: the API must use the server-only service role, never a user token.
      const auth = req.headers.authorization || '';
      if (!auth.includes('sb_secret_test_only')) {
        res.writeHead(401); res.end(JSON.stringify({ message: 'service role required' })); return;
      }
      let raw = '';
      req.on('data', (chunk) => { raw += chunk; });
      req.on('end', () => {
        const body = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
        promotedRoles.set(persona.id, body.role || 'super_admin');
        res.writeHead(200); res.end(JSON.stringify([profileFor(persona)]));
      });
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
      SUPABASE_SECRET_KEY: 'sb_secret_test_only',
      SUPER_ADMIN_EMAILS: 'bootstrap.admin@example.com',
      ADMIN_EMAILS: 'promote.admin@example.com',
      SUPABASE_ANON_KEY: '',
      VITE_SUPABASE_PUBLISHABLE_KEY: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
    stdio: 'ignore',
  });
  await waitForApi();
});

after(async () => {
  if (apiServer && apiServer.exitCode === null) {
    apiServer.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  if (mockSupabase) await new Promise((resolve) => mockSupabase.close(() => resolve()));
  if (dataDir) fs.rmSync(dataDir, { recursive: true, force: true });
});

test('login bridge returns the trusted super_admin role and issues a session cookie', async () => {
  const result = await request('POST', '/api/auth/supabase-session', { accessToken: 'admin-token' });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'super_admin');
  assert.equal(result.data.user.email, 'platform.admin@example.com');
  assert.ok(result.headers.get('set-cookie')?.includes('bz_session='));
});

test('legacy Supabase schema without status/date_of_birth still signs in', async () => {
  const result = await request('POST', '/api/auth/supabase-session', { accessToken: 'legacy-token' });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'super_admin');
});

test('SUPER_ADMIN_EMAILS promotes the trusted profile row via the service role', async () => {
  const result = await request('POST', '/api/auth/supabase-session', { accessToken: 'bootstrap-token' });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'super_admin');
  assert.equal(promotedRoles.get(PERSONAS['bootstrap-token'].id), 'super_admin');
});

test('unverified admin identity is rejected before any session is created', async () => {
  const result = await request('POST', '/api/auth/supabase-session', { accessToken: 'unverified-token' });
  assert.equal(result.status, 403);
  assert.match(result.data.error, /verify your email/i);
});

test('a verified admin bearer token unlocks /api/admin/overview without a session cookie', async () => {
  const result = await request('GET', '/api/admin/overview', undefined, { token: 'admin-token' });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.ok(result.data.stats);
});

test('a verified bearer token also restores /api/auth/me after a cold start', async () => {
  const result = await request('GET', '/api/auth/me', undefined, { token: 'admin-token' });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'super_admin');
});

test('a salon_owner bearer token cannot read admin data', async () => {
  const result = await request('GET', '/api/admin/overview', undefined, { token: 'owner-token' });
  assert.equal(result.status, 403, JSON.stringify(result.data));
  assert.equal(result.data.code, 'FORBIDDEN_ROLE');
});

test('protected admin routes still reject anonymous requests', async () => {
  const result = await request('GET', '/api/admin/overview');
  assert.equal(result.status, 401);
  assert.equal(result.data.code, 'AUTH_REQUIRED');
});

test('an invalid bearer token never unlocks admin data', async () => {
  const result = await request('GET', '/api/admin/overview', undefined, { token: 'not-a-real-token' });
  assert.equal(result.status, 401, JSON.stringify(result.data));
});

test('a customer phone-OTP bearer token is ignored by owner/admin auth', async () => {
  const health = await request('GET', '/api/health', undefined, { token: 'phone-token' });
  assert.equal(health.status, 200);
  const result = await request('GET', '/api/admin/overview', undefined, { token: 'phone-token' });
  assert.equal(result.status, 401, JSON.stringify(result.data));
});


test('an operational admin signs in and can read the admin console', async () => {
  const login = await request('POST', '/api/auth/supabase-session', { accessToken: 'ops-admin-token' });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.role, 'admin');
  const overview = await request('GET', '/api/admin/overview', undefined, { token: 'ops-admin-token' });
  assert.equal(overview.status, 200, JSON.stringify(overview.data));
});

test('an operational admin cannot grant roles (super-admin-only endpoint)', async () => {
  const result = await request('POST', '/api/admin/users', {
    name: 'Should Not Exist', email: 'blocked@example.com', password: 'Password123', role: 'customer',
  }, { token: 'ops-admin-token' });
  assert.equal(result.status, 403, JSON.stringify(result.data));
});

test('a customer signs in but is denied every admin endpoint', async () => {
  const login = await request('POST', '/api/auth/supabase-session', { accessToken: 'customer-token' });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.role, 'customer');
  const overview = await request('GET', '/api/admin/overview', undefined, { token: 'customer-token' });
  assert.equal(overview.status, 403, JSON.stringify(overview.data));
  assert.equal(overview.data.code, 'FORBIDDEN_ROLE');
});


test('ADMIN_EMAILS promotes a verified owner to the operational admin role', async () => {
  const result = await request('POST', '/api/auth/supabase-session', { accessToken: 'promote-admin-token' });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.user.role, 'admin');
  assert.equal(promotedRoles.get(PERSONAS['promote-admin-token'].id), 'admin');
  const overview = await request('GET', '/api/admin/overview', undefined, { token: 'promote-admin-token' });
  assert.equal(overview.status, 200, JSON.stringify(overview.data));
});
