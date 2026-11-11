import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { defaultOnboardingDraft } from '../../src/lib/onboardingSchema.js';

const PORT = 7800 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bz-onboarding-'));
let server;

before(async () => {
  server = spawn(process.execPath, ['server/index.js'], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dir, NODE_ENV: 'development', DISABLE_HMR: 'true' },
    stdio: 'ignore',
  });
  const end = Date.now() + 25_000;
  while (Date.now() < end) {
    try { if ((await fetch(`${BASE}/api/health`)).ok) return; } catch { /* starting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Test server failed to start');
});
after(async () => {
  server?.kill('SIGTERM');
  await new Promise((resolve) => setTimeout(resolve, 300));
  fs.rmSync(dir, { recursive: true, force: true });
});

function client() {
  let cookie = '';
  async function request(method, route, body, extra = {}) {
    const headers = { Origin: BASE, 'X-Requested-With': 'beautyzone', ...extra };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined && !Buffer.isBuffer(body)) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${BASE}${route}`, { method, headers, body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body) });
    const setCookie = response.headers.getSetCookie?.() || [];
    if (setCookie.length) cookie = setCookie.map((v) => v.split(';')[0]).join('; ');
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null };
  }
  return {
    get: (route) => request('GET', route),
    put: (route, body) => request('PUT', route, body),
    post: (route, body, headers) => request('POST', route, body, headers),
  };
}
const withValues = (draft, fields) => ({ ...draft, values: { ...draft.values, ...fields } });
const endpoint = '/api/salon/onboarding/draft';

test('owner drafts are durable, isolated, revisioned, and completed only after the ordered steps', async () => {
  const anon = client();
  assert.equal((await anon.get(endpoint)).status, 401);
  const alice = client();
  const bob = client();
  for (const [who, email] of [[alice, 'draft-alice@example.test'], [bob, 'draft-bob@example.test']]) {
    const registered = await who.post('/api/auth/register', { name: 'Draft Owner', email, password: 'Strong@12345', dateOfBirth: '1991-01-01' });
    assert.equal(registered.status, 201, JSON.stringify(registered.data));
  }
  assert.equal((await alice.get(endpoint)).data.draft, null);
  let draft = defaultOnboardingDraft({ name: 'Draft Owner', email: 'draft-alice@example.test' });
  let result = await alice.put(endpoint, { draft, expectedRevision: 0, ownerId: 'ignored' });
  assert.equal(result.status, 200);
  let revision = result.data.draft.revision;
  assert.equal((await bob.get(endpoint)).data.draft, null, 'another owner cannot read Alice’s draft');
  assert.equal((await alice.put(endpoint, { draft: { ...draft, currentStep: 3 }, expectedRevision: revision })).data.code, 'ONBOARDING_STEP_ORDER');
  assert.equal((await alice.put(endpoint, { draft: { ...draft, currentStep: 2 }, expectedRevision: revision })).data.code, 'ONBOARDING_STEP_ORDER');
  assert.equal((await alice.put(endpoint, { draft: withValues(draft, { city: 'Jaipur' }), expectedRevision: revision })).data.code, 'ONBOARDING_STEP_ORDER');
  assert.equal((await alice.put(endpoint, { draft, expectedRevision: 0 })).data.code, 'ONBOARDING_CONFLICT');
  assert.equal((await alice.post('/api/salon/onboarding/complete', { expectedRevision: revision })).status, 400);

  draft = withValues(draft, { name: 'Rose Studio', slug: 'rose-studio-test', tagline: 'A little glow', description: 'A welcoming salon for everyone.' });
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;
  draft = { ...draft, currentStep: 2 };
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  assert.equal(result.status, 200, JSON.stringify(result.data));
  revision = result.data.draft.revision;
  draft = withValues(draft, { addressLine: '1 Main Road', city: 'Jaipur', state: 'Rajasthan', phone: '+91 98765 43210', email: 'not-an-email' });
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;
  assert.equal((await alice.put(endpoint, { draft: { ...draft, currentStep: 3 }, expectedRevision: revision })).data.code, 'ONBOARDING_STEP_ORDER');
  draft = withValues(draft, { email: 'hello@example.test' });
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;
  draft = { ...draft, currentStep: 3 };
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;

  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  assert.equal((await alice.post('/api/salon/uploads?kind=gallery', png, { 'Content-Type': 'image/png' })).status, 409);
  const upload = await alice.post('/api/salon/uploads?kind=logo', png, { 'Content-Type': 'image/png' });
  assert.equal(upload.status, 201);
  draft = withValues(draft, { logoUrl: upload.data.url, coverImage: 'https://example.com/hero.jpg' });
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;
  draft = { ...draft, currentStep: 4 };
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;
  const reloaded = await alice.get(endpoint);
  assert.deepEqual(reloaded.data.draft.draft, draft);

  const badHours = structuredClone(draft);
  badHours.values.timings[0].close = '09:00';
  result = await alice.put(endpoint, { draft: badHours, expectedRevision: revision });
  revision = result.data.draft.revision;
  assert.equal((await alice.post('/api/salon/onboarding/complete', { expectedRevision: revision })).data.code, 'ONBOARDING_INCOMPLETE');
  result = await alice.put(endpoint, { draft, expectedRevision: revision });
  revision = result.data.draft.revision;
  const complete = await alice.post('/api/salon/onboarding/complete', { expectedRevision: revision });
  assert.equal(complete.status, 201, JSON.stringify(complete.data));
  assert.equal(complete.data.salon.slug, 'rose-studio-test');
  assert.equal(complete.data.salon.city, 'Jaipur');
  assert.equal(complete.data.salon.logoUrl, upload.data.url);
  assert.equal(complete.data.salon.onboardingCompleted, true);
  assert.equal((await alice.get('/api/salon')).data.salon.id, complete.data.salon.id);
  const retry = await alice.post('/api/salon/onboarding/complete', { expectedRevision: revision });
  assert.equal(retry.status, 200);
  assert.equal(retry.data.salon.id, complete.data.salon.id, 'retry must not create a duplicate');
  assert.equal((await bob.get(endpoint)).data.draft, null);
});
