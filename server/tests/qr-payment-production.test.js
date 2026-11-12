/** Production-oriented owner QR payment integration tests (real HTTP + temp SQLite). */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { startOnboardingSlugMock } from './support/onboarding-slug-mock.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let instance;
let supabaseSlug;
let ownerA;
let ownerB;
let admin;
let paymentId;
let bookingId;
const base = () => `http://127.0.0.1:${instance.port}`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=', 'base64');

function client() {
  let cookie = '';
  return async (method, route, body, headers = {}) => {
    const h = { Origin: base(), 'X-Requested-With': 'beautyzone', ...headers };
    if (cookie) h.Cookie = cookie;
    if (body !== undefined && !Buffer.isBuffer(body) && !h['Content-Type']) h['Content-Type'] = 'application/json';
    const response = await fetch(`${base()}${route}`, {
      method, headers: h,
      body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
    });
    for (const entry of response.headers.getSetCookie?.() || []) {
      const value = entry.split(';')[0];
      if (value && !value.endsWith('=')) cookie = cookie ? `${cookie}; ${value}` : value;
    }
    const raw = Buffer.from(await response.arrayBuffer());
    const text = raw.toString('utf8');
    let data;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { status: response.status, data, text, headers: response.headers };
  };
}
const api = (c) => ({
  get: (p) => c('GET', p), post: (p, b, h) => c('POST', p, b, h),
  put: (p, b) => c('PUT', p, b), patch: (p, b) => c('PATCH', p, b), del: (p) => c('DELETE', p),
});
/**
 * Administrators use the isolated super admin portal; salon owners use the
 * owner portal. The two front doors refuse each other's accounts.
 */
async function adminLogin(email, password) {
  const c = client();
  const res = await api(c).post('/api/auth/admin/login', { email, password });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return c;
}

async function login(email, password) {
  const c = client();
  const res = await api(c).post('/api/auth/login', { email, password });
  assert.equal(res.status, 200, JSON.stringify(res.data));
  return c;
}

before(async () => {
  supabaseSlug = await startOnboardingSlugMock();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-qr-production-'));
  const port = 7000 + Math.floor(Math.random() * 500);
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: { ...process.env, SUPABASE_URL: supabaseSlug.url, SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key', PORT: String(port), DATA_DIR: dataDir, DISABLE_HMR: 'true', NODE_ENV: 'development', PAYMENT_MODE: 'mock', GOOGLE_CLIENT_ID: '', GEMINI_API_KEY: '', SEED_ADMIN_EMAIL: 'admin@qr.test', SEED_ADMIN_PASSWORD: 'Admin@12345', SEED_OWNER_EMAIL: 'a@qr.test', SEED_OWNER_PASSWORD: 'Owner@12345' },
    stdio: 'ignore',
  });
  instance = { child, dataDir, port };
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try { if ((await fetch(`${base()}/api/health`)).ok) break; } catch { /* boot */ }
    await new Promise((r) => setTimeout(r, 150));
  }
  ownerA = await login('a@qr.test', 'Owner@12345');
  admin = await adminLogin('admin@qr.test', 'Admin@12345');
  const rawB = client();
  const registration = await api(rawB).post('/api/auth/register', { name: 'Salon B Owner', email: 'b@qr.test', password: 'OwnerB@12345', dateOfBirth: '1990-01-01' });
  assert.equal(registration.status, 201, JSON.stringify(registration.data));
  ownerB = rawB;
  const onboard = await api(ownerB).post('/api/salon/onboarding', { name: 'Salon B', slug: 'salon-b', city: 'Jodhpur', addressLine: '2 B Road', phone: '9000000000', email: 'b@qr.test' });
  assert.equal(onboard.status, 201, JSON.stringify(onboard.data));
});

after(async () => {
  instance?.child.kill('SIGTERM');
  await new Promise((r) => setTimeout(r, 300));
  if (instance?.dataDir) fs.rmSync(instance.dataDir, { recursive: true, force: true });
  await supabaseSlug?.close();
});

test('QR upload validates content and activation requires explicit confirmation', async () => {
  const invalid = await api(ownerA).post('/api/salon/uploads?kind=payment_qr', Buffer.from('not-an-image'), { 'Content-Type': 'image/png' });
  assert.equal(invalid.status, 415);
  const mismatched = await api(ownerA).post('/api/salon/uploads?kind=payment_qr', PNG, { 'Content-Type': 'image/jpeg' });
  assert.equal(mismatched.status, 415);
  const valid = await api(ownerA).post('/api/salon/uploads?kind=payment_qr', PNG, { 'Content-Type': 'image/png' });
  assert.equal(valid.status, 201, JSON.stringify(valid.data));
  assert.match(valid.data.url, /^\/api\/uploads\/qr-/);

  const settings = { advanceType: 'fixed', advanceFixedPaise: 20_000, gatewayEnabled: false, manualUpiEnabled: true, upiId: 'salona@okhdfcbank', paymentDisplayName: 'Salon A', bankName: 'HDFC Bank', paymentInstructions: 'Pay exactly and submit the UTR.', upiQrUrl: valid.data.url };
  const unconfirmed = await api(ownerA).put('/api/salon/payment-settings', settings);
  assert.equal(unconfirmed.status, 409);
  assert.equal(unconfirmed.data.code, 'ACTIVATION_CONFIRMATION_REQUIRED');
  const active = await api(ownerA).put('/api/salon/payment-settings', { ...settings, confirmActivation: true });
  assert.equal(active.status, 200, JSON.stringify(active.data));
  assert.equal(active.data.settings.bankName, 'HDFC Bank');
  assert.equal(active.data.settings.channels.manual, true);

  const other = await api(ownerB).put('/api/salon/payment-settings', { gatewayEnabled: false, manualUpiEnabled: true, upiId: 'salonb@okicici', paymentDisplayName: 'Salon B', upiQrUrl: valid.data.url, confirmActivation: true });
  assert.equal(other.status, 200);
  assert.equal(other.data.settings.upiId, 'salonb@okicici');
});

test('customer receives only salon A payee, proof stays private and claim remains pending', async () => {
  const date = new Date(Date.now() + 45 * 86_400_000).toISOString().slice(0, 10);
  const booking = await api(client()).post('/api/public/bookings', { slug: 'lumina-luxe', fullName: 'QR Test Customer', phone: '9876543210', service: 'HydraFacial Glow Ritual', date, time: '12:00', locationType: 'salon' });
  assert.equal(booking.status, 201, JSON.stringify(booking.data));
  bookingId = booking.data.booking.id;
  const order = await api(client()).post('/api/public/payments/orders', { bookingId, method: 'upi_qr', amountPaise: 1, salonId: 'salon-b' });
  assert.equal(order.status, 201, JSON.stringify(order.data));
  paymentId = order.data.payment.id;
  assert.equal(order.data.manualUpi.upiId, 'salona@okhdfcbank');
  assert.ok(order.data.manualUpi.paymentLink.includes('am=200.00'));
  assert.ok(!JSON.stringify(order.data).includes('salonb@okicici'));
  assert.equal(order.data.confirmed, false);

  const badProof = await api(client()).post(`/api/public/payments/manual/proof?orderId=${paymentId}`, Buffer.from('fake'), { 'Content-Type': 'image/png' });
  assert.equal(badProof.status, 415);
  const proof = await api(client()).post(`/api/public/payments/manual/proof?orderId=${paymentId}`, PNG, { 'Content-Type': 'image/png' });
  assert.equal(proof.status, 201, JSON.stringify(proof.data));
  assert.equal(proof.data.verified, false);
  const publicProof = await api(client()).get(`/api/salon/payments/${paymentId}/proof`);
  assert.equal(publicProof.status, 401);
  const otherProof = await api(ownerB).get(`/api/salon/payments/${paymentId}/proof`);
  assert.equal(otherProof.status, 404);

  const claim = await api(client()).post('/api/public/payments/manual/claim', { orderId: paymentId, reference: 'QRA-UTR-123456' });
  assert.equal(claim.status, 200);
  assert.equal(claim.data.confirmed, false);
  assert.equal(claim.data.payment.status, 'verification_pending');
  const forge = await api(client()).post(`/api/public/payments/${paymentId}/verify`, { status: 'paid' });
  assert.equal(forge.status, 404);
});

test('only salon A verifies; audit, CSV, filters and receipt are available', async () => {
  const denied = await api(ownerB).post(`/api/salon/payments/${paymentId}/verify`, { note: 'not my payment' });
  assert.equal(denied.status, 404);
  const adminDenied = await api(admin).post(`/api/admin/payments/${paymentId}/verify`, { note: 'cannot inspect owner bank' });
  assert.equal(adminDenied.status, 403);
  const verified = await api(ownerA).post(`/api/salon/payments/${paymentId}/verify`, { note: 'Matched amount and UTR in salon A bank app' });
  assert.equal(verified.status, 200, JSON.stringify(verified.data));
  assert.equal(verified.data.confirmed, true);
  assert.ok(verified.data.receipt.id);

  const details = await api(ownerA).get(`/api/salon/payments/details/${paymentId}`);
  assert.equal(details.status, 200);
  assert.ok(details.data.audit.some((a) => a.action === 'manual.proof_uploaded'));
  assert.ok(details.data.audit.some((a) => a.action === 'manual.verified'));
  assert.equal(details.data.payment.hasPaymentProof, true);
  const proof = await api(ownerA).get(`/api/salon/payments/${paymentId}/proof`);
  assert.equal(proof.status, 200);
  assert.equal(proof.headers.get('content-type'), 'image/png');
  const filtered = await api(ownerA).get('/api/salon/payments?status=verified&search=QRA-UTR-123456&from=2020-01-01');
  assert.equal(filtered.status, 200);
  assert.ok(filtered.data.payments.some((p) => p.id === paymentId));
  const csv = await api(ownerA).get('/api/salon/payments/export.csv?status=verified');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-type'), /text\/csv/);
  assert.ok(csv.text.includes('QRA-UTR-123456'));
});

test('manual refund requires real reference and never claims automatic bank processing', async () => {
  const invalid = await api(ownerA).post(`/api/salon/payments/${paymentId}/refund`, { reason: 'Booking cancelled', reference: '', confirmed: false });
  assert.equal(invalid.status, 400);
  const refunded = await api(ownerA).post(`/api/salon/payments/${paymentId}/refund`, { reason: 'Booking cancelled by customer', reference: 'REFUND-UTR-1234', confirmed: true });
  assert.equal(refunded.status, 200, JSON.stringify(refunded.data));
  assert.equal(refunded.data.refund.status, 'recorded');
  assert.equal(refunded.data.payment.displayStatus, 'refunded');
  assert.match(refunded.data.message, /not automatic bank confirmation/i);
  const again = await api(ownerA).post(`/api/salon/payments/${paymentId}/refund`, { reason: 'duplicate retry' });
  assert.equal(again.status, 200);
  assert.equal(again.data.idempotent, true);
  const summary = await api(ownerA).get('/api/salon/payments/summary');
  assert.ok(summary.data.refundedPaise >= 20_000);
  const adminView = await api(admin).get('/api/admin/payments');
  assert.ok(adminView.data.payments.find((p) => p.id === paymentId).flags.includes('refunded'));
});

test('inactive QR cannot start new payments and delete preserves transaction history', async () => {
  const current = await api(ownerA).get('/api/salon/payment-settings');
  const inactive = await api(ownerA).put('/api/salon/payment-settings', { manualUpiEnabled: false });
  assert.equal(inactive.status, 200);
  assert.equal(inactive.data.settings.channels.manual, false);
  const publicConfig = await api(client()).get('/api/public/payments/config?salon=lumina-luxe');
  assert.equal(publicConfig.data.salonPayment.manualUpi.enabled, false);
  const newOrder = await api(client()).post('/api/public/payments/orders', { bookingId, method: 'upi_qr' });
  assert.notEqual(newOrder.status, 201);
  const removed = await api(ownerA).del('/api/salon/payment-qr');
  assert.equal(removed.status, 200);
  assert.equal(removed.data.settings.upiQrUrl, '');
  assert.equal(current.data.settings.upiQrUrl.startsWith('/api/uploads/qr-'), true);
  const history = await api(ownerA).get(`/api/salon/payments/details/${paymentId}`);
  assert.equal(history.status, 200);
  assert.ok(history.data.audit.length >= 4);
});
