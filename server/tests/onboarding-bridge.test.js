import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultOnboardingDraft } from '../../src/lib/onboardingSchema.js';

const uid = '12345678-1234-4234-8234-123456789abc';
const salonId = '87654321-4321-4321-8321-cba987654321';
const subscriptionId = 'fedcba98-7654-4321-8321-123456789abc';
const token = 'test-owner-token';
const dirs = [];
const servers = [];
let fake, fakeUrl, row = null, salon = null, subscription = null;
const calls = [];

before(async () => {
  fake = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    const url = new URL(req.url, 'http://fake');
    calls.push({ path: url.pathname, body, authorization: req.headers.authorization });
    res.setHeader('content-type', 'application/json');
    const send = (code, data) => { res.statusCode = code; res.end(JSON.stringify(data)); };
    if (req.headers.authorization !== `Bearer ${token}`) return send(401, { message: 'Bad token' });
    if (url.pathname === '/auth/v1/user') return send(200, {
      id: uid, email: 'bridge@example.test', email_confirmed_at: '2026-01-01T00:00:00Z',
      user_metadata: { name: 'Bridge Owner' }, app_metadata: { provider: 'email' },
    });
    if (url.pathname === '/rest/v1/profiles') return send(200, [{ id: uid, email: 'bridge@example.test', name: 'Bridge Owner', role: 'salon_owner', status: 'active', email_verified: true }]);
    if (url.pathname === '/rest/v1/onboarding_profiles') return send(200, row ? [row] : []);
    if (url.pathname === '/rest/v1/rpc/onboarding_slug_available') return send(200, { available: !salon || salon.slug !== body.p_slug, reason: null });
    if (url.pathname === '/rest/v1/rpc/save_onboarding_draft') {
      if ((row?.revision || 0) !== body.p_expected_revision) return send(409, { code: '40001', message: 'ONBOARDING_CONFLICT' });
      row = { user_id: uid, data: body.p_data, current_step: body.p_current_step, revision: body.p_expected_revision + 1, completed: false, updated_at: new Date().toISOString() };
      return send(200, row);
    }
    if (url.pathname === '/rest/v1/rpc/complete_salon_onboarding') {
      if (!row) return send(400, { code: '22023', message: 'No draft' });
      if (!row.completed && row.revision !== body.p_expected_revision) return send(409, { code: '40001', message: 'ONBOARDING_CONFLICT' });
      if (!row.completed) {
        const v = row.data.values;
        const now = new Date().toISOString();
        salon = { id: salonId, owner_id: uid, name: v.name, slug: v.slug, tagline: v.tagline, description: v.description,
          logo_url: v.logoUrl, cover_image: v.coverImage, phone: v.phone, email: v.email, address_line: v.addressLine,
          city: v.city, state: v.state, owner_name: v.ownerName, owner_phone: v.ownerPhone, template_id: v.templateId,
          timings: v.timings, onboarding_completed: true, status: 'draft', website_published: false, created_at: now, updated_at: now };
        subscription = { id: subscriptionId, salon_id: salonId, plan: 'starter', status: 'trialing', current_period_end: now, created_at: now, updated_at: now };
        row.completed = true;
        row.revision += 1;
      }
      return send(200, { salon, subscription });
    }
    return send(404, { code: 'PGRST202', message: 'Unknown endpoint' });
  });
  await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
  fakeUrl = `http://127.0.0.1:${fake.address().port}`;
});
after(async () => {
  for (const child of servers) child.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 300));
  await new Promise((resolve) => fake.close(resolve));
  dirs.forEach((dir) => fs.rmSync(dir, { recursive: true, force: true }));
});

async function boot() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-bridge-'));
  dirs.push(dir);
  const port = 8400 + Math.floor(Math.random() * 800);
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['server/index.js'], { cwd: process.cwd(), env: {
    ...process.env, PORT: String(port), DATA_DIR: dir, NODE_ENV: 'development', DISABLE_HMR: 'true',
    SUPABASE_URL: fakeUrl, SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key', SUPABASE_SECRET_KEY: '', SUPABASE_SERVICE_ROLE_KEY: '',
  }, stdio: 'ignore' });
  servers.push(child);
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${base}/api/health`)).ok) return base; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Bridge test server failed to start');
}
async function request(base, method, route, body) {
  const res = await fetch(`${base}${route}`, {
    method, headers: { Origin: base, 'X-Requested-With': 'beautyzone', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

test('Supabase draft upserts and atomic completion bridge into a fresh owner API instance', async () => {
  const base = await boot();
  let draft = defaultOnboardingDraft({ name: 'Bridge Owner', email: 'bridge@example.test' });
  draft.values = { ...draft.values, name: 'Durable Studio', slug: 'durable-studio', tagline: 'Glow together', description: 'A welcoming salon.' };

  // Link an existing local account to a stable Supabase identity. The browser
  // must namespace its backups by that identity, not this instance's local ID.
  const legacyRegistration = await fetch(`${base}/api/auth/register`, {
    method: 'POST', headers: { Origin: base, 'X-Requested-With': 'beautyzone', 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bridge Owner', email: 'bridge@example.test', password: 'Strong@12345', dateOfBirth: '1991-01-01' }),
  });
  assert.equal(legacyRegistration.status, 201);
  const legacyId = (await legacyRegistration.json()).user.id;
  assert.notEqual(legacyId, uid);

  // A cookie can outlive the Supabase browser session. A linked identity must
  // never create an unrelated SQLite draft or an ephemeral onboarding asset.
  const bridge = await fetch(`${base}/api/auth/owner/supabase-session`, {
    method: 'POST', headers: { Origin: base, 'X-Requested-With': 'beautyzone', 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken: token }),
  });
  assert.equal(bridge.status, 200);
  const linkedUser = (await bridge.json()).user;
  assert.equal(linkedUser.id, legacyId);
  assert.equal(linkedUser.supabaseUserId, uid);
  const cookie = bridge.headers.getSetCookie().map((value) => value.split(';')[0]).join('; ');
  assert.ok(cookie);
  const cookieHeaders = { Origin: base, 'X-Requested-With': 'beautyzone', Cookie: cookie };
  const withoutToken = await fetch(`${base}/api/salon/onboarding/draft`, { headers: cookieHeaders });
  assert.equal(withoutToken.status, 503);
  assert.equal((await withoutToken.json()).code, 'ONBOARDING_CONNECTION');
  const staleToken = await fetch(`${base}/api/salon/onboarding/draft`, { headers: { ...cookieHeaders, Authorization: 'Bearer invalid-token' } });
  assert.equal(staleToken.status, 503);
  const localUpload = await fetch(`${base}/api/salon/uploads?kind=logo`, {
    method: 'POST', headers: { ...cookieHeaders, 'Content-Type': 'image/png' },
    body: Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
  });
  assert.equal(localUpload.status, 503);
  const onlineUpload = await fetch(`${base}/api/salon/uploads?kind=logo`, {
    method: 'POST', headers: { ...cookieHeaders, Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' },
    body: Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'),
  });
  assert.equal(onlineUpload.status, 409);
  assert.equal((await onlineUpload.json()).code, 'ONBOARDING_USE_STORAGE');
  const oldEndpoint = await fetch(`${base}/api/salon/onboarding`, {
    method: 'POST', headers: { ...cookieHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bypass', slug: 'bypass-salon' }),
  });
  assert.equal(oldEndpoint.status, 409);
  assert.equal((await oldEndpoint.json()).code, 'ONBOARDING_REQUIRED');

  let revision = 0;
  async function save() {
    const result = await request(base, 'PUT', '/api/salon/onboarding/draft', { draft, expectedRevision: revision });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    revision = result.data.draft.revision;
  }
  await save();
  draft = { ...draft, currentStep: 2 }; await save();
  draft.values = { ...draft.values, addressLine: '1 Lake Road', city: 'Jaipur', state: 'Rajasthan', phone: '+91 98765 43210', email: 'hello@example.test' }; await save();
  draft = { ...draft, currentStep: 3 }; await save();
  draft.values = { ...draft.values, logoUrl: 'https://example.com/logo.png', coverImage: 'https://example.com/hero.jpg' }; await save();
  draft = { ...draft, currentStep: 4 }; await save();
  const completed = await request(base, 'POST', '/api/salon/onboarding/complete', { expectedRevision: revision });
  assert.equal(completed.status, 201, JSON.stringify(completed.data));
  assert.equal(completed.data.salon.id, salonId);
  assert.equal(completed.data.salon.city, 'Jaipur');
  assert.equal(row.completed, true);
  assert.ok(calls.some((call) => call.path === '/rest/v1/rpc/save_onboarding_draft' && call.authorization === `Bearer ${token}`));
  assert.equal((await request(base, 'GET', '/api/salon')).data.salon.id, salonId);

  // A second process starts with an empty SQLite store. It restores the
  // completed Supabase salon before servicing the normal owner API.
  const freshBase = await boot();
  const fresh = await request(freshBase, 'GET', '/api/salon');
  assert.equal(fresh.status, 200, JSON.stringify(fresh.data));
  assert.equal(fresh.data.salon.id, salonId);
  assert.equal(fresh.data.salon.logoUrl, 'https://example.com/logo.png');
  assert.equal(fresh.data.salon.timings.length, 7);
  const session = await request(freshBase, 'POST', '/api/auth/supabase-session', { accessToken: token });
  assert.equal(session.status, 200);
  assert.equal(session.data.salon.id, salonId);
});
