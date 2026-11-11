/**
 * End-to-end API tests for authentication, RBAC and tenant isolation.
 * Run with: npm run test:api
 *
 * Each run boots a real server against a throwaway SQLite database.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 6500 + Math.floor(Math.random() * 400);
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = BASE;

function nextMondayDate() {
  const date = new Date();
  const daysUntilMonday = ((1 - date.getDay() + 7) % 7) || 7;
  date.setDate(date.getDate() + daysUntilMonday);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
const TMP_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-test-'));

let child;

async function waitForServer() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error('Server did not start in time');
}

before(async () => {
  child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(PORT),
      DATA_DIR: TMP_DATA,
      NODE_ENV: 'development',
      DISABLE_HMR: 'true',
      SEED_ADMIN_EMAIL: 'admin@test.local',
      SEED_ADMIN_PASSWORD: 'Admin@12345',
      SEED_OWNER_EMAIL: 'owner@test.local',
      SEED_OWNER_PASSWORD: 'Owner@12345',
      GOOGLE_CLIENT_ID: '',
      SUPABASE_SECRET_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
    },
    stdio: 'ignore',
  });
  await waitForServer();
});

after(async () => {
  if (child) child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 500));
  fs.rmSync(TMP_DATA, { recursive: true, force: true });
});

/** Minimal cookie-aware API client. */
function makeClient() {
  let cookie = '';
  const request = async (method, path, body, extraHeaders = {}) => {
    const headers = { Origin: ORIGIN, 'X-Requested-With': 'beautyzone', ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const setCookies = res.headers.getSetCookie?.() || [];
    for (const entry of setCookies) {
      const value = entry.split(';')[0];
      if (!value || value.endsWith('=')) continue;
      cookie = cookie ? `${cookie.split('; ').filter((c) => c.split('=')[0] !== value.split('=')[0]).join('; ')}; ${value}` : value;
    }
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data, headers: res.headers };
  };
  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b, h) => request('POST', p, b, h),
    patch: (p, b, h) => request('PATCH', p, b, h),
    del: (p, h) => request('DELETE', p, undefined, h),
    getCookie: () => cookie,
    setCookie: (c) => {
      cookie = c;
    },
  };
}

async function loginAs(email, password) {
  const client = makeClient();
  const res = await client.post('/api/auth/login', { email, password });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.data)}`);
  return client;
}

/**
 * Administrator sign-in goes through the isolated super admin portal.
 * The owner portal deliberately refuses administrator accounts.
 */
async function loginAsAdmin(email, password) {
  const client = makeClient();
  const res = await client.post('/api/auth/admin/login', { email, password });
  assert.equal(res.status, 200, `admin login failed for ${email}: ${JSON.stringify(res.data)}`);
  return client;
}

let ownerClient;
let bookingForVoucherLifecycleId = null;
let ownerSalon;
let ownerServiceId;
let secondClient;

/* ------------------------------------------------------------------ */
/* Auth & RBAC                                                         */
/* ------------------------------------------------------------------ */

test('health endpoint responds', async () => {
  const res = await fetch(`${BASE}/api/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).ok, true);
});

test('unauthenticated requests are rejected', async () => {
  const client = makeClient();
  assert.equal((await client.get('/api/salon')).status, 401);
  assert.equal((await client.get('/api/admin/overview')).status, 401);
  assert.equal((await client.get('/api/auth/me')).status, 200);
  assert.equal((await client.get('/api/auth/me')).data.user, null);
});

test('seeded salon owner can sign in and read only their salon', async () => {
  ownerClient = await loginAs('owner@test.local', 'Owner@12345');
  const me = await ownerClient.get('/api/auth/me');
  assert.equal(me.data.user.role, 'salon_owner');
  assert.ok(me.data.salon?.id);
  ownerSalon = me.data.salon;
  assert.equal(me.data.onboardingRequired, false);
});

test('salon owner cannot access super admin APIs', async () => {
  for (const path of ['/api/admin/overview', '/api/admin/users', '/api/admin/salons', '/api/admin/settings']) {
    assert.equal((await ownerClient.get(path)).status, 403, path);
  }
  assert.equal((await ownerClient.patch('/api/admin/settings', { platformName: 'Hacked' })).status, 403);
});

test('super admin cannot use salon-owner-only endpoints', async () => {
  const admin = await loginAsAdmin('admin@test.local', 'Admin@12345');
  assert.equal((await admin.get('/api/salon')).status, 403);
  assert.equal((await admin.get('/api/admin/overview')).status, 200);
});

test('roles cannot be self-assigned on registration', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/register', {
    name: 'Sneaky User',
    email: 'sneaky@test.local',
    password: 'Sneaky@12345',
    dateOfBirth: '1995-06-15',
    role: 'super_admin',
  });
  assert.equal(res.status, 201);
  assert.equal(res.data.user.role, 'salon_owner');
  assert.equal(res.data.onboardingRequired, true);
});

test('weak passwords are rejected', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/register', {
    name: 'Weak User',
    email: 'weak@test.local',
    password: 'short',
    dateOfBirth: '1995-06-15',
  });
  assert.equal(res.status, 400);
});

test('duplicate email registration is rejected', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/register', {
    name: 'Owner Duplicate',
    email: 'OWNER@test.local',
    password: 'Owner@12345',
    dateOfBirth: '1995-06-15',
  });
  assert.equal(res.status, 409);
});

test('login with wrong password fails and does not leak account existence', async () => {
  const client = makeClient();
  const wrong = await client.post('/api/auth/login', { email: 'owner@test.local', password: 'Wrong@12345' });
  const unknown = await client.post('/api/auth/login', { email: 'nobody@test.local', password: 'Wrong@12345' });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.equal(wrong.data.error, unknown.data.error);
});

/* ------------------------------------------------------------------ */
/* Owner workflow + tenant isolation                                   */
/* ------------------------------------------------------------------ */

test('second owner completes onboarding with a unique live URL', async () => {
  secondClient = makeClient();
  const reg = await secondClient.post('/api/auth/register', {
    name: 'Second Owner',
    email: 'second@test.local',
    password: 'Second@12345',
    dateOfBirth: '1995-06-15',
  });
  assert.equal(reg.status, 201);

  // Reserved and already-used slugs are rejected.
  const taken = await secondClient.post('/api/salon/onboarding', { name: 'Copy Cat', slug: ownerSalon.slug });
  assert.equal(taken.status, 409);

  const reserved = await secondClient.post('/api/salon/onboarding', { name: 'Admin Salon', slug: 'admin' });
  assert.equal(reserved.status, 400);

  const ok = await secondClient.post('/api/salon/onboarding', {
    name: 'Second Studio',
    slug: 'second-studio',
    city: 'Ajmer',
    addressLine: '5 Test Road',
    phone: '+91 90000 11111',
    email: 'second@test.local',
  });
  assert.equal(ok.status, 201);
  assert.equal(ok.data.salon.slug, 'second-studio');
  assert.equal(ok.data.salon.published, false);
});

test('owner cannot read or modify another salon’s services', async () => {
  const list = await ownerClient.get('/api/salon/services');
  assert.equal(list.status, 200);
  ownerServiceId = list.data.services[0].id;
  assert.ok(ownerServiceId);

  assert.equal(
    (await secondClient.patch(`/api/salon/services/${ownerServiceId}`, { name: 'Stolen' })).status,
    404
  );
  assert.equal((await secondClient.del(`/api/salon/services/${ownerServiceId}`)).status, 404);

  const stillThere = await ownerClient.get('/api/salon/services');
  assert.ok(stillThere.data.services.some((s) => s.id === ownerServiceId && s.name !== 'Stolen'));
});

test('service CRUD works for the owning salon only', async () => {
  const created = await ownerClient.post('/api/salon/services', {
    name: 'Test Facial',
    category: 'skin',
    pricePaise: 123400,
    durationMinutes: 60,
    description: 'Test service',
  });
  assert.equal(created.status, 201);
  const id = created.data.service.id;

  const other = await secondClient.get('/api/salon/services');
  assert.ok(!other.data.services.some((s) => s.id === id));

  const updated = await ownerClient.patch(`/api/salon/services/${id}`, { pricePaise: 150000, active: false });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.service.pricePaise, 150000);
  assert.equal(updated.data.service.active, false);

  assert.equal((await ownerClient.del(`/api/salon/services/${id}`)).status, 200);
});

test('invalid service payloads are rejected', async () => {
  const bad = await ownerClient.post('/api/salon/services', { name: 'X', pricePaise: -5, durationMinutes: 0 });
  assert.equal(bad.status, 400);
  const huge = await ownerClient.post('/api/salon/services', {
    name: 'Pricey',
    pricePaise: 100,
    durationMinutes: 9999,
  });
  assert.equal(huge.status, 400);
});

test('salon owners cannot publish their own website (no self-approval)', async () => {
  // The second owner's salon is still a private draft.
  const draft = await fetch(`${BASE}/api/public/salons/second-studio`);
  assert.equal(draft.status, 404);

  // The owner publish/unpublish endpoints were removed: they fail closed.
  const before = (await ownerClient.get('/api/salon')).data.salon;
  assert.equal(before.published, true, 'the seeded salon starts live');

  for (const path of ['/api/salon/publish', '/api/salon/unpublish']) {
    const blocked = await ownerClient.post(path);
    assert.equal(blocked.status, 403, path);
    assert.equal(blocked.data.code, 'SELF_APPROVAL_FORBIDDEN', path);
  }
  const after = (await ownerClient.get('/api/salon')).data.salon;
  assert.equal(
    after.published,
    before.published,
    'a rejected publish/unpublish attempt must not change the website state'
  );
  assert.equal(after.status, before.status, 'a rejected publish attempt must not change the review status');

  // A super admin publishes the seeded, already-approved salon.
  const admin = await loginAsAdmin('admin@test.local', 'Admin@12345');
  const salons = await admin.get('/api/admin/salons');
  const seeded = salons.data.salons.find((s) => s.slug === ownerSalon.slug);
  assert.ok(seeded, 'seeded salon is visible to the console');
  const published = await admin.post(`/api/admin/salons/${seeded.id}/publish`);
  assert.equal(published.status, 200, JSON.stringify(published.data));
  assert.equal(published.data.salon.published, true);

  const live = await fetch(`${BASE}/api/public/salons/${ownerSalon.slug}`);
  assert.equal(live.status, 200);
  const body = await live.json();
  assert.equal(body.salon.slug, ownerSalon.slug);
  assert.ok(Array.isArray(body.services));
  assert.ok(body.services.every((s) => s.active), 'inactive services must not leak publicly');
  assert.equal(body.salon.ownerId, undefined, 'internal owner id must not leak publicly');

  const unpublished = await admin.post(`/api/admin/salons/${seeded.id}/unpublish`);
  assert.equal(unpublished.status, 200);
  assert.equal((await fetch(`${BASE}/api/public/salons/${ownerSalon.slug}`)).status, 404);

  await admin.post(`/api/admin/salons/${seeded.id}/publish`);
});

test('public routes never expose other salons or private data', async () => {
  const list = await fetch(`${BASE}/api/public/salons`);
  assert.equal(list.status, 200);
  const salons = (await list.json()).salons;
  assert.ok(salons.every((s) => s.slug !== 'second-studio'));
});

/* ------------------------------------------------------------------ */
/* CSRF / sessions / admin                                             */
/* ------------------------------------------------------------------ */

test('cross-origin state-changing requests are blocked', async () => {
  const res = await fetch(`${BASE}/api/salon/submit`, {
    method: 'POST',
    headers: { Origin: 'https://evil.example', Cookie: ownerClient.getCookie() },
  });
  assert.equal(res.status, 403);

  const noOrigin = await fetch(`${BASE}/api/salon/submit`, {
    method: 'POST',
    headers: { Cookie: ownerClient.getCookie() },
  });
  assert.equal(noOrigin.status, 403);
});

test('super admin can manage users, salons and settings', async () => {
  const admin = await loginAsAdmin('admin@test.local', 'Admin@12345');

  const users = await admin.get('/api/admin/users');
  assert.equal(users.status, 200);
  assert.ok(users.data.users.length >= 3);

  const target = users.data.users.find((u) => u.email === 'second@test.local');
  const disabled = await admin.patch(`/api/admin/users/${target.id}`, { status: 'disabled' });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.data.user.status, 'disabled');

  // Disabled accounts lose access immediately.
  assert.equal((await secondClient.get('/api/salon')).status, 401);

  const enabled = await admin.patch(`/api/admin/users/${target.id}`, { status: 'active' });
  assert.equal(enabled.data.user.status, 'active');

  const salons = await admin.get('/api/admin/salons');
  assert.ok(salons.data.salons.length >= 2);

  const salon = salons.data.salons.find((s) => s.slug === 'second-studio');

  // Server-side approval gate: nothing can be published before an approved version exists.
  const earlyPublish = await admin.patch(`/api/admin/salons/${salon.id}`, { published: true });
  assert.equal(earlyPublish.status, 400);
  assert.equal((await fetch(`${BASE}/api/public/salons/second-studio`)).status, 404);

  const settings = await admin.patch('/api/admin/settings', {
    platformName: 'BeautyZone Test',
    trialDays: 21,
    allowRegistrations: false,
  });
  assert.equal(settings.status, 200);
  assert.equal(settings.data.settings.platformName, 'BeautyZone Test');

  const closed = makeClient();
  const reg = await closed.post('/api/auth/register', {
    name: 'Late User',
    email: 'late@test.local',
    password: 'Late@12345',
    dateOfBirth: '1995-06-15',
  });
  assert.equal(reg.status, 403);

  await admin.patch('/api/admin/settings', { allowRegistrations: true });
});

/* ------------------------------------------------------------------ */
/* Onboarding & approval workflow                                      */
/* ------------------------------------------------------------------ */

const flow = { client: null, admin: null, salon: null, versionId: null };

test('new owners must verify their email before submitting', async () => {
  flow.client = makeClient();
  const reg = await flow.client.post('/api/auth/register', {
    name: 'Flow Owner',
    email: 'flow@test.local',
    password: 'Flow@12345',
    dateOfBirth: '1995-06-15',
  });
  assert.equal(reg.status, 201);
  assert.equal(reg.data.user.emailVerified, false);
  assert.ok(reg.data.devVerificationUrl, 'dev verification link is exposed outside production');
  flow.verificationUrl = reg.data.devVerificationUrl;

  const onboarding = await flow.client.post('/api/salon/onboarding', {
    name: 'Flow Studio',
    slug: 'flow-studio',
    city: 'Ajmer',
    addressLine: '1 Flow Road',
    phone: '+91 90000 33333',
    email: 'flow@test.local',
    ownerName: 'Flow Owner',
    ownerPhone: '+91 90000 33333',
    templateId: 'blush',
    timings: [
      { day: 'mon', open: '10:00', close: '19:00', closed: false },
      { day: 'sun', open: '11:00', close: '16:00', closed: true },
    ],
  });
  assert.equal(onboarding.status, 201);
  assert.equal(onboarding.data.salon.status, 'draft');
  assert.equal(onboarding.data.salon.templateId, 'blush');
  assert.equal(onboarding.data.salon.timings.length, 2);
  flow.salon = onboarding.data.salon;

  const rejected = await flow.client.post('/api/salon/services', {
    name: 'Signature Cut',
    category: 'hair',
    pricePaise: 45000,
    durationMinutes: 45,
  });
  assert.equal(rejected.status, 201);

  const early = await flow.client.post('/api/salon/submit');
  assert.equal(early.status, 400);
  assert.equal(early.data.code, 'EMAIL_UNVERIFIED');

  // The owner has no publish endpoint at all — publishing is a platform action.
  const publishEarly = await flow.client.post('/api/salon/publish');
  assert.equal(publishEarly.status, 403);
  assert.equal(publishEarly.data.code, 'SELF_APPROVAL_FORBIDDEN');
});

test('invalid opening hours and templates are rejected', async () => {
  const badHours = await flow.client.patch('/api/salon', {
    timings: [{ day: 'mon', open: '18:00', close: '09:00', closed: false }],
  });
  assert.equal(badHours.status, 400);
  const badTemplate = await flow.client.patch('/api/salon', { templateId: 'not-a-template' });
  assert.equal(badTemplate.status, 400);
});

test('email verification token works once', async () => {
  const token = new URL(flow.verificationUrl).searchParams.get('token');
  const ok = await flow.client.post('/api/auth/verify-email', { token });
  assert.equal(ok.status, 200);
  const me = await flow.client.get('/api/auth/me');
  assert.equal(me.data.user.emailVerified, true);

  const reused = await makeClient().post('/api/auth/verify-email', { token });
  assert.equal(reused.status, 400);
});

test('owner submits a draft and cannot publish until approved', async () => {
  const submit = await flow.client.post('/api/salon/submit');
  assert.equal(submit.status, 201);
  assert.equal(submit.data.version.status, 'pending');
  assert.equal(submit.data.salon.status, 'pending');
  flow.versionId = submit.data.version.id;

  const duplicate = await flow.client.post('/api/salon/submit');
  assert.equal(duplicate.status, 409);

  const publish = await flow.client.post('/api/salon/publish');
  assert.equal(publish.status, 403);
  assert.equal(publish.data.code, 'SELF_APPROVAL_FORBIDDEN');

  assert.equal((await fetch(`${BASE}/api/public/salons/flow-studio`)).status, 404);

  const status = await flow.client.get('/api/salon');
  assert.equal(status.data.workflow.status, 'pending');
  assert.equal(status.data.workflow.pendingVersion.id, flow.versionId);
  assert.equal(status.data.versions.length, 1);
});

test('owner cannot see another salon’s submission', async () => {
  const other = await flow.client.get('/api/salon/versions');
  assert.equal(other.status, 200);
  assert.equal(other.data.versions.length, 1);
  assert.equal(other.data.versions[0].salonId, flow.salon.id);
});

test('admin review requires a note when rejecting or requesting changes', async () => {
  flow.admin = await loginAsAdmin('admin@test.local', 'Admin@12345');
  const pending = await flow.admin.get('/api/admin/approvals?status=pending');
  assert.equal(pending.status, 200);
  assert.equal(pending.data.pendingCount, 1);
  assert.equal(pending.data.approvals[0].id, flow.versionId);
  assert.equal(pending.data.approvals[0].owner.emailVerified, true);

  const snapshot = await flow.admin.get(`/api/admin/approvals/${flow.versionId}`);
  assert.equal(snapshot.status, 200);
  assert.equal(snapshot.data.snapshot.salon.name, 'Flow Studio');
  assert.equal(snapshot.data.snapshot.salon.templateId, 'blush');
  assert.equal(snapshot.data.snapshot.services.length, 1);

  const noNote = await flow.admin.post(`/api/admin/approvals/${flow.versionId}/review`, {
    action: 'request_changes',
  });
  assert.equal(noNote.status, 400);

  const badAction = await flow.admin.post(`/api/admin/approvals/${flow.versionId}/review`, {
    action: 'publish-now',
    note: 'x',
  });
  assert.equal(badAction.status, 400);
});

test('requesting changes keeps the site offline and lets the owner resubmit', async () => {
  const review = await flow.admin.post(`/api/admin/approvals/${flow.versionId}/review`, {
    action: 'request_changes',
    note: 'Add a hero image and one more service.',
  });
  assert.equal(review.status, 200);
  assert.equal(review.data.version.status, 'changes_requested');
  assert.equal(review.data.salon.status, 'changes_requested');

  const ownerView = await flow.client.get('/api/salon');
  assert.equal(ownerView.data.workflow.status, 'changes_requested');
  assert.match(ownerView.data.workflow.reviewNote, /hero image/);
  assert.equal(ownerView.data.workflow.canSubmit, true);
  assert.equal((await fetch(`${BASE}/api/public/salons/flow-studio`)).status, 404);

  // Editing is still allowed while rejected/changes requested.
  const edit = await flow.client.patch('/api/salon', { coverImage: 'https://example.com/hero.jpg' });
  assert.equal(edit.status, 200);

  const resubmit = await flow.client.post('/api/salon/submit');
  assert.equal(resubmit.status, 201);
  assert.equal(resubmit.data.version.version, 2);
  flow.versionId = resubmit.data.version.id;
});

test('only a super admin can approve and publish the approved snapshot', async () => {
  // Approval alone must NOT make the website live.
  const approve = await flow.admin.post(`/api/admin/approvals/${flow.versionId}/review`, {
    action: 'approve',
    note: 'Looks great — approved.',
  });
  assert.equal(approve.status, 200);
  assert.equal(approve.data.version.status, 'approved');
  assert.equal(approve.data.salon.status, 'approved');
  assert.equal(approve.data.salon.published, false, 'approval grants permission, not publication');
  assert.equal(
    (await fetch(`${BASE}/api/public/salons/flow-studio`)).status,
    404,
    'an approved but unpublished website is not public'
  );

  // The owner still cannot publish it.
  const ownerPublish = await flow.client.post('/api/salon/publish');
  assert.equal(ownerPublish.status, 403);
  assert.equal(ownerPublish.data.code, 'SELF_APPROVAL_FORBIDDEN');

  // The super admin publishes it.
  const publish = await flow.admin.post(`/api/admin/salons/${flow.salon.id}/publish`);
  assert.equal(publish.status, 200, JSON.stringify(publish.data));
  assert.equal(publish.data.salon.published, true);

  const publicRes = await fetch(`${BASE}/api/public/salons/flow-studio`);
  assert.equal(publicRes.status, 200);
  const body = await publicRes.json();
  assert.equal(body.salon.name, 'Flow Studio');
  assert.equal(body.salon.coverImage, 'https://example.com/hero.jpg');
  assert.equal(body.salon.websiteVersion, 2);
  assert.equal(body.salon.status, undefined, 'moderation status is internal');
  assert.equal(body.salon.reviewNote, undefined, 'review notes must not leak publicly');
  assert.equal(body.salon.suspendedReason, undefined);
  assert.equal(body.salon.ownerId, undefined);
  assert.equal(body.services.length, 1);
});

test('edits after approval never leak until the new version is approved', async () => {
  const secret = 'SECRET-EDIT-' + Date.now();
  const edit = await flow.client.patch('/api/salon', { tagline: secret });
  assert.equal(edit.status, 200);

  const publicBody = await (await fetch(`${BASE}/api/public/salons/flow-studio`)).json();
  assert.notEqual(publicBody.salon.tagline, secret, 'unapproved edits must not be published');
  assert.equal(publicBody.salon.websiteVersion, 2);

  const ownerView = await flow.client.get('/api/salon');
  assert.equal(ownerView.data.workflow.hasUnpublishedChanges, true);

  const submit = await flow.client.post('/api/salon/submit');
  assert.equal(submit.status, 201);
  assert.equal(submit.data.version.version, 3);
  flow.versionId = submit.data.version.id;

  // Still serving the previously approved snapshot while pending.
  const stillOld = await (await fetch(`${BASE}/api/public/salons/flow-studio`)).json();
  assert.notEqual(stillOld.salon.tagline, secret);

  const approve = await flow.admin.post(`/api/admin/approvals/${flow.versionId}/review`, {
    action: 'approve',
    note: 'Approved update',
  });
  assert.equal(approve.status, 200);
  const nowLive = await (await fetch(`${BASE}/api/public/salons/flow-studio`)).json();
  assert.equal(nowLive.salon.tagline, secret);
  assert.equal(nowLive.salon.websiteVersion, 3);
});

test('rejecting keeps the owner able to edit and resubmit', async () => {
  await flow.client.patch('/api/salon', { tagline: 'Rejected edition' });
  const submit = await flow.client.post('/api/salon/submit');
  assert.equal(submit.status, 201);
  const versionId = submit.data.version.id;

  const reject = await flow.admin.post(`/api/admin/approvals/${versionId}/review`, {
    action: 'reject',
    note: 'Content does not meet our guidelines.',
  });
  assert.equal(reject.status, 200);
  assert.equal(reject.data.salon.status, 'rejected');
  assert.equal(reject.data.salon.published, false, 'rejecting takes the site offline');

  const publicStatus = await fetch(`${BASE}/api/public/salons/flow-studio`);
  assert.equal(publicStatus.status, 404);

  const ownerView = await flow.client.get('/api/salon');
  assert.equal(ownerView.data.workflow.status, 'rejected');
  assert.equal(ownerView.data.workflow.canSubmit, true);
});

test('suspension blocks publishing and public access until reinstated', async () => {
  const salons = await flow.admin.get('/api/admin/salons');
  const salon = salons.data.salons.find((s) => s.slug === 'flow-studio');

  const suspendNoReason = await flow.admin.patch(`/api/admin/salons/${salon.id}`, { suspended: true });
  assert.equal(suspendNoReason.status, 200);
  assert.ok(suspendNoReason.data.salon.suspendedReason, 'a default reason is stored');

  const suspended = await flow.admin.patch(`/api/admin/salons/${salon.id}`, {
    suspended: true,
    suspendReason: 'Policy violation reported by a client',
  });
  assert.equal(suspended.status, 200);
  assert.equal(suspended.data.salon.suspended, true);
  assert.equal(suspended.data.salon.published, false);
  assert.equal((await fetch(`${BASE}/api/public/salons/flow-studio`)).status, 404);

  const adminPublishWhileSuspended = await flow.admin.post(`/api/admin/salons/${salon.id}/publish`);
  assert.equal(adminPublishWhileSuspended.status, 400);
  assert.match(adminPublishWhileSuspended.data.error, /unsuspend/i);

  const ownerSubmit = await flow.client.post('/api/salon/submit');
  assert.equal(ownerSubmit.status, 400);
  assert.equal(ownerSubmit.data.code, 'SUSPENDED');

  const reinstated = await flow.admin.patch(`/api/admin/salons/${salon.id}`, { suspended: false });
  assert.equal(reinstated.status, 200);
  assert.equal(reinstated.data.salon.suspended, false);
});

test('admin approval decisions are recorded in the audit log', async () => {
  const logs = await flow.admin.get('/api/admin/audit-logs');
  const actions = logs.data.logs.map((entry) => entry.action);
  assert.ok(actions.includes('admin.submission_approve'));
  assert.ok(actions.includes('admin.submission_request_changes'));
  assert.ok(actions.includes('admin.submission_reject'));
  assert.ok(actions.includes('salon.submitted_for_review'));
  assert.ok(actions.includes('auth.email_verified'));
});

test('admin can inspect and edit any published website', async () => {
  const admin = await loginAsAdmin('admin@test.local', 'Admin@12345');
  const salons = await admin.get('/api/admin/salons');
  const target = salons.data.salons.find((s) => s.slug === 'lumina-luxe') || salons.data.salons[0];

  const detail = await admin.get(`/api/admin/salons/${target.id}`);
  assert.equal(detail.status, 200);
  assert.ok(Array.isArray(detail.data.services));
  assert.ok(Array.isArray(detail.data.staff));
  assert.ok(detail.data.services.length > 0, 'admin can inspect services for moderation');

  const slugTaken = await admin.patch(`/api/admin/salons/${target.id}`, { slug: 'second-studio' });
  assert.equal(slugTaken.status, 409);

  const updated = await admin.patch(`/api/admin/salons/${target.id}`, {
    tagline: 'Reviewed by platform moderation',
    city: 'Jaipur',
    email: 'hello@lumina.test',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.salon.tagline, 'Reviewed by platform moderation');

  const badEmail = await admin.patch(`/api/admin/salons/${target.id}`, { email: 'not-an-email' });
  assert.equal(badEmail.status, 400);
});

test('admin cannot disable or demote themselves', async () => {
  const admin = await loginAsAdmin('admin@test.local', 'Admin@12345');
  const me = (await admin.get('/api/auth/me')).data.user;
  assert.equal((await admin.patch(`/api/admin/users/${me.id}`, { status: 'disabled' })).status, 400);
  assert.equal((await admin.patch(`/api/admin/users/${me.id}`, { role: 'salon_owner' })).status, 400);
});

test('password change invalidates old sessions', async () => {
  const client = await loginAs('second@test.local', 'Second@12345');
  const change = await client.post('/api/auth/password', {
    currentPassword: 'Second@12345',
    newPassword: 'Second@54321',
  });
  assert.equal(change.status, 200);

  const staleCookie = secondClient.getCookie();
  const stale = await fetch(`${BASE}/api/salon`, { headers: { Cookie: staleCookie } });
  assert.equal(stale.status, 401);

  const relogin = await makeClient().post('/api/auth/login', {
    email: 'second@test.local',
    password: 'Second@54321',
  });
  assert.equal(relogin.status, 200);
});

test('logout clears the session', async () => {
  const client = await loginAs('second@test.local', 'Second@54321');
  assert.equal((await client.get('/api/salon')).status, 200);
  assert.equal((await client.post('/api/auth/logout')).status, 200);
  assert.equal((await client.get('/api/salon')).status, 401);
});

test('Google sign-in reports configuration state safely', async () => {
  const res = await fetch(`${BASE}/api/auth/google/config`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(typeof body.enabled, 'boolean');
  // Without GOOGLE_CLIENT_ID the server must refuse rather than trust a client token.
  const attempt = await makeClient().post('/api/auth/google', { credential: 'fake' });
  assert.equal(attempt.status, 503);
});

/* ------------------------------------------------------------------ */
/* Subdomain tenant resolution, availability, bookings & AI fallbacks  */
/* ------------------------------------------------------------------ */

test('tenant resolution answers safely for every host shape', async () => {
  const plain = await fetch(`${BASE}/api/public/tenant`);
  assert.equal(plain.status, 200);
  const body = await plain.json();
  assert.equal(body.tenant.found, false);

  // Known live salon via explicit override (simulates a subdomain host).
  const live = await (await fetch(`${BASE}/api/public/tenant?slug=lumina-luxe`)).json();
  assert.equal(live.tenant.found, true);
  assert.equal(live.tenant.slug, 'lumina-luxe');
  assert.ok(live.tenant.salonId);

  // Unknown slug must not leak anything and must not throw.
  const missing = await (await fetch(`${BASE}/api/public/tenant?slug=definitely-not-a-salon`)).json();
  assert.equal(missing.tenant.found, false);
  assert.equal(missing.tenant.reason, 'not_found');

  // Malformed slug is ignored rather than crashing the route.
  const malformed = await (await fetch(`${BASE}/api/public/tenant?slug=${encodeURIComponent('..')}`)).json();
  assert.equal(malformed.tenant.found, false);
});

test('availability returns slots and degrades gracefully', async () => {
  const ok = await fetch(`${BASE}/api/public/availability?date=2026-10-20&slug=lumina-luxe`);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.closed, false);
  assert.ok(Array.isArray(body.slots));
  assert.ok(body.slots.length > 0, 'slots generated from opening hours');
  assert.equal(body.slots[0].value, '10:00');
  assert.ok(body.slots.every((s) => s.value < '20:00'));

  // No slug → platform default hours, still succeeds.
  const dflt = await (await fetch(`${BASE}/api/public/availability?date=2026-10-20`)).json();
  assert.ok(dflt.slots.length > 0);
  assert.equal(dflt.source, 'default');

  // Garbage date → well-formed empty result, never a 500.
  const bad = await fetch(`${BASE}/api/public/availability?date=nonsense`);
  assert.equal(bad.status, 200);
  const badBody = await bad.json();
  assert.deepEqual(badBody.slots, []);
  assert.equal(badBody.reason, 'invalid_date');
});

test('visitor can book a live salon and the owner sees it', async () => {
  const anon = makeClient();
  const created = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: 'Test Client',
    phone: '+91 90000 11111',
    service: 'HD Airbrush Bridal Makeover',
    date: nextMondayDate(),
    time: '02:30 PM',
    locationType: 'salon',
    estimatedTotal: 24999,
  });
  assert.equal(created.status, 201);
  bookingForVoucherLifecycleId = created.data.booking.id;
  assert.ok(created.data.booking.reference, 'booking reference issued');
  // 12-hour input is normalised to 24-hour storage.
  assert.equal(created.data.booking.time, '14:30');
  // An advance is due, so the booking starts unconfirmed.
  assert.equal(created.data.booking.status, 'pending_payment');
  assert.equal(created.data.payment.required, true);

  const owner = ownerClient;
  const list = await owner.get('/api/salon/bookings');
  assert.equal(list.status, 200);
  assert.ok(list.data.bookings.some((b) => b.reference === created.data.booking.reference));

  // Payment protection: the owner cannot confirm an unpaid booking.
  const blocked = await owner.patch(`/api/salon/bookings/${created.data.booking.id}`, { status: 'confirmed' });
  assert.equal(blocked.status, 409);

  // Complete a mock test payment (development mode defaults to mock payments).
  const order = await anon.post('/api/public/payments/orders', { bookingId: created.data.booking.id });
  assert.equal(order.status, 201);
  const checkout = await anon.post('/api/public/payments/mock/checkout', {
    orderId: order.data.payment.id,
    method: 'upi',
    upiId: 'success@mockupi',
  });
  assert.equal(checkout.status, 200);
  const paid = await anon.post('/api/public/payments/mock/complete', {
    orderId: order.data.payment.id,
    transactionId: checkout.data.transactionId,
  });
  assert.equal(paid.status, 200);
  assert.equal(paid.data.booking.status, 'confirmed');

  const confirm = await owner.patch(`/api/salon/bookings/${created.data.booking.id}`, { status: 'confirmed' });
  assert.equal(confirm.status, 200);
  assert.equal(confirm.data.booking.status, 'confirmed');

  const missingFinalBill = await owner.patch(`/api/salon/bookings/${created.data.booking.id}`, { status: 'completed' });
  assert.equal(missingFinalBill.status, 400, 'owner cannot complete without an actual final bill');

  const completed = await owner.patch(`/api/salon/bookings/${created.data.booking.id}`, {
    status: 'completed',
    finalBillAmount: 17650,
  });
  assert.equal(completed.status, 200);
  assert.equal(completed.data.booking.status, 'completed');
  assert.equal(completed.data.booking.finalBillAmount, 17650);
  assert.equal(completed.data.booking.loyaltyAwardStatus, 'failed');
  assert.equal(completed.data.loyaltyReward.awarded, false);
  assert.equal(completed.data.loyaltyReward.retryable, true);
  assert.match(completed.data.loyaltyReward.message, /Supabase profile|owner identity/i);

  const retryAward = await owner.post(`/api/salon/bookings/${created.data.booking.id}/loyalty/retry`);
  assert.equal(retryAward.status, 200);
  assert.equal(retryAward.data.booking.finalBillAmount, 17650);
  assert.equal(retryAward.data.booking.loyaltyAwardStatus, 'failed');
  assert.equal(retryAward.data.loyaltyReward.awarded, false);

  const attemptedBillChange = await owner.patch(`/api/salon/bookings/${created.data.booking.id}`, {
    status: 'completed',
    finalBillAmount: 19999,
  });
  assert.equal(attemptedBillChange.status, 409);
  assert.equal(attemptedBillChange.data.code, 'FINAL_BILL_LOCKED');

  const badStatus = await owner.patch(`/api/salon/bookings/${created.data.booking.id}`, { status: 'explode' });
  assert.equal(badStatus.status, 400);
});

test('cancelled bookings mark voucher release failure and expose an owner retry path', async () => {
  assert.ok(bookingForVoucherLifecycleId, 'reuses the booking created by the payment lifecycle test');

  // Simulate a voucher reservation already committed to Supabase. Reuse the
  // existing booking record so this test does not consume another public
  // booking rate-limit slot.
  const testDb = new DatabaseSync(path.join(TMP_DATA, 'beautyzone.db'));
  try {
    testDb.exec('PRAGMA busy_timeout = 5000');
    testDb.prepare(
      `UPDATE bookings
       SET status = 'confirmed',
           final_bill_amount = NULL,
           loyalty_award_status = 'not_awarded',
           loyalty_points_awarded = 0,
           loyalty_award_error = '',
           promo_code = ?,
           loyalty_voucher_status = 'reserved',
           loyalty_voucher_error = ''
       WHERE id = ?`
    ).run('VIP-500-2346-TEST0001', bookingForVoucherLifecycleId);
  } finally {
    testDb.close();
  }

  const owner = ownerClient;
  const cancelled = await owner.patch(`/api/salon/bookings/${bookingForVoucherLifecycleId}`, { status: 'cancelled' });
  assert.equal(cancelled.status, 200);
  assert.equal(cancelled.data.booking.status, 'cancelled');
  assert.equal(cancelled.data.booking.loyaltyVoucherStatus, 'release_failed');
  assert.equal(cancelled.data.voucherRelease.released, false);
  assert.equal(cancelled.data.voucherRelease.retryable, true);

  const retry = await owner.post(`/api/salon/bookings/${bookingForVoucherLifecycleId}/loyalty/voucher/release`);
  assert.equal(retry.status, 200);
  assert.equal(retry.data.booking.loyaltyVoucherStatus, 'release_failed');
  assert.equal(retry.data.voucherRelease.released, false);

  const restore = await owner.patch(`/api/salon/bookings/${bookingForVoucherLifecycleId}`, { status: 'requested' });
  assert.equal(restore.status, 409);
  assert.equal(restore.data.code, 'VOUCHER_RESERVATION_CLOSED');
});

test('preferred specialist is validated, stored and returned with the booking', async () => {
  const anon = makeClient();
  const detail = await (await fetch(`${BASE}/api/public/salons/lumina-luxe`)).json();
  const member = detail.staff[0];
  assert.ok(member, 'the public salon exposes its team');
  assert.equal(typeof member.rating, 'number');
  assert.ok(member.reviewCount > 0);
  assert.ok(member.experience, 'experience is published for the profile modal');

  const created = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: 'Stylist Choice Client',
    phone: '9000012345',
    service: 'HD Airbrush Bridal Makeover',
    date: nextMondayDate(),
    time: '04:00 PM',
    locationType: 'salon',
    stylist: member.name,
    stylistId: member.id,
  });
  assert.equal(created.status, 201);
  assert.equal(created.data.booking.stylist, member.name);
  assert.equal(created.data.booking.stylistId, member.id);

  // An unknown roster id must never block a booking — the typed name is kept.
  const fallback = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: 'Stylist Choice Client',
    phone: '9000012345',
    service: 'HD Airbrush Bridal Makeover',
    date: nextMondayDate(),
    time: '05:00 PM',
    locationType: 'salon',
    stylist: 'Guest Artist',
    stylistId: 'not-a-real-staff-id',
  });
  assert.equal(fallback.status, 201);
  assert.equal(fallback.data.booking.stylist, 'Guest Artist');
  assert.equal(fallback.data.booking.stylistId, '');
});

test('booking rejects closed days, past dates and unknown salons', async () => {
  const anon = makeClient();
  const base = {
    slug: 'lumina-luxe',
    fullName: 'Test Client',
    phone: '9000011111',
    service: 'HD Makeup',
  };

  const past = await anon.post('/api/public/bookings', { ...base, date: '2020-01-01', time: '10:00' });
  assert.equal(past.status, 400);

  const outOfHours = await anon.post('/api/public/bookings', { ...base, date: nextMondayDate(), time: '03:00 AM' });
  assert.equal(outOfHours.status, 409);

  const unknown = await anon.post('/api/public/bookings', {
    ...base,
    slug: 'no-such-salon-xyz',
    date: nextMondayDate(),
    time: '10:00',
  });
  assert.equal(unknown.status, 404);

  const noName = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: '',
    phone: '9000011111',
    service: 'HD Makeup',
    date: nextMondayDate(),
    time: '10:00',
  });
  assert.equal(noName.status, 400);
});

test('owner cannot touch another salon’s bookings', async () => {
  const owner = await loginAs('owner@test.local', 'Owner@12345');
  const mine = await owner.get('/api/salon/bookings');
  assert.equal(mine.status, 200);

  const second = await loginAs('second@test.local', 'Second@54321');
  const theirs = await second.get('/api/salon/bookings');
  assert.equal(theirs.status, 200);
  // The two owners own different salons — no booking ids may overlap.
  const mineIds = new Set(mine.data.bookings.map((b) => b.id));
  assert.ok(theirs.data.bookings.every((b) => !mineIds.has(b.id)));

  // Forging an id from the other salon returns 404 and changes nothing.
  if (mine.data.bookings.length > 0) {
    const forged = await second.patch(`/api/salon/bookings/${mine.data.bookings[0].id}`, { status: 'cancelled' });
    assert.equal(forged.status, 404);
  }
});

test('AI endpoints answer with graceful fallbacks when no provider is configured', async () => {
  // GOOGLE_CLIENT_ID is blank in tests; GEMINI_API_KEY is unset, so the
  // deterministic fallback must keep every endpoint usable.
  const status = await (await fetch(`${BASE}/api/ai/status`)).json();
  assert.equal(typeof status.configured, 'boolean');
  assert.equal(status.fallbackEnabled, true);

  const taglines = await makeClient().post('/api/ai/taglines', { name: 'Festive Bridal Glow', count: 3 });
  assert.equal(taglines.status, 200);
  assert.equal(taglines.data.taglines.length, 3);
  assert.ok(['ai', 'fallback', 'ai+fallback'].includes(taglines.data.source));

  const description = await makeClient().post('/api/ai/description', {
    name: 'HydraFacial Glow',
    category: 'skin',
    durationMinutes: 75,
  });
  assert.equal(description.status, 200);
  assert.ok(description.data.description.length > 20);

  // Validation still applies before any model call.
  const missing = await makeClient().post('/api/ai/taglines', { name: '' });
  assert.equal(missing.status, 400);

  // Unknown AI routes answer 404 instead of hanging.
  const unknown = await fetch(`${BASE}/api/ai/does-not-exist`);
  assert.equal(unknown.status, 404);
});

test('salon tagline suggestions need a signed-in user and always return three options', async () => {
  // The model sits behind the session: visitors cannot spend the AI budget.
  const anonymous = await makeClient().post('/api/ai/salon-taglines', { name: 'Velvet Rose Atelier' });
  assert.equal(anonymous.status, 401);

  const suggestions = await ownerClient.post('/api/ai/salon-taglines', { name: 'Velvet Rose Atelier' });
  assert.equal(suggestions.status, 200);
  assert.ok(['ai', 'fallback', 'ai+fallback'].includes(suggestions.data.source));
  assert.ok(Array.isArray(suggestions.data.warnings));
  assert.equal(suggestions.data.taglines.length, 3);
  assert.equal(new Set(suggestions.data.taglines).size, 3, 'options are distinct');
  for (const tagline of suggestions.data.taglines) {
    assert.equal(typeof tagline, 'string');
    assert.ok(tagline.trim().split(/\s+/).length <= 10, `"${tagline}" is at most 10 words`);
    assert.ok(tagline.length <= 160, `"${tagline}" fits the salon tagline field`);
  }

  // Validation still applies before any model call.
  assert.equal((await ownerClient.post('/api/ai/salon-taglines', { name: '' })).status, 400);
  assert.equal((await ownerClient.post('/api/ai/salon-taglines', {})).status, 400);
});

test('salon description suggestions need a signed-in user and return one option per tone', async () => {
  const body = { name: 'Velvet Rose Atelier', tagline: 'Step In. Bloom Out.' };
  const anonymous = await makeClient().post('/api/ai/salon-descriptions', body);
  assert.equal(anonymous.status, 401);

  const suggestions = await ownerClient.post('/api/ai/salon-descriptions', body);
  assert.equal(suggestions.status, 200);
  assert.ok(['ai', 'fallback', 'ai+fallback'].includes(suggestions.data.source));
  assert.ok(Array.isArray(suggestions.data.warnings));
  assert.equal(suggestions.data.descriptions.length, 3);
  assert.equal(new Set(suggestions.data.descriptions).size, 3, 'options are distinct');
  for (const description of suggestions.data.descriptions) {
    assert.equal(typeof description, 'string');
    const wordCount = description.trim().split(/\s+/).length;
    assert.ok(wordCount >= 30 && wordCount <= 90, `"${description}" is about 45-65 words (${wordCount})`);
    assert.ok(description.length <= 3000, 'fits the salon description field');
    assert.doesNotMatch(description, /[*_#`]|\n/, 'plain text, one paragraph');
  }

  // The selected tagline is part of the brief, so it is required as well.
  assert.equal((await ownerClient.post('/api/ai/salon-descriptions', { name: body.name })).status, 400);
  assert.equal((await ownerClient.post('/api/ai/salon-descriptions', { tagline: body.tagline })).status, 400);
});

test('specialist online-booking switch round-trips and stays tenant-scoped', async () => {
  const owner = await loginAs('owner@test.local', 'Owner@12345');
  const list = await owner.get('/api/salon/staff');
  assert.equal(list.status, 200);
  assert.ok(list.data.staff.length > 0);
  const member = list.data.staff[0];

  // Defaults to enabled.
  assert.equal(member.bookingEnabled, true);

  const off = await owner.patch(`/api/salon/staff/${member.id}`, { bookingEnabled: false });
  assert.equal(off.status, 200);
  assert.equal(off.data.staff.bookingEnabled, false);

  // The other owner must not be able to flip it back.
  const other = await loginAs('second@test.local', 'Second@54321');
  const forged = await other.patch(`/api/salon/staff/${member.id}`, { bookingEnabled: true });
  assert.equal(forged.status, 404);

  // Still off after the failed cross-tenant attempt.
  const after = await owner.get('/api/salon/staff');
  assert.equal(after.data.staff.find((s) => s.id === member.id).bookingEnabled, false);

  const on = await owner.patch(`/api/salon/staff/${member.id}`, { bookingEnabled: true });
  assert.equal(on.status, 200);
  assert.equal(on.data.staff.bookingEnabled, true);

  // --- Availability status (reuses this test's logins to stay under the login rate limit) ---
  assert.equal(member.availabilityStatus, 'available');

  const busy = await owner.patch(`/api/salon/staff/${member.id}`, { availabilityStatus: 'busy' });
  assert.equal(busy.status, 200);
  assert.equal(busy.data.staff.availabilityStatus, 'busy');

  const leave = await owner.patch(`/api/salon/staff/${member.id}`, { availabilityStatus: 'on_leave' });
  assert.equal(leave.status, 200);
  assert.equal(leave.data.staff.availabilityStatus, 'on_leave');

  // Unknown statuses are rejected and do not change the stored value.
  const invalidStatus = await owner.patch(`/api/salon/staff/${member.id}`, { availabilityStatus: 'vacation' });
  assert.equal(invalidStatus.status, 400);
  const afterInvalid = await owner.get('/api/salon/staff');
  assert.equal(afterInvalid.data.staff.find((s) => s.id === member.id).availabilityStatus, 'on_leave');

  // The other owner must not be able to change it.
  const forgedStatus = await other.patch(`/api/salon/staff/${member.id}`, { availabilityStatus: 'available' });
  assert.equal(forgedStatus.status, 404);

  // New staff accept a status and default to 'available' otherwise.
  const createdBusy = await owner.post('/api/salon/staff', {
    name: 'Availability Tester',
    roleTitle: 'Stylist',
    specialties: ['Haircut'],
    availabilityStatus: 'busy',
  });
  assert.equal(createdBusy.status, 201);
  assert.equal(createdBusy.data.staff.availabilityStatus, 'busy');
  const createdDefault = await owner.post('/api/salon/staff', { name: 'Default Status Tester', specialties: [] });
  assert.equal(createdDefault.status, 201);
  assert.equal(createdDefault.data.staff.availabilityStatus, 'available');

  // Cleanup so other tests keep a stable roster.
  await owner.del(`/api/salon/staff/${createdBusy.data.staff.id}`);
  await owner.del(`/api/salon/staff/${createdDefault.data.staff.id}`);
  await owner.patch(`/api/salon/staff/${member.id}`, { availabilityStatus: 'available' });
});

/* ------------------------------------------------------------------ */
/* Staff Profiles, Consent, Demo Protection & Publishing Lock          */
/* ------------------------------------------------------------------ */

test('rich staff profile CRUD, work-photo consent gating and live public reflection', async () => {
  const owner = await loginAs('owner@test.local', 'Owner@12345');
  const anon = makeClient();

  // 1. Add a staff member with qualifications, genuine rating and unconsented work photos.
  const created = await owner.post('/api/salon/staff', {
    name: 'Rhea Deshmukh',
    roleTitle: 'Senior Nail & Couture Artist',
    bio: 'Specialist in sculpted gel extensions and hand-painted bridal nail art.',
    photoUrl: '/images/bridal_nail_art_1792647953738.jpg',
    experience: '6+ Years',
    rating: 4.9,
    reviewCount: 44,
    specialties: ['Gel Extensions', 'Bridal Nail Art', 'Chrome Finish'],
    qualifications: ['International Nail Tech Diploma', 'Hygiene & Sterilization Certified'],
    workPhotos: [
      { url: '/images/bridal_nail_art_1792647953738.jpg', caption: 'Royal Bridal Nail Set' },
    ],
    workPhotosConsent: false,
    active: true,
    bookingEnabled: true,
  });
  assert.equal(created.status, 201);
  const staffId = created.data.staff.id;
  assert.deepEqual(created.data.staff.qualifications, [
    'International Nail Tech Diploma',
    'Hygiene & Sterilization Certified',
  ]);
  assert.equal(created.data.staff.workPhotos.length, 1);
  assert.equal(created.data.staff.workPhotosConsent, false);

  // 2. Owner dashboard returns stored workPhotos while public live endpoint hides them without consent.
  const pubBeforeConsent = await anon.get('/api/public/salons/lumina-luxe');
  assert.equal(pubBeforeConsent.status, 200);
  const publicMemberNoConsent = pubBeforeConsent.data.staff.find((s) => s.id === staffId);
  assert.ok(publicMemberNoConsent, 'newly added staff appears automatically on live public salon site');
  assert.equal(publicMemberNoConsent.name, 'Rhea Deshmukh');
  assert.equal(publicMemberNoConsent.roleTitle, 'Senior Nail & Couture Artist');
  assert.equal(publicMemberNoConsent.rating, 4.9);
  assert.deepEqual(publicMemberNoConsent.workPhotos, [], 'unconsented work photos must never be exposed publicly');
  assert.equal(publicMemberNoConsent.workPhotosConsent, false);

  // 3. Enabling workPhotosConsent exposes consented work photos immediately on public profiles; clearing rating omits rating.
  const updated = await owner.patch(`/api/salon/staff/${staffId}`, {
    workPhotosConsent: true,
    rating: 0,
    reviewCount: 0,
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.data.staff.workPhotosConsent, true);
  assert.equal(updated.data.staff.rating, null, 'zero rating normalizes to null so no fake rating renders');

  const pubAfterConsent = await anon.get('/api/public/salons/lumina-luxe');
  const publicMemberWithConsent = pubAfterConsent.data.staff.find((s) => s.id === staffId);
  assert.equal(publicMemberWithConsent.workPhotosConsent, true);
  assert.equal(publicMemberWithConsent.workPhotos.length, 1);
  assert.equal(publicMemberWithConsent.workPhotos[0].caption, 'Royal Bridal Nail Set');
  assert.equal(publicMemberWithConsent.rating, null);

  // 4. Removing the staff member removes them immediately from the public website.
  const delRes = await owner.del(`/api/salon/staff/${staffId}`);
  assert.equal(delRes.status, 200);
  const pubAfterDelete = await anon.get('/api/public/salons/lumina-luxe');
  assert.equal(pubAfterDelete.data.staff.some((s) => s.id === staffId), false);
});

test('demo staff profiles can never be saved or booked', async () => {
  const owner = await loginAs('owner@test.local', 'Owner@12345');
  const anon = makeClient();

  const saveDemoFlag = await owner.post('/api/salon/staff', {
    name: 'Aarohi Verma',
    roleTitle: 'Creative Bridal Director',
    isDemo: true,
  });
  assert.equal(saveDemoFlag.status, 400);
  assert.equal(saveDemoFlag.data.code, 'DEMO_STAFF_NOT_SAVEABLE');

  const bookDemoId = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: 'Riya Gupta',
    phone: '9876543210',
    service: 'HD Bridal Makeup',
    stylist: 'Aarohi Verma',
    stylistId: 'demo-staff-1',
    date: nextMondayDate(),
    time: '11:00 AM',
  });
  assert.equal(bookDemoId.status, 400);
  assert.equal(bookDemoId.data.code, 'DEMO_STAFF_NOT_BOOKABLE');

  const waitlistDemo = await anon.post('/api/public/waitlist', {
    slug: 'lumina-luxe',
    name: 'Riya Gupta',
    phone: '9876543210',
    service: 'HD Bridal Makeup',
    stylistId: 'demo-staff-2',
    preferredDate: nextMondayDate(),
  });
  assert.equal(waitlistDemo.status, 400);
  assert.equal(waitlistDemo.data.code, 'DEMO_STAFF_NOT_BOOKABLE');

  const inquiryDemo = await anon.post('/api/public/stylist-inquiry', {
    stylistId: 'demo-staff-1',
    stylistName: 'Aarohi Verma',
    senderName: 'Riya Gupta',
    senderPhone: '9876543210',
    message: 'Are you available next month?',
  });
  assert.equal(inquiryDemo.status, 400);
  assert.equal(inquiryDemo.data.code, 'DEMO_STAFF_NOT_AVAILABLE');
});

test('unpublished salon websites block booking API calls and automatically activate booking on publish', async () => {
  const anon = makeClient();
  const admin = await loginAsAdmin('admin@test.local', 'Admin@12345');

  // Register a brand-new salon owner whose website starts unpublished.
  const studioOwner = makeClient();
  const slug = `atelier-blush-${Date.now().toString(36)}`;
  const reg = await studioOwner.post('/api/auth/register', {
    name: 'Devika Singh',
    email: `${slug}@test.local`,
    password: 'StudioPassword@123',
    dateOfBirth: '1995-06-15',
  });
  assert.equal(reg.status, 201);

  // Verify email via devVerificationUrl token if provided.
  if (reg.data.devVerificationUrl) {
    const token = new URL(reg.data.devVerificationUrl, 'http://localhost').searchParams.get('token');
    if (token) {
      await studioOwner.post('/api/auth/verify-email', { token });
    }
  }

  const onboard = await studioOwner.post('/api/salon/onboarding', {
    name: 'Atelier Blush Studio',
    slug,
    city: 'Jaipur',
    addressLine: '14 Prithviraj Road, C-Scheme',
    phone: '+91 98290 12345',
    email: `${slug}@test.local`,
  });
  assert.equal(onboard.status, 201);
  const newSalonSlug = onboard.data.salon.slug;
  const newSalonId = onboard.data.salon.id;
  assert.equal(onboard.data.salon.published, false);

  // Add salon profile details, a service and a real salon staff member across templates.
  await studioOwner.patch('/api/salon', {
    tagline: 'Couture Skin & Bridal',
    description: 'Bespoke skin and bridal studio in Jaipur.',
    state: 'Rajasthan',
    templateId: 'blush',
  });

  const svcRes = await studioOwner.post('/api/salon/services', {
    name: 'Couture Bridal Makeup',
    category: 'bridal',
    description: 'Full bridal look with draping.',
    price: 15000,
    durationMinutes: 120,
    active: true,
  });
  assert.equal(svcRes.status, 201);

  const staffRes = await studioOwner.post('/api/salon/staff', {
    name: 'Ishita Menon',
    roleTitle: 'Lead Couture Artist',
    bio: 'Luxury bridal specialist.',
    experience: '9+ Years',
    rating: 4.8,
    reviewCount: 31,
    specialties: ['Couture Bridal', 'Airbrush'],
    qualifications: ['London Makeup Academy Graduate'],
    active: true,
    bookingEnabled: true,
  });
  assert.equal(staffRes.status, 201);
  const realStaffId = staffRes.data.staff.id;

  // BEFORE PUBLISH: Direct API booking, waitlist and inquiry bypass attempts MUST fail with 403.
  const blockedBooking = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Bypass Visitor',
    phone: '9811122233',
    service: 'Couture Bridal Makeup',
    stylistId: realStaffId,
    stylist: 'Ishita Menon',
    date: nextMondayDate(),
    time: '11:00 AM',
  });
  assert.equal(blockedBooking.status, 403);
  assert.equal(blockedBooking.data.code, 'WEBSITE_NOT_PUBLISHED');

  const blockedBySalonId = await anon.post('/api/public/bookings', {
    salonId: newSalonId,
    fullName: 'Bypass Visitor',
    phone: '9811122233',
    service: 'Couture Bridal Makeup',
    date: nextMondayDate(),
    time: '11:00 AM',
  });
  assert.equal(blockedBySalonId.status, 403);
  assert.equal(blockedBySalonId.data.code, 'WEBSITE_NOT_PUBLISHED');

  const blockedWaitlist = await anon.post('/api/public/waitlist', {
    slug: newSalonSlug,
    name: 'Bypass Visitor',
    phone: '9811122233',
    service: 'Couture Bridal Makeup',
    preferredDate: nextMondayDate(),
  });
  assert.equal(blockedWaitlist.status, 403);
  assert.equal(blockedWaitlist.data.code, 'WEBSITE_NOT_PUBLISHED');

  const blockedInquiry = await anon.post('/api/public/stylist-inquiry', {
    salonId: newSalonSlug,
    stylistId: realStaffId,
    stylistName: 'Ishita Menon',
    userName: 'Bypass Visitor',
    userPhone: '9811122233',
    message: 'Testing unpublished inquiry lock.',
  });
  assert.equal(blockedInquiry.status, 403);
  assert.equal(blockedInquiry.data.code, 'WEBSITE_NOT_PUBLISHED');

  // Submit for approval -> Admin approves -> Owner publishes website.
  const sub = await studioOwner.post('/api/salon/submit');
  assert.equal(sub.status, 201);
  const rev = await admin.post(`/api/admin/approvals/${sub.data.version.id}/review`, {
    action: 'approve',
    note: 'Approved for launch.',
  });
  assert.equal(rev.status, 200);

  // Approved but STILL unpublished: booking must STILL be blocked until owner publishes!
  const stillUnpublished = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Pre-Publish Visitor',
    phone: '9811122233',
    service: 'Couture Bridal Makeup',
    stylistId: realStaffId,
    date: nextMondayDate(),
    time: '11:00 AM',
  });
  assert.equal(stillUnpublished.status, 403);
  assert.equal(stillUnpublished.data.code, 'WEBSITE_NOT_PUBLISHED');

  // Super admin publishes website -> booking activates automatically with real salon staff!
  const pub = await admin.post(`/api/admin/salons/${newSalonId}/publish`);
  assert.equal(pub.status, 200, JSON.stringify(pub.data));
  assert.equal(pub.data.salon.published, true);

  const liveSite = await anon.get(`/api/public/salons/${newSalonSlug}`);
  assert.equal(liveSite.status, 200);
  assert.equal(liveSite.data.staff.length, 1);
  assert.equal(liveSite.data.staff[0].id, realStaffId);
  assert.equal(liveSite.data.staff.some((s) => s.isDemo), false);

  const liveBooking = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Aditi Rao',
    phone: '9811122233',
    service: 'Couture Bridal Makeup',
    stylistId: realStaffId,
    date: nextMondayDate(),
    time: '11:30 AM',
  });
  assert.equal(liveBooking.status, 201);
  assert.equal(liveBooking.data.booking.stylistId, realStaffId);
  assert.equal(liveBooking.data.booking.stylist, 'Ishita Menon');

  // Cross-tenant isolation: Lumina Luxe's staff ID cannot be booked on Atelier Blush Studio.
  const luminaSite = await anon.get('/api/public/salons/lumina-luxe');
  const luminaStaffId = luminaSite.data.staff[0].id;
  const crossTenantBooking = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Cross Tenant Client',
    phone: '9811122233',
    service: 'Couture Bridal Makeup',
    stylistId: luminaStaffId,
    date: nextMondayDate(),
    time: '02:00 PM',
  });
  assert.equal(crossTenantBooking.status, 400);
  assert.equal(crossTenantBooking.data.code, 'INVALID_SALON_STAFF');

  // Disabling online booking for a specialist blocks booking that specialist with 409.
  await studioOwner.patch(`/api/salon/staff/${realStaffId}`, { bookingEnabled: false });
  const disabledStaffBooking = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Client Two',
    phone: '9811122244',
    service: 'Couture Bridal Makeup',
    stylistId: realStaffId,
    date: nextMondayDate(),
    time: '03:00 PM',
  });
  assert.equal(disabledStaffBooking.status, 409);
  assert.equal(disabledStaffBooking.data.code, 'STAFF_NOT_BOOKABLE');

  // A busy / on-leave specialist is not bookable even when the booking switch is on,
  // and the public roster reflects it as not bookable.
  await studioOwner.patch(`/api/salon/staff/${realStaffId}`, { bookingEnabled: true, availabilityStatus: 'busy' });
  const busyStaffBooking = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Client Busy',
    phone: '9811122246',
    service: 'Couture Bridal Makeup',
    stylistId: realStaffId,
    date: nextMondayDate(),
    time: '03:00 PM',
  });
  assert.equal(busyStaffBooking.status, 409);
  assert.equal(busyStaffBooking.data.code, 'STAFF_NOT_BOOKABLE');
  const publicRoster = await anon.get(`/api/public/salons/${newSalonSlug}`);
  const publicBusyMember = publicRoster.data.staff.find((s) => s.id === realStaffId);
  assert.equal(publicBusyMember.availabilityStatus, 'busy');
  assert.equal(publicBusyMember.bookingEnabled, false);
  // Restore the state the rest of this flow expects (switch off, status available).
  await studioOwner.patch(`/api/salon/staff/${realStaffId}`, { bookingEnabled: false, availabilityStatus: 'available' });

  // Unpublishing (super admin) immediately disables the booking API again.
  await admin.post(`/api/admin/salons/${newSalonId}/unpublish`);
  const afterUnpublish = await anon.post('/api/public/bookings', {
    slug: newSalonSlug,
    fullName: 'Client Three',
    phone: '9811122255',
    service: 'Couture Bridal Makeup',
    date: nextMondayDate(),
    time: '04:00 PM',
  });
  assert.equal(afterUnpublish.status, 403);
  assert.equal(afterUnpublish.data.code, 'WEBSITE_NOT_PUBLISHED');
});


/* ------------------------------------------------------------------ */
/* Staff onboarding: roles, app access, commission, roster & skills    */
/* ------------------------------------------------------------------ */

test('staff onboarding persists roles, app access, commission, mobile privacy, services and weekly schedule', async () => {
  // Reuse the owner session established earlier so this test does not consume
  // additional login attempts from the shared rate limiter.
  const owner = ownerClient;
  const anon = makeClient();

  const servicesRes = await owner.get('/api/salon/services');
  assert.equal(servicesRes.status, 200);
  const salonServices = servicesRes.data.services;
  assert.ok(salonServices.length >= 2, 'seeded salon exposes services for assignment');
  const assignedIds = [salonServices[0].id, salonServices[1].id];

  const created = await owner.post('/api/salon/staff', {
    name: 'Rahul Sharma',
    primaryRole: 'senior_stylist',
    appAccessRole: 'manager',
    commissionPercent: 18.5,
    mobileNumber: '+91 98765 43210',
    hideMobileNumber: true,
    serviceIds: assignedIds,
    specialties: ['Hair Coloring', 'Balayage', 'Keratin Treatment', 'Hair Coloring'],
    weeklySchedule: [
      { day: 'mon', startTime: '10:00', endTime: '20:00', closed: false },
      { day: 'tue', startTime: '10:00', endTime: '20:00', closed: false },
      { day: 'wed', startTime: '10:00', endTime: '21:00', closed: false },
      { day: 'thu', startTime: '10:00', endTime: '21:00', closed: false },
      { day: 'fri', startTime: '10:00', endTime: '21:00', closed: false },
      { day: 'sat', startTime: '09:00', endTime: '21:00', closed: false },
      { day: 'sun', closed: true },
    ],
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const member = created.data.staff;
  const staffId = member.id;

  // Role title is derived from the primary role slug, never a raw slug.
  assert.equal(member.primaryRole, 'senior_stylist');
  assert.equal(member.roleTitle, 'Senior Stylist');
  assert.equal(member.appAccessRole, 'manager');
  assert.equal(member.commissionPercent, 18.5);
  assert.equal(member.mobileNumber, '+919876543210');
  assert.equal(member.hideMobileNumber, true);
  assert.deepEqual(member.serviceIds, assignedIds);
  // Skills are trimmed, case-insensitively de-duplicated and keep order.
  assert.deepEqual(member.specialties, ['Hair Coloring', 'Balayage', 'Keratin Treatment']);
  // Seven days always come back, with Sunday closed and empty times.
  assert.equal(member.weeklySchedule.length, 7);
  const sunday = member.weeklySchedule.find((d) => d.day === 'sun');
  assert.deepEqual(sunday, { day: 'sun', startTime: '', endTime: '', closed: true });
  const saturday = member.weeklySchedule.find((d) => d.day === 'sat');
  assert.deepEqual(saturday, { day: 'sat', startTime: '09:00', endTime: '21:00', closed: false });

  // Owner list keeps the real number available for editing, flagged as hidden.
  const list = await owner.get('/api/salon/staff');
  const fromList = list.data.staff.find((s) => s.id === staffId);
  assert.equal(fromList.mobileNumber, '+919876543210');
  assert.equal(fromList.hideMobileNumber, true);

  // Hidden numbers and every staff-only field stay out of the public payload.
  const pubMember = (await anon.get('/api/public/salons/lumina-luxe')).data.staff.find((s) => s.id === staffId);
  assert.ok(pubMember, 'new staff member appears on the live website');
  assert.equal(pubMember.mobileNumber, '', 'hidden mobile must never reach the public website');
  assert.equal(pubMember.appAccessRole, undefined, 'app access is internal to the owner dashboard');
  assert.equal(pubMember.commissionPercent, undefined, 'commission is internal to the owner dashboard');
  assert.equal(pubMember.serviceIds, undefined, 'service mapping is dashboard-only');

  // Edit round-trip: partial patch of one onboarding field leaves the rest intact.
  const patched = await owner.patch(`/api/salon/staff/${staffId}`, { commissionPercent: 22 });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.staff.commissionPercent, 22);
  assert.equal(patched.data.staff.appAccessRole, 'manager');
  assert.deepEqual(patched.data.staff.serviceIds, assignedIds);

  // Validation guards.
  const badRole = await owner.post('/api/salon/staff', { name: 'Bad Role', primaryRole: 'chief_vibes_officer' });
  assert.equal(badRole.status, 400);
  const badAccess = await owner.post('/api/salon/staff', { name: 'Bad Access', appAccessRole: 'super_admin' });
  assert.equal(badAccess.status, 400);
  const badCommission = await owner.post('/api/salon/staff', { name: 'Bad Commission', commissionPercent: 140 });
  assert.equal(badCommission.status, 400);
  const badMobile = await owner.post('/api/salon/staff', { name: 'Bad Mobile', mobileNumber: '12345' });
  assert.equal(badMobile.status, 400);
  const badSchedule = await owner.post('/api/salon/staff', {
    name: 'Bad Schedule',
    weeklySchedule: [{ day: 'mon', startTime: '20:00', endTime: '10:00', closed: false }],
  });
  assert.equal(badSchedule.status, 400);
  const badDay = await owner.post('/api/salon/staff', {
    name: 'Bad Day',
    weeklySchedule: [{ day: 'funday', startTime: '10:00', endTime: '18:00', closed: false }],
  });
  assert.equal(badDay.status, 400);
  // Service assignment is scoped to this salon's own catalogue: ids that do
  // not belong to the salon (another tenant's, or invented) are rejected.
  const foreignAssignment = await owner.post('/api/salon/staff', {
    name: 'Foreign Service',
    serviceIds: ['11111111-2222-4333-8444-555555555555'],
  });
  assert.equal(foreignAssignment.status, 400);
  assert.match(foreignAssignment.data.error, /belong to your salon catalogue/);

  // Defaults for a minimal create: 15% commission, service provider access,
  // default week with Sunday closed and no mobile number.
  const minimal = await owner.post('/api/salon/staff', { name: 'Minimal Onboarding' });
  assert.equal(minimal.status, 201, JSON.stringify(minimal.data));
  const minimalStaff = minimal.data.staff;
  assert.equal(minimalStaff.commissionPercent, 15);
  assert.equal(minimalStaff.appAccessRole, 'service_provider');
  assert.equal(minimalStaff.mobileNumber, '');
  assert.deepEqual(minimalStaff.serviceIds, []);
  assert.equal(minimalStaff.weeklySchedule.length, 7);
  assert.equal(minimalStaff.weeklySchedule.find((d) => d.day === 'sun').closed, true);
  assert.equal(minimalStaff.weeklySchedule.find((d) => d.day === 'mon').startTime, '10:00');
  assert.equal(minimalStaff.primaryRole, '');
  assert.equal(minimalStaff.roleTitle, '');

  // Availability accepts the new 'off_duty' status used by the onboarding form.
  const offDuty = await owner.patch(`/api/salon/staff/${staffId}`, { availabilityStatus: 'off_duty' });
  assert.equal(offDuty.status, 200);
  assert.equal(offDuty.data.staff.availabilityStatus, 'off_duty');
  const publicOffDuty = (await anon.get('/api/public/salons/lumina-luxe')).data.staff.find((s) => s.id === staffId);
  assert.equal(publicOffDuty.bookingEnabled, false, 'off-duty staff cannot be booked online');

  // Service mapping is enforced on the public booking flow: assigning a
  // specialist only one service must reject a booking for a different service
  // instead of silently assigning the wrong artist.
  const liveServices = (await anon.get('/api/public/salons/lumina-luxe')).data.services;
  assert.ok(liveServices.length >= 2, 'seeded live salon exposes at least two services');
  const mappedService = liveServices[0];
  const otherService = liveServices[1];
  await owner.patch(`/api/salon/staff/${staffId}`, {
    availabilityStatus: 'available',
    bookingEnabled: true,
    serviceIds: [mappedService.id],
  });
  const mismatched = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: 'Mapping Mismatch',
    phone: '9800011122',
    service: otherService.name,
    stylistId: staffId,
    date: nextMondayDate(),
    time: '03:00 PM',
  });
  assert.equal(mismatched.status, 409);
  assert.equal(mismatched.data.code, 'STAFF_SERVICE_MISMATCH');

  // The mapped service books normally.
  const matched = await anon.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: 'Mapping Match',
    phone: '9800011133',
    service: mappedService.name,
    stylistId: staffId,
    date: nextMondayDate(),
    time: '04:00 PM',
  });
  assert.equal(matched.status, 201, JSON.stringify(matched.data));
  assert.equal(matched.data.booking.stylistId, staffId);

  // Cleanup so later tests keep a stable roster.
  await owner.del(`/api/salon/staff/${staffId}`);
  await owner.del(`/api/salon/staff/${minimalStaff.id}`);
});

test('staff weekly roster narrows public availability for a preferred specialist', async () => {
  const owner = ownerClient;
  const anon = makeClient();

  const created = await owner.post('/api/salon/staff', {
    name: 'Roster Tester',
    primaryRole: 'hair_dresser',
    weeklySchedule: [
      { day: 'mon', startTime: '12:00', endTime: '16:00', closed: false },
      { day: 'tue', startTime: '12:00', endTime: '16:00', closed: false },
      { day: 'wed', startTime: '12:00', endTime: '16:00', closed: false },
      { day: 'thu', startTime: '12:00', endTime: '16:00', closed: false },
      { day: 'fri', startTime: '12:00', endTime: '16:00', closed: false },
      { day: 'sat', startTime: '12:00', endTime: '16:00', closed: false },
      { day: 'sun', closed: true },
    ],
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const staffId = created.data.staff.id;

  // Monday: the roster window (12:00–16:00) is narrower than the salon's hours.
  const monday = nextMondayDate();
  const withStaff = await anon.get(
    `/api/public/availability?date=${monday}&slug=lumina-luxe&staffId=${staffId}&duration=60&tzOffset=330`
  );
  assert.equal(withStaff.status, 200);
  assert.equal(withStaff.data.staffScheduleApplied, 'staff_schedule');
  assert.ok(withStaff.data.slots.length > 0);
  for (const slot of withStaff.data.slots) {
    assert.ok(slot.start >= '12:00', `slot ${slot.start} must start inside the roster`);
    assert.ok(slot.end <= '16:00', `slot ${slot.end} must finish inside the roster`);
  }

  // The upcoming Sunday is closed for this specialist only.
  const date = new Date();
  const daysUntilSunday = (7 - date.getDay()) % 7 || 7;
  date.setDate(date.getDate() + daysUntilSunday);
  const pad = (n) => String(n).padStart(2, '0');
  const sunday = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const sundayWithStaff = await anon.get(
    `/api/public/availability?date=${sunday}&slug=lumina-luxe&staffId=${staffId}&duration=60&tzOffset=330`
  );
  assert.equal(sundayWithStaff.status, 200);
  assert.equal(sundayWithStaff.data.staffScheduleApplied, 'staff_closed');
  assert.deepEqual(sundayWithStaff.data.slots, []);
  assert.equal(sundayWithStaff.data.reason, 'staff_closed');

  // Without a specialist the salon's own hours still apply (no roster leak).
  const anyStaff = await anon.get(`/api/public/availability?date=${monday}&slug=lumina-luxe&duration=60&tzOffset=330`);
  assert.equal(anyStaff.status, 200);
  assert.equal(anyStaff.data.staffScheduleApplied, null);
  assert.ok(anyStaff.data.slots.length > withStaff.data.slots.length);

  await owner.del(`/api/salon/staff/${staffId}`);
});
