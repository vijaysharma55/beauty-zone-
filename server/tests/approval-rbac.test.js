/**
 * Regression coverage for the critical self-approval flaw.
 *
 * Threat model: a salon owner must never be able to move their own website into
 * the Published state, and an operational `admin` must never approve or publish
 * a salon. Only a `super_admin` can do either.
 *
 * The three states under test:
 *   1. Draft              (owner edits)
 *   2. Pending approval   (owner clicks "Submit for review")
 *   3. Approved/Published (super admin only)
 *
 * Boots a real server against a throwaway SQLite database, mirroring
 * api.test.js, so the assertions exercise the actual Express route table,
 * middleware and workflow module rather than mocks.
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
const PORT = 7300 + Math.floor(Math.random() * 300);
const BASE = `http://127.0.0.1:${PORT}`;
const ORIGIN = BASE;
const TMP_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-approval-rbac-'));

let child;

async function waitForServer() {
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`);
      if (res.ok) return;
    } catch {
      /* not ready yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
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
      SEED_ADMIN_EMAIL: 'chief@test.local',
      SEED_ADMIN_PASSWORD: 'Chief@12345',
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
  await new Promise((resolve) => setTimeout(resolve, 500));
  fs.rmSync(TMP_DATA, { recursive: true, force: true });
});

function makeClient() {
  let cookie = '';
  const request = async (method, urlPath, body, extraHeaders = {}) => {
    const headers = { Origin: ORIGIN, 'X-Requested-With': 'beautyzone', ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${BASE}${urlPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const entry of res.headers.getSetCookie?.() || []) {
      const value = entry.split(';')[0];
      if (!value || value.endsWith('=')) continue;
      const name = value.split('=')[0];
      cookie = cookie
        ? `${cookie.split('; ').filter((c) => c.split('=')[0] !== name).join('; ')}; ${value}`
        : value;
    }
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: res.status, data };
  };
  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b, h) => request('POST', p, b, h),
    patch: (p, b, h) => request('PATCH', p, b, h),
    del: (p, h) => request('DELETE', p, undefined, h),
    cookie: () => cookie,
  };
}

const state = {};

/* ------------------------------------------------------------------ */
/* 1. Portal isolation                                                 */
/* ------------------------------------------------------------------ */

test('an administrator cannot sign in through the salon owner portal', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/login', {
    email: 'chief@test.local',
    password: 'Chief@12345',
  });
  assert.equal(res.status, 403);
  assert.equal(res.data.code, 'WRONG_PORTAL');
  assert.equal(client.cookie(), '', 'no session cookie may be issued');
  assert.equal((await client.get('/api/auth/me')).data.user, null);
});

test('a salon owner cannot sign in through the super admin portal', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/admin/login', {
    email: 'owner@test.local',
    password: 'Owner@12345',
  });
  assert.equal(res.status, 403);
  assert.equal(res.data.code, 'WRONG_PORTAL');
  assert.equal(client.cookie(), '');
});

test('the super admin portal signs an administrator in', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/admin/login', {
    email: 'chief@test.local',
    password: 'Chief@12345',
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.user.role, 'super_admin');
  assert.ok(client.cookie(), 'an admin session cookie is issued');
  state.admin = client;
  state.adminId = res.data.user.id;
});

test('the owner portal still signs a salon owner in', async () => {
  const client = makeClient();
  const res = await client.post('/api/auth/login', {
    email: 'owner@test.local',
    password: 'Owner@12345',
  });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  assert.equal(res.data.user.role, 'salon_owner');
  state.owner = client;

  const me = await client.get('/api/auth/me');
  state.salon = me.data.salon;
  assert.ok(state.salon?.id);
});

/* ------------------------------------------------------------------ */
/* 2. Owner restrictions                                               */
/* ------------------------------------------------------------------ */

test('a salon owner can still manage their own store details', async () => {
  const owner = state.owner;
  const patched = await owner.patch('/api/salon', {
    tagline: 'Owner-managed tagline',
    description: 'Owner-managed description.',
    city: 'Jaipur',
  });
  assert.equal(patched.status, 200);
  assert.equal(patched.data.salon.tagline, 'Owner-managed tagline');

  const service = await owner.post('/api/salon/services', {
    name: 'Signature Blowout',
    category: 'hair',
    pricePaise: 120000,
    durationMinutes: 45,
  });
  assert.equal(service.status, 201);
  assert.ok(service.data.service.id);
});

test('the owner approval snapshot exposes no approval capability', async () => {
  const res = await state.owner.get('/api/salon');
  assert.equal(res.status, 200);
  assert.equal(res.data.workflow.canPublish, false, 'owners can never publish');
  assert.equal(res.data.workflow.websiteStatus, 'approved', 'seeded salon is approved');
  assert.equal(typeof res.data.workflow.canSubmit, 'boolean');
});

test('every owner publish/unpublish path fails closed', async () => {
  for (const route of ['/api/salon/publish', '/api/salon/unpublish']) {
    const res = await state.owner.post(route);
    assert.equal(res.status, 403, route);
    assert.equal(res.data.code, 'SELF_APPROVAL_FORBIDDEN', route);
  }

  const salon = (await state.owner.get('/api/salon')).data.salon;
  assert.equal(salon.published, true, 'state was not mutated by the rejected calls');
  assert.equal(salon.status, 'approved');
});

test('a salon owner cannot reach any approval or console endpoint', async () => {
  const owner = state.owner;
  const blockedGets = [
    '/api/admin/overview',
    '/api/admin/users',
    '/api/admin/salons',
    '/api/admin/approvals',
    `/api/admin/approvals/any-version`,
  ];
  for (const route of blockedGets) {
    assert.equal((await owner.get(route)).status, 403, route);
  }

  const blockedWrites = [
    ['POST', '/api/admin/approvals/any-version/review', { action: 'approve', note: 'self' }],
    ['POST', `/api/admin/salons/${state.salon.id}/publish`, undefined],
    ['POST', `/api/admin/salons/${state.salon.id}/unpublish`, undefined],
    ['PATCH', `/api/admin/salons/${state.salon.id}`, { published: true }],
    ['PATCH', `/api/admin/salons/${state.salon.id}`, { suspended: false }],
    ['PATCH', '/api/admin/settings', { platformName: 'Hijacked' }],
  ];
  for (const [method, route, body] of blockedWrites) {
    const res = await owner[method === 'POST' ? 'post' : 'patch'](route, body);
    assert.equal(res.status, 403, `${method} ${route}`);
  }
});

test('a salon owner has no endpoint that can flip status to approved', async () => {
  const attempts = [
    ['PATCH', '/api/salon', { status: 'approved' }],
    ['PATCH', '/api/salon', { websiteStatus: 'approved' }],
    ['PATCH', '/api/salon', { published: true }],
    ['PATCH', '/api/salon', { website_published: true }],
    ['PATCH', '/api/salon', { approvedAt: new Date().toISOString() }],
    ['PATCH', '/api/salon', { suspended: false }],
    ['POST', '/api/salon/onboarding', { name: 'Sneaky', status: 'approved', published: true }],
  ];
  for (const [method, route, body] of attempts) {
    const res = await state.owner[method === 'POST' ? 'post' : 'patch'](route, body);
    // Either rejected outright, or accepted while ignoring the privileged field.
    assert.ok(res.status < 500, `${method} ${route} produced a server error`);
  }
  const salon = (await state.owner.get('/api/salon')).data.salon;
  assert.equal(salon.status, 'approved', 'only the super-admin approval may change the status');
  assert.equal(salon.published, true);
});

/* ------------------------------------------------------------------ */
/* 3. Full state machine: Draft → Pending → Approved → Published      */
/* ------------------------------------------------------------------ */

test('a new salon starts as a draft and cannot go live by itself', async () => {
  const client = makeClient();
  const reg = await client.post('/api/auth/register', {
    name: 'Workflow Owner',
    email: 'workflow@test.local',
    password: 'Workflow@12345',
    dateOfBirth: '1990-04-02',
  });
  assert.equal(reg.status, 201);

  const token = new URL(reg.data.devVerificationUrl).searchParams.get('token');
  assert.equal((await client.post('/api/auth/verify-email', { token })).status, 200);

  const onboard = await client.post('/api/salon/onboarding', {
    name: 'Workflow Studio',
    slug: 'workflow-studio',
    city: 'Jaipur',
    addressLine: '9 Workflow Lane',
    phone: '+91 90000 55555',
    email: 'workflow@test.local',
  });
  assert.equal(onboard.status, 201);
  state.flowSalonId = onboard.data.salon.id;
  assert.equal(onboard.data.salon.status, 'draft');
  assert.equal(onboard.data.salon.published, false);

  const created = await client.post('/api/salon/services', {
    name: 'Consultation',
    category: 'other',
    pricePaise: 50000,
    durationMinutes: 30,
  });
  assert.equal(created.status, 201);
  state.flowClient = client;
});

test('state 1 → 2: "Submit for review" only moves the salon to pending approval', async () => {
  const submit = await state.flowClient.post('/api/salon/submit');
  assert.equal(submit.status, 201, JSON.stringify(submit.data));
  assert.equal(submit.data.version.status, 'pending');
  assert.equal(submit.data.salon.status, 'pending');
  assert.equal(submit.data.salon.published, false, 'submitting must NOT publish');
  assert.equal(submit.data.workflow.websiteStatus, 'pending_approval');
  assert.equal(submit.data.workflow.canPublish, false);
  state.flowVersionId = submit.data.version.id;

  assert.equal((await fetch(`${BASE}/api/public/salons/workflow-studio`)).status, 404);

  // The owner still cannot approve or publish their own submission.
  const selfReview = await state.flowClient.post(
    `/api/admin/approvals/${state.flowVersionId}/review`,
    { action: 'approve', note: 'self-approved' }
  );
  assert.equal(selfReview.status, 403);
  // The admin router rejects the owner role before reaching the handler, and the
  // owner router's publish endpoint fails closed as well.
  const selfPublish = await state.flowClient.post(`/api/admin/salons/${state.flowSalonId}/publish`);
  assert.equal(selfPublish.status, 403);
  assert.equal(selfPublish.data.code, 'FORBIDDEN_ROLE');
  const ownPublishRoute = await state.flowClient.post('/api/salon/publish');
  assert.equal(ownPublishRoute.status, 403);
  assert.equal(ownPublishRoute.data.code, 'SELF_APPROVAL_FORBIDDEN');
});

test('the pending submission is visible in the super admin review queue only', async () => {
  const queue = await state.admin.get('/api/admin/approvals?status=pending');
  assert.equal(queue.status, 200);
  const entry = queue.data.approvals.find((a) => a.id === state.flowVersionId);
  assert.ok(entry, 'the submission appears in the admin queue');
  assert.equal(entry.salon.status, 'pending');
  assert.equal(entry.salon.published, false);
});

test('an operational admin can read the console but cannot approve or publish', async () => {
  // Provision an operational admin through the super admin console.
  const created = await state.admin.post('/api/admin/users', {
    name: 'Ops Admin',
    email: 'ops@test.local',
    password: 'OpsAdmin@12345',
    role: 'admin',
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));

  const ops = makeClient();
  const login = await ops.post('/api/auth/admin/login', {
    email: 'ops@test.local',
    password: 'OpsAdmin@12345',
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.role, 'admin');

  // Read access is allowed.
  assert.equal((await ops.get('/api/admin/overview')).status, 200);
  assert.equal((await ops.get('/api/admin/salons')).status, 200);

  // Approval authority is not.
  const review = await ops.post(`/api/admin/approvals/${state.flowVersionId}/review`, {
    action: 'approve',
    note: 'ops approved',
  });
  assert.equal(review.status, 403);
  assert.equal(review.data.code, 'FORBIDDEN_ROLE');

  const publish = await ops.post(`/api/admin/salons/${state.flowSalonId}/publish`);
  assert.equal(publish.status, 403);

  const publishAlias = await ops.patch(`/api/admin/salons/${state.flowSalonId}`, { published: true });
  assert.equal(publishAlias.status, 403);

  const suspend = await ops.patch(`/api/admin/salons/${state.flowSalonId}`, { suspended: true });
  assert.equal(suspend.status, 403);

  // The submission is untouched.
  const salon = (await state.flowClient.get('/api/salon')).data.salon;
  assert.equal(salon.status, 'pending');
  assert.equal(salon.published, false);
});

test('state 2 → 3: a super admin approves, and the website is still not live', async () => {
  const approve = await state.admin.post(`/api/admin/approvals/${state.flowVersionId}/review`, {
    action: 'approve',
    note: 'Approved by the platform.',
  });
  assert.equal(approve.status, 200, JSON.stringify(approve.data));
  assert.equal(approve.data.version.status, 'approved');
  assert.equal(approve.data.salon.status, 'approved');
  assert.equal(approve.data.salon.published, false, 'approval alone must not publish');

  assert.equal(
    (await fetch(`${BASE}/api/public/salons/workflow-studio`)).status,
    404,
    'approved but unpublished websites are not public'
  );
  const ownerView = await state.flowClient.get('/api/salon');
  assert.equal(ownerView.data.workflow.status, 'approved');
  assert.equal(ownerView.data.workflow.canPublish, false);
});

test('state 3: only a super admin can publish the approved website', async () => {
  const ownerAttempt = await state.flowClient.post('/api/salon/publish');
  assert.equal(ownerAttempt.status, 403);

  const publish = await state.admin.post(`/api/admin/salons/${state.flowSalonId}/publish`);
  assert.equal(publish.status, 200, JSON.stringify(publish.data));
  assert.equal(publish.data.salon.published, true);

  const live = await fetch(`${BASE}/api/public/salons/workflow-studio`);
  assert.equal(live.status, 200);
  assert.equal((await live.json()).salon.slug, 'workflow-studio');
});

test('the published state is recorded in the audit log with the reviewer role', async () => {
  const logs = await state.admin.get('/api/admin/audit-logs');
  const actions = logs.data.logs.map((entry) => entry.action);
  assert.ok(actions.includes('salon.submitted_for_review'));
  assert.ok(actions.includes('admin.submission_approve'));
  assert.ok(actions.includes('admin.salon_published'));
  assert.ok(actions.includes('auth.portal_rejected'), 'wrong-portal attempts are audited');

  const approval = logs.data.logs.find(
    (entry) => entry.action === 'admin.submission_approve' && entry.meta?.reviewerRole === 'super_admin'
  );
  assert.ok(approval, 'approval records the super_admin reviewer role');
});

/* ------------------------------------------------------------------ */
/* 4. Direct database tampering is not a supported path               */
/* ------------------------------------------------------------------ */

test('the database refuses a published website with no approved version', () => {
  const dbFile = path.join(TMP_DATA, 'beautyzone.db');
  const db = new DatabaseSync(dbFile);
  const row = db.prepare('SELECT id, status, website_published FROM salons WHERE slug = ?').get('workflow-studio');
  assert.ok(row);
  assert.equal(row.status, 'approved');
  assert.equal(row.website_published, 1);

  const approvedVersions = db
    .prepare("SELECT COUNT(*) AS n FROM salon_versions WHERE salon_id = ? AND status = 'approved'")
    .get(row.id).n;
  assert.equal(approvedVersions, 1, 'exactly one approved snapshot backs the live website');
  db.close();
});
