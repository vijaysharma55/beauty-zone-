/**
 * End-to-end tests for the salon-owner-controlled advance payment system,
 * manual UPI verification, receipts and WhatsApp notifications.
 *
 * A real server is booted against a throwaway SQLite database with:
 *   - PAYMENT_MODE=mock (test gateway)
 *   - a local WhatsApp Cloud API stub (success / failure switchable)
 *
 * Nothing here contacts Meta, Razorpay, any UPI network or the internet.
 *
 * Run with: node --test server/tests/owner-payments.test.js
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const SERVICE = 'HydraFacial Glow Ritual';
const SERVICE_PRICE_PAISE = 499_900; // ₹4,999 seeded price

const nextDate = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* ------------------------------------------------------------------ */
/* WhatsApp Cloud API stub                                             */
/* ------------------------------------------------------------------ */

const waStub = { server: null, baseUrl: '', requests: [], failMode: false, seq: 0 };

function startWhatsAppStub() {
  return new Promise((resolve) => {
    waStub.server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => { body += c; });
      req.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(body || '{}'); } catch { /* ignore */ }
        waStub.requests.push({ url: req.url, payload: parsed });
        if (waStub.failMode) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'Stub forced failure' } }));
          return;
        }
        waStub.seq += 1;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: `wamid.STUB${waStub.seq}` }] }));
      });
    });
    waStub.server.listen(0, '127.0.0.1', () => {
      waStub.baseUrl = `http://127.0.0.1:${waStub.server.address().port}`;
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/* Server harness                                                      */
/* ------------------------------------------------------------------ */

let instance = null;
const base = () => `http://127.0.0.1:${instance.port}`;

async function waitForServer() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (instance.child.exitCode !== null) throw new Error(`server exited early: ${instance.child.exitCode}`);
    try {
      const res = await fetch(`${base()}/api/health`);
      if (res.ok) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}

before(async () => {
  await startWhatsAppStub();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-owner-pay-'));
  const port = 6100 + Math.floor(Math.random() * 400);
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      DISABLE_HMR: 'true',
      NODE_ENV: 'development',
      PAYMENT_MODE: 'mock',
      PAYMENT_ADVANCE_PERCENT: '25',
      PAYMENT_HOLD_MINUTES: '30',
      GOOGLE_CLIENT_ID: '',
      GEMINI_API_KEY: '',
      SEED_ADMIN_EMAIL: 'admin@owner.test',
      SEED_ADMIN_PASSWORD: 'Admin@12345',
      SEED_OWNER_EMAIL: 'owner@owner.test',
      SEED_OWNER_PASSWORD: 'Owner@12345',
      WHATSAPP_PROVIDER: 'meta_cloud',
      WHATSAPP_ACCESS_TOKEN: 'stub-token',
      WHATSAPP_PHONE_NUMBER_ID: '123456789',
      WHATSAPP_TEMPLATE_NAME: 'booking_confirmation_receipt',
      WHATSAPP_API_BASE: `${waStub.baseUrl}/v21.0`,
      WHATSAPP_APP_SECRET: 'stub-app-secret',
      APP_URL: 'https://beautyzone.example.com',
    },
    stdio: 'ignore',
  });
  instance = { child, dataDir, port };
  await waitForServer();
});

after(async () => {
  if (instance?.child) instance.child.kill('SIGTERM');
  if (waStub.server) waStub.server.close();
  await new Promise((r) => setTimeout(r, 600));
  if (instance?.dataDir) fs.rmSync(instance.dataDir, { recursive: true, force: true });
});

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

function makeClient() {
  let cookie = '';
  const request = async (method, urlPath, body, extraHeaders = {}) => {
    const headers = { Origin: base(), 'X-Requested-With': 'beautyzone', ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${base()}${urlPath}`, {
      method,
      headers,
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    for (const entry of res.headers.getSetCookie?.() || []) {
      const value = entry.split(';')[0];
      if (!value || value.endsWith('=')) continue;
      cookie = cookie
        ? `${cookie.split('; ').filter((c) => c.split('=')[0] !== value.split('=')[0]).join('; ')}; ${value}`
        : value;
    }
    const raw = Buffer.from(await res.arrayBuffer());
    const text = raw.toString('utf8');
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: res.status, data, headers: res.headers, text, buffer: raw };
  };
  return {
    get: (p, h) => request('GET', p, undefined, h),
    post: (p, b, h) => request('POST', p, b, h),
    put: (p, b, h) => request('PUT', p, b, h),
    patch: (p, b, h) => request('PATCH', p, b, h),
  };
}

async function loginOwner() {
  const client = makeClient();
  const res = await client.post('/api/auth/login', { email: 'owner@owner.test', password: 'Owner@12345' });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return client;
}

let seq = 0;
async function createBooking(overrides = {}) {
  seq += 1;
  return makeClient().post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: `Owner Pay Tester ${seq}`,
    phone: '9800012345',
    service: SERVICE,
    date: nextDate(90 + seq),
    time: '12:00',
    locationType: 'salon',
    ...overrides,
  });
}

function readDb() {
  return new DatabaseSync(path.join(instance.dataDir, 'beautyzone.db'), { readOnly: true });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ */
/* 1. Owner-configured fixed advance                                   */
/* ------------------------------------------------------------------ */

test('owner sets a fixed ₹200 advance; checkout charges ₹200 and computes the balance', async () => {
  const owner = await loginOwner();
  const save = await owner.put('/api/salon/payment-settings', {
    advanceEnabled: true,
    advanceType: 'fixed',
    advanceFixedPaise: 20_000, // ₹200
    balancePolicy: 'at_salon',
  });
  assert.equal(save.status, 200, JSON.stringify(save.data));
  assert.equal(save.data.settings.advanceType, 'fixed');
  assert.equal(save.data.settings.advanceFixedPaise, 20_000);

  const booking = await createBooking();
  assert.equal(booking.status, 201, JSON.stringify(booking.data));
  assert.equal(booking.data.booking.status, 'pending_payment');
  assert.equal(booking.data.payment.advancePaise, 20_000);
  assert.equal(booking.data.payment.remainingPaise, SERVICE_PRICE_PAISE - 20_000);
  assert.equal(booking.data.payment.totalPaise, SERVICE_PRICE_PAISE);
});

test('customer cannot manipulate the advance amount from the frontend', async () => {
  // Client tries to pay only ₹1 by forging amount/advance fields.
  const booking = await createBooking({ amountPaise: 100, advancePaise: 100, advancePaid: true, status: 'confirmed' });
  assert.equal(booking.status, 201);
  // Server uses the published price + salon fixed advance, ignoring the client.
  assert.equal(booking.data.payment.totalPaise, SERVICE_PRICE_PAISE);
  assert.equal(booking.data.payment.advancePaise, 20_000);
  assert.equal(booking.data.booking.status, 'pending_payment');
  assert.equal(booking.data.booking.confirmed, false);
});

test('owner switches to a custom percentage; the correct salon setting is applied', async () => {
  const owner = await loginOwner();
  const save = await owner.put('/api/salon/payment-settings', { advanceType: 'percent', advancePercent: 10 });
  assert.equal(save.status, 200);

  // Public config for this salon reflects 10%; the platform default stays 25%.
  const salonConfig = await makeClient().get('/api/public/payments/config?salon=lumina-luxe');
  assert.equal(salonConfig.data.salonPayment.advancePercent, 10);
  const platformConfig = await makeClient().get('/api/public/payments/config');
  assert.equal(platformConfig.data.payment.advancePercent, 25);

  const booking = await createBooking();
  assert.equal(booking.data.payment.advancePaise, Math.round((SERVICE_PRICE_PAISE * 10) / 100));
});

/* ------------------------------------------------------------------ */
/* 2. Manual UPI QR flow                                               */
/* ------------------------------------------------------------------ */

test('manual UPI QR payment stays pending until the owner verifies it', async () => {
  const owner = await loginOwner();
  await owner.put('/api/salon/payment-settings', { advanceType: 'fixed', advanceFixedPaise: 20_000 });
  await owner.put('/api/salon/payment-methods', {
    manualUpiEnabled: true,
    upiId: 'luminaluxe@okhdfcbank',
    paymentDisplayName: 'Lumina Luxe',
  });

  const booking = await createBooking();
  const bookingId = booking.data.booking.id;
  const order = await makeClient().post('/api/public/payments/orders', { bookingId, method: 'upi_qr' });
  assert.equal(order.status, 201, JSON.stringify(order.data));
  assert.equal(order.data.payment.provider, 'manual_upi');
  assert.ok(order.data.manualUpi.paymentLink.includes('am=200.00'));
  assert.ok(order.data.manualUpi.dynamicQrUrl.includes(order.data.payment.id));

  // Dynamic QR is a real SVG.
  const qr = await makeClient().get(order.data.manualUpi.dynamicQrUrl);
  assert.equal(qr.status, 200);
  assert.ok(qr.text.startsWith('<svg'));

  // "I have paid" (claim) must NOT confirm the booking.
  const claim = await makeClient().post('/api/public/payments/manual/claim', {
    orderId: order.data.payment.id,
    reference: 'UTR1234567890',
  });
  assert.equal(claim.status, 200);
  assert.equal(claim.data.confirmed, false);
  assert.equal(claim.data.booking.status, 'payment_verification_pending');
  assert.equal(claim.data.booking.paymentStatus, 'verification_pending');

  // Confirmation gate stays locked.
  const gate = await makeClient().get(`/api/public/bookings/${bookingId}/confirmation`);
  assert.equal(gate.status, 409);

  // It appears in the owner's verification queue.
  const queue = await owner.get('/api/salon/payments/verification-queue');
  assert.equal(queue.status, 200);
  assert.ok(queue.data.queue.some((p) => p.id === order.data.payment.id));

  // Owner verifies against their bank app → booking confirms + receipt issued.
  const verify = await owner.post(`/api/salon/payments/${order.data.payment.id}/verify`, { note: 'Matched in HDFC app' });
  assert.equal(verify.status, 200, JSON.stringify(verify.data));
  assert.equal(verify.data.confirmed, true);
  assert.equal(verify.data.booking.status, 'confirmed');
  assert.equal(verify.data.booking.paymentStatus, 'advance_paid');
  assert.ok(verify.data.receipt.receiptNumber.startsWith('RCP-'));

  // Idempotent: verifying again does not double-process.
  const again = await owner.post(`/api/salon/payments/${order.data.payment.id}/verify`, {});
  assert.equal(again.status, 200);
  assert.equal(again.data.idempotent, true);
});

test('a rejected manual payment returns the booking to a retryable failed state', async () => {
  const owner = await loginOwner();
  const booking = await createBooking();
  const bookingId = booking.data.booking.id;
  const order = await makeClient().post('/api/public/payments/orders', { bookingId, method: 'upi_qr' });
  await makeClient().post('/api/public/payments/manual/claim', { orderId: order.data.payment.id, reference: 'UTR9999999999' });

  const reject = await owner.post(`/api/salon/payments/${order.data.payment.id}/reject`, { note: 'No credit found' });
  assert.equal(reject.status, 200);
  assert.equal(reject.data.booking.status, 'payment_failed');
  assert.equal(reject.data.booking.paymentStatus, 'failed');

  // Customer can start a fresh payment attempt.
  const retry = await makeClient().post('/api/public/payments/orders', { bookingId, method: 'upi_qr' });
  assert.equal(retry.status, 201);
});

test('the same UPI reference cannot back two payments', async () => {
  const bookingA = await createBooking();
  const orderA = await makeClient().post('/api/public/payments/orders', { bookingId: bookingA.data.booking.id, method: 'upi_qr' });
  await makeClient().post('/api/public/payments/manual/claim', { orderId: orderA.data.payment.id, reference: 'UTRDUPLICATE1' });

  const bookingB = await createBooking();
  const orderB = await makeClient().post('/api/public/payments/orders', { bookingId: bookingB.data.booking.id, method: 'upi_qr' });
  const dup = await makeClient().post('/api/public/payments/manual/claim', { orderId: orderB.data.payment.id, reference: 'UTRDUPLICATE1' });
  assert.equal(dup.status, 409);
  assert.equal(dup.data.code, 'DUPLICATE_REFERENCE');
});

/* ------------------------------------------------------------------ */
/* 3. Receipts                                                         */
/* ------------------------------------------------------------------ */

test('verified payment issues a downloadable receipt (public token + owner)', async () => {
  const owner = await loginOwner();
  const booking = await createBooking();
  const bookingId = booking.data.booking.id;
  const order = await makeClient().post('/api/public/payments/orders', { bookingId });
  const checkout = await makeClient().post('/api/public/payments/mock/checkout', { orderId: order.data.payment.id, method: 'upi', upiId: 'success@mockupi' });
  const complete = await makeClient().post('/api/public/payments/mock/complete', { orderId: order.data.payment.id, transactionId: checkout.data.transactionId });
  assert.equal(complete.status, 200);
  assert.equal(complete.data.confirmed, true);
  assert.ok(complete.data.receipt, 'receipt returned on verification');
  const token = complete.data.receipt.pdfUrl.split('token=')[1];
  assert.ok(token);

  // Public PDF download with the token.
  const pdf = await makeClient().get(`/api/public/receipts/${bookingId}/pdf?token=${token}`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers.get('content-type'), 'application/pdf');
  assert.equal(pdf.buffer.subarray(0, 5).toString('latin1'), '%PDF-');

  // Without the token the receipt is not exposed.
  const noToken = await makeClient().get(`/api/public/receipts/${bookingId}/pdf`);
  assert.equal(noToken.status, 404);

  // Owner can list + download without a token.
  const list = await owner.get(`/api/salon/bookings/${bookingId}/receipts`);
  assert.equal(list.status, 200);
  assert.ok(list.data.receipts.length >= 1);
  const ownerPdf = await owner.get(`/api/salon/receipts/${list.data.receipts[0].id}/pdf`);
  assert.equal(ownerPdf.status, 200);
  assert.equal(ownerPdf.headers.get('content-type'), 'application/pdf');
});

/* ------------------------------------------------------------------ */
/* 4. WhatsApp                                                         */
/* ------------------------------------------------------------------ */

test('verified payment submits a WhatsApp receipt with correct details', async () => {
  waStub.requests.length = 0;
  const booking = await createBooking({ fullName: 'WhatsApp Client', phone: '9811122233' });
  const bookingId = booking.data.booking.id;
  const order = await makeClient().post('/api/public/payments/orders', { bookingId });
  const checkout = await makeClient().post('/api/public/payments/mock/checkout', { orderId: order.data.payment.id, method: 'upi', upiId: 'success@mockupi' });
  await makeClient().post('/api/public/payments/mock/complete', { orderId: order.data.payment.id, transactionId: checkout.data.transactionId });

  await sleep(400); // allow the async send
  const sent = waStub.requests.find((r) => r.payload?.to === '919811122233');
  assert.ok(sent, 'WhatsApp stub received the receipt');
  const body = sent.payload.template.components.find((c) => c.type === 'body').parameters.map((p) => p.text);
  assert.ok(body.includes('WhatsApp Client'));
  assert.ok(body.includes(booking.data.booking.reference));
  assert.ok(body.includes('Lumina Luxe'));

  // The notification ledger records it as sent (provider accepted).
  const owner = await loginOwner();
  const log = await owner.get(`/api/salon/bookings/${bookingId}/whatsapp`);
  assert.equal(log.status, 200);
  assert.equal(log.data.notifications[0].status, 'sent');
  assert.ok(log.data.notifications[0].providerMessageId.startsWith('wamid.STUB'));
});

test('WhatsApp failure does not cancel the confirmed booking; retry works', async () => {
  waStub.failMode = true;
  const booking = await createBooking({ phone: '9822233344' });
  const bookingId = booking.data.booking.id;
  const order = await makeClient().post('/api/public/payments/orders', { bookingId });
  const checkout = await makeClient().post('/api/public/payments/mock/checkout', { orderId: order.data.payment.id, method: 'upi', upiId: 'success@mockupi' });
  const complete = await makeClient().post('/api/public/payments/mock/complete', { orderId: order.data.payment.id, transactionId: checkout.data.transactionId });
  assert.equal(complete.data.confirmed, true);

  await sleep(400);
  const owner = await loginOwner();
  let log = await owner.get(`/api/salon/bookings/${bookingId}/whatsapp`);
  assert.equal(log.data.notifications[0].status, 'failed');

  // Booking is still confirmed despite the notification failure.
  const status = await makeClient().get(`/api/public/bookings/${bookingId}`);
  assert.equal(status.data.booking.status, 'confirmed');

  // Retry once the provider recovers.
  waStub.failMode = false;
  const retry = await owner.post(`/api/salon/bookings/${bookingId}/whatsapp/retry`, {});
  assert.equal(retry.status, 200);
  assert.equal(retry.data.ok, true);
  log = await owner.get(`/api/salon/bookings/${bookingId}/whatsapp`);
  assert.equal(log.data.notifications[0].status, 'sent');
});

test('WhatsApp delivery webhook updates the notification status (signature-verified)', async () => {
  const booking = await createBooking({ phone: '9833344455' });
  const bookingId = booking.data.booking.id;
  const order = await makeClient().post('/api/public/payments/orders', { bookingId });
  const checkout = await makeClient().post('/api/public/payments/mock/checkout', { orderId: order.data.payment.id, method: 'upi', upiId: 'success@mockupi' });
  await makeClient().post('/api/public/payments/mock/complete', { orderId: order.data.payment.id, transactionId: checkout.data.transactionId });
  await sleep(400);

  const owner = await loginOwner();
  const log = await owner.get(`/api/salon/bookings/${bookingId}/whatsapp`);
  const messageId = log.data.notifications[0].providerMessageId;

  const payload = JSON.stringify({
    entry: [{ changes: [{ value: { statuses: [{ id: messageId, status: 'delivered' }] } }] }],
  });
  const signature = 'sha256=' + crypto.createHmac('sha256', 'stub-app-secret').update(payload).digest('hex');
  const res = await fetch(`${base()}/api/public/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature, 'X-Requested-With': 'beautyzone', Origin: base() },
    body: payload,
  });
  assert.equal(res.status, 200);
  const after = await owner.get(`/api/salon/bookings/${bookingId}/whatsapp`);
  assert.equal(after.data.notifications[0].status, 'delivered');

  // An invalid signature is rejected.
  const bad = await fetch(`${base()}/api/public/whatsapp/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': 'sha256=deadbeef', 'X-Requested-With': 'beautyzone', Origin: base() },
    body: payload,
  });
  assert.equal(bad.status, 400);
});

/* ------------------------------------------------------------------ */
/* 5. Per-service override via API                                     */
/* ------------------------------------------------------------------ */

test('owner sets a per-service advance override used at checkout', async () => {
  const owner = await loginOwner();
  await owner.put('/api/salon/payment-settings', { advanceType: 'percent', advancePercent: 25 });
  const services = await owner.get('/api/salon/services');
  const target = services.data.services.find((s) => s.name === SERVICE);
  const patch = await owner.patch(`/api/salon/services/${target.id}`, { advanceMode: 'fixed', advanceFixedPaise: 50_000 });
  assert.equal(patch.status, 200);
  assert.equal(patch.data.service.advanceMode, 'fixed');

  // The override is on the working copy; publish a new approved version so the
  // public snapshot picks it up. Re-approve via admin.
  const admin = makeClient();
  await admin.post('/api/auth/login', { email: 'admin@owner.test', password: 'Admin@12345' });
  const submitted = await owner.post('/api/salon/submit', {});
  assert.equal(submitted.status, 201, JSON.stringify(submitted.data));
  const pending = await admin.get('/api/admin/approvals');
  const version = (pending.data.approvals || []).find((v) => v.salon?.slug === 'lumina-luxe') || (pending.data.approvals || [])[0];
  assert.ok(version, 'a pending version exists to approve');
  const reviewed = await admin.post(`/api/admin/approvals/${version.id}/review`, { action: 'approve' });
  assert.equal(reviewed.status, 200, JSON.stringify(reviewed.data));

  const booking = await createBooking();
  // Service fixed ₹500 override applies (snapshot refreshed).
  assert.equal(booking.data.payment.advancePaise, 50_000);
});

/* ------------------------------------------------------------------ */
/* 6. DOB at signup                                                    */
/* ------------------------------------------------------------------ */

test('signup rejects missing, invalid and future DOB', async () => {
  const missing = await makeClient().post('/api/auth/register', { name: 'No Dob', email: 'nodob@test.local', password: 'Valid@12345' });
  assert.equal(missing.status, 400);
  const invalid = await makeClient().post('/api/auth/register', { name: 'Bad Dob', email: 'baddob@test.local', password: 'Valid@12345', dateOfBirth: '2001-02-30' });
  assert.equal(invalid.status, 400);
  const future = new Date(Date.now() + 86_400_000 * 400).toISOString().slice(0, 10);
  const fut = await makeClient().post('/api/auth/register', { name: 'Future Dob', email: 'future@test.local', password: 'Valid@12345', dateOfBirth: future });
  assert.equal(fut.status, 400);
});

test('signup stores DOB privately; it is never exposed publicly', async () => {
  const reg = await makeClient().post('/api/auth/register', { name: 'Dob Owner', email: 'dobowner@test.local', password: 'Valid@12345', dateOfBirth: '1992-03-08' });
  assert.equal(reg.status, 201, JSON.stringify(reg.data));
  assert.equal(reg.data.user.dateOfBirth, '1992-03-08'); // own session sees it

  // Admin user list must NOT include DOB.
  const admin = makeClient();
  await admin.post('/api/auth/login', { email: 'admin@owner.test', password: 'Admin@12345' });
  const users = await admin.get('/api/admin/users');
  const row = users.data.users.find((u) => u.email === 'dobowner@test.local');
  assert.ok(row);
  assert.equal(row.dateOfBirth, undefined);
  assert.ok(!JSON.stringify(users.data).includes('1992-03-08'));

  // Public salon directory must not leak it either.
  const directory = await makeClient().get('/api/public/salons');
  assert.ok(!JSON.stringify(directory.data).includes('1992-03-08'));

  // Owner can update their DOB from profile settings.
  const client = makeClient();
  await client.post('/api/auth/login', { email: 'dobowner@test.local', password: 'Valid@12345' });
  const upd = await client.patch('/api/auth/profile', { dateOfBirth: '1992-03-09' });
  assert.equal(upd.status, 200);
  assert.equal(upd.data.user.dateOfBirth, '1992-03-09');
  const badUpd = await client.patch('/api/auth/profile', { dateOfBirth: '2999-01-01' });
  assert.equal(badUpd.status, 400);
});

/* ------------------------------------------------------------------ */
/* 7. Transactions dashboard                                           */
/* ------------------------------------------------------------------ */

test('owner dashboard reports advance received and outstanding balances', async () => {
  const owner = await loginOwner();
  const summary = await owner.get('/api/salon/payments/summary');
  assert.equal(summary.status, 200);
  assert.ok(summary.data.advanceReceivedPaise > 0);
  assert.ok(summary.data.paidCount > 0);
  const tx = await owner.get('/api/salon/payments');
  assert.equal(tx.status, 200);
  assert.ok(Array.isArray(tx.data.payments));
  assert.ok(tx.data.payments.every((p) => p.salonId));
});
