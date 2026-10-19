/**
 * End-to-end API tests for authentication, RBAC and tenant isolation.
 * Run with: npm run test:api
 *
 * Each run boots a real server against a throwaway SQLite database.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 4100 + Math.floor(Math.random() * 500);
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = BASE;
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

let ownerClient;
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
  const admin = await loginAs('admin@test.local', 'Admin@12345');
  assert.equal((await admin.get('/api/salon')).status, 403);
  assert.equal((await admin.get('/api/admin/overview')).status, 200);
});

test('roles cannot be self-assigned on registration', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/register', {
    name: 'Sneaky User',
    email: 'sneaky@test.local',
    password: 'Sneaky@12345',
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
  });
  assert.equal(res.status, 400);
});

test('duplicate email registration is rejected', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/register', {
    name: 'Owner Duplicate',
    email: 'OWNER@test.local',
    password: 'Owner@12345',
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

test('publish/unpublish controls public visibility', async () => {
  // The second owner's salon is still a private draft.
  const draft = await fetch(`${BASE}/api/public/salons/second-studio`);
  assert.equal(draft.status, 404);

  const published = await ownerClient.post('/api/salon/publish');
  assert.equal(published.status, 200);
  assert.equal(published.data.salon.published, true);

  const live = await fetch(`${BASE}/api/public/salons/${ownerSalon.slug}`);
  assert.equal(live.status, 200);
  const body = await live.json();
  assert.equal(body.salon.slug, ownerSalon.slug);
  assert.ok(Array.isArray(body.services));
  assert.ok(body.services.every((s) => s.active), 'inactive services must not leak publicly');
  assert.equal(body.salon.ownerId, undefined, 'internal owner id must not leak publicly');

  const unpublish = await ownerClient.post('/api/salon/unpublish');
  assert.equal(unpublish.status, 200);
  assert.equal((await fetch(`${BASE}/api/public/salons/${ownerSalon.slug}`)).status, 404);

  await ownerClient.post('/api/salon/publish');
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
  const res = await fetch(`${BASE}/api/salon/unpublish`, {
    method: 'POST',
    headers: { Origin: 'https://evil.example', Cookie: ownerClient.getCookie() },
  });
  assert.equal(res.status, 403);

  const noOrigin = await fetch(`${BASE}/api/salon/unpublish`, {
    method: 'POST',
    headers: { Cookie: ownerClient.getCookie() },
  });
  assert.equal(noOrigin.status, 403);
});

test('super admin can manage users, salons and settings', async () => {
  const admin = await loginAs('admin@test.local', 'Admin@12345');

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

  const publishEarly = await flow.client.post('/api/salon/publish');
  assert.equal(publishEarly.status, 403);
  assert.equal(publishEarly.data.code, 'EMAIL_UNVERIFIED');
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
  assert.equal(publish.status, 409);
  assert.equal(publish.data.code, 'APPROVAL_REQUIRED');

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
  flow.admin = await loginAs('admin@test.local', 'Admin@12345');
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

test('approval unlocks publishing with the approved snapshot', async () => {
  const approve = await flow.admin.post(`/api/admin/approvals/${flow.versionId}/review`, {
    action: 'approve',
    note: 'Looks great — approved.',
  });
  assert.equal(approve.status, 200);
  assert.equal(approve.data.version.status, 'approved');
  assert.equal(approve.data.salon.status, 'approved');

  const publish = await flow.client.post('/api/salon/publish');
  assert.equal(publish.status, 200);
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

  const ownerPublish = await flow.client.post('/api/salon/publish');
  assert.equal(ownerPublish.status, 403);
  assert.equal(ownerPublish.data.code, 'SUSPENDED');

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
  const admin = await loginAs('admin@test.local', 'Admin@12345');
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
  const admin = await loginAs('admin@test.local', 'Admin@12345');
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
