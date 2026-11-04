/**
 * End-to-end payment tests for the booking checkout.
 *
 * Run with: npm run test:payments
 *
 * Three real servers are booted against throwaway SQLite databases:
 *   1. development + PAYMENT_MODE=mock     — the full test-mode checkout
 *   2. production  + PAYMENT_MODE=mock     — mock payments must be refused
 *   3. development + PAYMENT_MODE=razorpay — with a local Razorpay API stub
 *
 * Nothing here talks to Razorpay, any UPI network or the internet.
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

const RAZORPAY_KEY_ID = 'rzp_test_beautyzone';
const RAZORPAY_KEY_SECRET = 'test_key_secret_do_not_use_in_production';
const RAZORPAY_WEBHOOK_SECRET = 'whsec_test_beautyzone';

const SERVICE = 'HydraFacial Glow Ritual';
const SERVICE_PRICE_PAISE = 499_900; // ₹4,999 seeded price
const ADVANCE_PAISE = Math.round((SERVICE_PRICE_PAISE * 25) / 100); // 124,975
const REMAINING_PAISE = SERVICE_PRICE_PAISE - ADVANCE_PAISE;

const nextWeekday = (offset = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const bookingDate = (offset) => nextWeekday(offset);

/* ------------------------------------------------------------------ */
/* Razorpay API stub                                                   */
/* ------------------------------------------------------------------ */

const stub = {
  orders: new Map(),
  payments: new Map(),
  orderSeq: 0,
  server: null,
  baseUrl: '',
};

function startRazorpayStub() {
  return new Promise((resolve) => {
    stub.server = http.createServer((req, res) => {
      const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };

      if (req.method === 'POST' && req.url === '/v1/orders') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(body || '{}');
          } catch {
            parsed = {};
          }
          stub.orderSeq += 1;
          const order = {
            id: `order_test_${stub.orderSeq}`,
            entity: 'order',
            amount: parsed.amount,
            currency: parsed.currency || 'INR',
            receipt: parsed.receipt,
            notes: parsed.notes || {},
            status: 'created',
          };
          stub.orders.set(order.id, order);
          send(200, order);
        });
        return;
      }

      if (req.method === 'GET' && req.url.startsWith('/v1/payments/')) {
        const id = decodeURIComponent(req.url.split('/').pop());
        const payment = stub.payments.get(id);
        if (!payment) return send(404, { error: { description: 'not found' } });
        return send(200, payment);
      }

      return send(404, { error: { description: 'unexpected stub route' } });
    });
    stub.server.listen(0, '127.0.0.1', () => {
      stub.baseUrl = `http://127.0.0.1:${stub.server.address().port}`;
      resolve();
    });
  });
}

/* ------------------------------------------------------------------ */
/* Server harness                                                      */
/* ------------------------------------------------------------------ */

const servers = {
  mock: null,
  prod: null,
  razorpay: null,
};

function baseUrlFor(instance) {
  return `http://127.0.0.1:${instance.port}`;
}

async function waitForServer(instance) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (instance.child.exitCode !== null) {
      throw new Error(`server exited early with code ${instance.child.exitCode}`);
    }
    try {
      const res = await fetch(`${baseUrlFor(instance)}/api/health`);
      if (res.ok) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Server did not start in time');
}

async function startServer(name, env, portSeed) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), `beautyzone-pay-${name}-`));
  const port = portSeed + Math.floor(Math.random() * 400);
  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      DATA_DIR: dataDir,
      DISABLE_HMR: 'true',
      GOOGLE_CLIENT_ID: '',
      GEMINI_API_KEY: '',
      SEED_ADMIN_EMAIL: `admin@${name}.test`,
      SEED_ADMIN_PASSWORD: 'Admin@12345',
      SEED_OWNER_EMAIL: `owner@${name}.test`,
      SEED_OWNER_PASSWORD: 'Owner@12345',
      ...env,
    },
    stdio: 'ignore',
  });
  const instance = { name, child, dataDir, port, ownerEmail: `owner@${name}.test` };
  await waitForServer(instance);
  servers[name] = instance;
  return instance;
}

after(async () => {
  for (const instance of Object.values(servers)) {
    if (instance?.child) instance.child.kill('SIGTERM');
  }
  if (stub.server) stub.server.close();
  await new Promise((r) => setTimeout(r, 600));
  for (const instance of Object.values(servers)) {
    if (instance?.dataDir) fs.rmSync(instance.dataDir, { recursive: true, force: true });
  }
});

/* ------------------------------------------------------------------ */
/* HTTP helpers                                                        */
/* ------------------------------------------------------------------ */

function makeClient(base) {
  let cookie = '';
  const request = async (method, urlPath, body, extraHeaders = {}) => {
    const headers = { Origin: base, 'X-Requested-With': 'beautyzone', ...extraHeaders };
    if (cookie) headers.Cookie = cookie;
    if (body !== undefined && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const res = await fetch(`${base}${urlPath}`, {
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
    cookie: () => cookie,
  };
}

async function login(base, email, password = 'Owner@12345') {
  const client = makeClient(base);
  const res = await client.post('/api/auth/login', { email, password });
  assert.equal(res.status, 200, `login failed for ${email}: ${JSON.stringify(res.data)}`);
  return client;
}

let bookingSeq = 0;

async function createBooking(base, overrides = {}) {
  bookingSeq += 1;
  const client = makeClient(base);
  const res = await client.post('/api/public/bookings', {
    slug: 'lumina-luxe',
    fullName: `Payment Tester ${bookingSeq}`,
    phone: '+91 90000 22222',
    service: SERVICE,
    date: bookingDate(60 + bookingSeq),
    time: '12:00',
    locationType: 'salon',
    ...overrides,
  });
  return res;
}

async function createPaidFlow(base) {
  const bookingRes = await createBooking(base);
  assert.equal(bookingRes.status, 201, JSON.stringify(bookingRes.data));
  const bookingId = bookingRes.data.booking.id;
  const orderRes = await makeClient(base).post('/api/public/payments/orders', { bookingId });
  assert.equal(orderRes.status, 201, JSON.stringify(orderRes.data));
  return { bookingRes, bookingId, orderRes, orderId: orderRes.data.payment.id };
}

function readDb(instance) {
  return new DatabaseSync(path.join(instance.dataDir, 'beautyzone.db'), { readOnly: true });
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */

before(async () => {
  await startRazorpayStub();
  await startServer(
    'mock',
    {
      NODE_ENV: 'development',
      PAYMENT_MODE: 'mock',
      PAYMENT_ADVANCE_PERCENT: '25',
      PAYMENT_HOLD_MINUTES: '30',
    },
    4600
  );
  await startServer(
    'prod',
    {
      NODE_ENV: 'production',
      PAYMENT_MODE: 'mock',
      PAYMENT_ADVANCE_PERCENT: '25',
      PAYMENT_REQUIRE_ADVANCE: 'true',
      PAYMENT_HOLD_MINUTES: '30',
    },
    5100
  );
  await startServer(
    'razorpay',
    {
      NODE_ENV: 'development',
      PAYMENT_MODE: 'razorpay',
      PAYMENT_ADVANCE_PERCENT: '25',
      PAYMENT_HOLD_MINUTES: '30',
      RAZORPAY_KEY_ID: RAZORPAY_KEY_ID,
      RAZORPAY_KEY_SECRET: RAZORPAY_KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: RAZORPAY_WEBHOOK_SECRET,
      RAZORPAY_API_BASE: `${stub.baseUrl}/v1`,
      RAZORPAY_VERIFY_PAYMENT_API: 'true',
    },
    5600
  );
});

const mockBase = () => baseUrlFor(servers.mock);
const prodBase = () => baseUrlFor(servers.prod);
const rzpBase = () => baseUrlFor(servers.razorpay);

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

test('mock mode advertises the test checkout without exposing secrets', async () => {
  const res = await makeClient(mockBase()).get('/api/public/payments/config');
  assert.equal(res.status, 200);
  const config = res.data.payment;
  assert.equal(config.mode, 'mock');
  assert.equal(config.mock, true);
  assert.equal(config.advancePercent, 25);
  assert.equal(config.testNotice, 'TEST MODE — No real money will be charged.');
  assert.deepEqual(
    config.testUpiIds.map((entry) => entry.id),
    ['success@mockupi', 'failure@mockupi', 'pending@mockupi', 'cancel@mockupi']
  );
  assert.ok(!JSON.stringify(config).includes('secret'));
});

/* ------------------------------------------------------------------ */
/* 1. Successful mock payment confirms the booking                     */
/* ------------------------------------------------------------------ */

test('mock successful UPI payment creates a pending booking that only confirms after verification', async () => {
  const base = mockBase();
  const bookingRes = await createBooking(base);
  assert.equal(bookingRes.status, 201);
  const booking = bookingRes.data.booking;

  // Created unconfirmed, with a server-computed advance.
  assert.equal(booking.status, 'pending_payment');
  assert.equal(booking.paymentStatus, 'pending');
  assert.equal(booking.confirmed, false);
  assert.equal(booking.amountPaise, SERVICE_PRICE_PAISE);
  assert.equal(booking.advancePaise, ADVANCE_PAISE);
  assert.equal(booking.remainingPaise, REMAINING_PAISE);
  assert.equal(bookingRes.data.payment.required, true);
  assert.equal(bookingRes.data.payment.advancePaise, ADVANCE_PAISE);
  assert.equal(bookingRes.data.booking.calendarEnabled, false);

  // Calendar / confirmation notifications are gated before payment.
  const gated = await makeClient(base).get(`/api/public/bookings/${booking.id}/confirmation`);
  assert.equal(gated.status, 409);
  assert.equal(gated.data.code, 'PAYMENT_REQUIRED');

  // Server-side order.
  const order = await makeClient(base).post('/api/public/payments/orders', { bookingId: booking.id });
  assert.equal(order.status, 201);
  assert.equal(order.data.payment.provider, 'mock');
  assert.equal(order.data.payment.amountPaise, ADVANCE_PAISE);
  assert.equal(order.data.payment.currency, 'INR');
  assert.match(order.data.payment.orderId, /^mock_order_/);

  // Mock checkout: the server returns the transaction id and outcome.
  const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId: order.data.payment.id,
    method: 'upi',
    upiId: 'success@mockupi',
    requestedOutcome: 'success',
  });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.data.outcome, 'success');
  assert.match(checkout.data.transactionId, /^MOCKTXN-/);

  // Still unconfirmed between "authorisation" and verification.
  assert.equal(checkout.data.booking.status, 'pending_payment');
  const midConfirmation = await makeClient(base).get(`/api/public/bookings/${booking.id}/confirmation`);
  assert.equal(midConfirmation.status, 409);

  const complete = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId: order.data.payment.id,
    transactionId: checkout.data.transactionId,
    amountPaise: ADVANCE_PAISE,
    currency: 'INR',
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.data.confirmed, true);
  assert.equal(complete.data.booking.status, 'confirmed');
  assert.equal(complete.data.booking.paymentStatus, 'advance_paid');
  assert.equal(complete.data.booking.calendarEnabled, true);
  assert.ok(complete.data.booking.confirmedAt);
  assert.equal(complete.data.payment.status, 'paid');
  assert.equal(complete.data.payment.transactionId, checkout.data.transactionId);

  // Now — and only now — the confirmation payload with calendar links exists.
  const confirmation = await makeClient(base).get(`/api/public/bookings/${booking.id}/confirmation`);
  assert.equal(confirmation.status, 200);
  assert.equal(confirmation.data.confirmed, true);
  assert.match(confirmation.data.calendar.googleUrl, /calendar\.google\.com/);
  assert.match(confirmation.data.calendar.ics, /BEGIN:VEVENT/);

  // The owner sees a confirmed, paid booking.
  const owner = await login(base, servers.mock.ownerEmail);
  const list = await owner.get('/api/salon/bookings');
  const mine = list.data.bookings.find((b) => b.id === booking.id);
  assert.equal(mine.status, 'confirmed');
  assert.equal(mine.paymentStatus, 'advance_paid');
  assert.equal(mine.advancePaid, Math.round(ADVANCE_PAISE / 100));
});

/* ------------------------------------------------------------------ */
/* 2. Failed / cancelled / pending payments never confirm              */
/* ------------------------------------------------------------------ */

test('mock failed payment leaves the booking unconfirmed and does not touch the calendar gate', async () => {
  const base = mockBase();
  const { bookingId, orderId, bookingRes } = await createPaidFlow(base);
  assert.equal(bookingRes.data.booking.status, 'pending_payment');

  const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId,
    method: 'upi',
    upiId: 'failure@mockupi',
    requestedOutcome: 'failed',
  });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.data.outcome, 'failed');

  const complete = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.data.confirmed, false);
  assert.equal(complete.data.status, 'failed');
  assert.equal(complete.data.booking.status, 'payment_failed');
  assert.equal(complete.data.booking.paymentStatus, 'failed');

  assert.equal((await makeClient(base).get(`/api/public/bookings/${bookingId}/confirmation`)).status, 409);
});

test('a cancelled mock payment never confirms the booking', async () => {
  const base = mockBase();
  const { bookingId, orderId } = await createPaidFlow(base);

  const cancel = await makeClient(base).post('/api/public/payments/mock/cancel', { orderId });
  assert.equal(cancel.status, 200);
  assert.equal(cancel.data.status, 'cancelled');
  assert.equal(cancel.data.payment.status, 'cancelled');
  assert.equal(cancel.data.booking.status, 'pending_payment');
  assert.equal(cancel.data.booking.paymentStatus, 'cancelled');

  // Trying to complete a cancelled order is refused.
  const late = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: 'MOCKTXN-ANYTHING',
  });
  assert.ok(late.status >= 400);

  assert.equal((await makeClient(base).get(`/api/public/bookings/${bookingId}/confirmation`)).status, 409);
});

test('a pending mock payment keeps the booking pending until a later success', async () => {
  const base = mockBase();
  const { bookingId, orderId } = await createPaidFlow(base);

  const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId,
    method: 'netbanking',
    bank: 'test_pending',
    requestedOutcome: 'pending',
  });
  assert.equal(checkout.status, 200);
  assert.equal(checkout.data.outcome, 'pending');

  const complete = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
  });
  assert.equal(complete.status, 200);
  assert.equal(complete.data.status, 'pending');
  assert.equal(complete.data.confirmed, false);
  assert.equal(complete.data.booking.status, 'pending_payment');
  assert.equal(complete.data.booking.paymentStatus, 'pending');
  assert.equal((await makeClient(base).get(`/api/public/bookings/${bookingId}/confirmation`)).status, 409);

  // Retry with a fresh order and a success instrument.
  const retryOrder = await makeClient(base).post('/api/public/payments/orders', { bookingId });
  assert.equal(retryOrder.status, 201);
  const retryCheckout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId: retryOrder.data.payment.id,
    method: 'wallet',
    wallet: 'test_success',
  });
  assert.equal(retryCheckout.data.outcome, 'success');
  const retryComplete = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId: retryOrder.data.payment.id,
    transactionId: retryCheckout.data.transactionId,
  });
  assert.equal(retryComplete.data.confirmed, true);
  assert.equal(retryComplete.data.booking.status, 'confirmed');
});

/* ------------------------------------------------------------------ */
/* 3. Invalid mock transactions, amounts and currencies                */
/* ------------------------------------------------------------------ */

test('invalid mock transaction IDs, unknown test instruments and forged outcomes are rejected', async () => {
  const base = mockBase();
  const { bookingId, orderId } = await createPaidFlow(base);

  const forged = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: 'MOCKTXN-FORGED-000000',
  });
  assert.equal(forged.status, 400);
  assert.equal(forged.data.code, 'INVALID_MOCK_TRANSACTION');

  // A real-looking UPI ID is not a mock instrument.
  const unknownUpi = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId,
    method: 'upi',
    upiId: 'someone@okhdfcbank',
  });
  assert.equal(unknownUpi.status, 400);

  // A click on "success" cannot override an instrument that simulates failure.
  const mismatch = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId,
    method: 'upi',
    upiId: 'failure@mockupi',
    requestedOutcome: 'success',
  });
  assert.equal(mismatch.status, 409);
  assert.equal(mismatch.data.code, 'MOCK_OUTCOME_MISMATCH');

  // A transaction issued for another order is rejected.
  const other = await createPaidFlow(base);
  const otherCheckout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId: other.orderId,
    method: 'card',
    cardNumber: '4111111111111111',
  });
  assert.equal(otherCheckout.data.outcome, 'success');
  const crossOrder = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: otherCheckout.data.transactionId,
  });
  assert.equal(crossOrder.status, 400);
  assert.equal(crossOrder.data.code, 'INVALID_MOCK_TRANSACTION');

  const booking = await makeClient(base).get(`/api/public/bookings/${bookingId}`);
  assert.equal(booking.data.booking.status, 'pending_payment');
  assert.equal(booking.data.booking.confirmed, false);
});

test('wrong amount or currency is rejected and the booking stays unconfirmed', async () => {
  const base = mockBase();
  const { bookingId, orderId } = await createPaidFlow(base);

  const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId,
    method: 'card',
    cardNumber: '4111111111111111',
    requestedOutcome: 'success',
  });
  assert.equal(checkout.status, 200);

  const wrongAmount = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
    amountPaise: ADVANCE_PAISE + 100,
    currency: 'INR',
  });
  assert.equal(wrongAmount.status, 400);
  assert.equal(wrongAmount.data.code, 'AMOUNT_MISMATCH');

  const wrongCurrency = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
    amountPaise: ADVANCE_PAISE,
    currency: 'USD',
  });
  assert.equal(wrongCurrency.status, 400);
  assert.equal(wrongCurrency.data.code, 'CURRENCY_MISMATCH');

  const stillPending = await makeClient(base).get(`/api/public/bookings/${bookingId}`);
  assert.equal(stillPending.data.booking.status, 'pending_payment');
  assert.equal(stillPending.data.booking.paymentStatus, 'pending');

  // The genuine amount still works afterwards.
  const correct = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
    amountPaise: ADVANCE_PAISE,
    currency: 'INR',
  });
  assert.equal(correct.status, 200);
  assert.equal(correct.data.confirmed, true);
});

/* ------------------------------------------------------------------ */
/* 4. The booking API cannot confirm without payment                   */
/* ------------------------------------------------------------------ */

test('the booking API ignores client payment claims and the owner cannot confirm an unpaid booking', async () => {
  const base = mockBase();
  const forged = await createBooking(base, {
    status: 'confirmed',
    paymentStatus: 'paid',
    advancePaid: ADVANCE_PAISE / 100,
    advanceRef: 'FAKE-REF',
    confirmed: true,
  });
  assert.equal(forged.status, 201);
  assert.equal(forged.data.booking.status, 'pending_payment', 'client status must be ignored');
  assert.equal(forged.data.booking.paymentStatus, 'pending', 'client payment status must be ignored');
  assert.equal(forged.data.booking.advancePaid, 0, 'client payment claim must be ignored');
  assert.equal(forged.data.booking.advanceRef, null);
  assert.equal(forged.data.booking.confirmed, false);

  const owner = await login(base, servers.mock.ownerEmail);
  const confirm = await owner.patch(`/api/salon/bookings/${forged.data.booking.id}`, { status: 'confirmed' });
  assert.equal(confirm.status, 409);
  assert.equal(confirm.data.code, 'PAYMENT_REQUIRED');

  const after = await makeClient(base).get(`/api/public/bookings/${forged.data.booking.id}`);
  assert.equal(after.data.booking.status, 'pending_payment');

  // Owners can still decline unpaid requests.
  const decline = await owner.patch(`/api/salon/bookings/${forged.data.booking.id}`, { status: 'declined' });
  assert.equal(decline.status, 200);
});

/* ------------------------------------------------------------------ */
/* 5. Duplicate payment processing / double confirmation               */
/* ------------------------------------------------------------------ */

test('repeating a verified mock payment is idempotent and cannot double-confirm', async () => {
  const base = mockBase();
  const { bookingId, orderId } = await createPaidFlow(base);

  const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId,
    method: 'upi',
    upiId: 'success@mockupi',
  });
  const first = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
  });
  assert.equal(first.data.confirmed, true);
  const confirmedAt = first.data.booking.confirmedAt;

  const second = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId,
    transactionId: checkout.data.transactionId,
  });
  assert.equal(second.status, 200);
  assert.equal(second.data.confirmed, true);
  assert.equal(second.data.idempotent, true);
  assert.equal(second.data.booking.confirmedAt, confirmedAt);

  // No new order can be created for an already-confirmed booking.
  const extraOrder = await makeClient(base).post('/api/public/payments/orders', { bookingId });
  assert.equal(extraOrder.status, 409);
  assert.equal(extraOrder.data.code, 'BOOKING_ALREADY_CONFIRMED');

  const db = readDb(servers.mock);
  const rows = db.prepare('SELECT COUNT(*) AS n FROM payments WHERE booking_id = ? AND status = ?').get(bookingId, 'paid');
  const bookingRow = db.prepare('SELECT status, payment_status FROM bookings WHERE id = ?').get(bookingId);
  db.close();
  assert.equal(rows.n, 1, 'exactly one paid payment row');
  assert.equal(bookingRow.status, 'confirmed');
  assert.equal(bookingRow.payment_status, 'advance_paid');
});

test('two bookings cannot both be confirmed for the same salon slot', async () => {
  const base = mockBase();
  const date = bookingDate(120);
  const time = '16:00';

  const pay = async () => {
    const created = await createBooking(base, { date, time });
    assert.equal(created.status, 201);
    const bookingId = created.data.booking.id;
    const order = await makeClient(base).post('/api/public/payments/orders', { bookingId });
    const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
      orderId: order.data.payment.id,
      method: 'upi',
      upiId: 'success@mockupi',
    });
    const complete = await makeClient(base).post('/api/public/payments/mock/complete', {
      orderId: order.data.payment.id,
      transactionId: checkout.data.transactionId,
    });
    return { bookingId, complete };
  };

  const first = await pay();
  assert.equal(first.complete.data.confirmed, true);

  const second = await pay();
  assert.equal(second.complete.status, 200);
  assert.equal(second.complete.data.confirmed, false);
  assert.equal(second.complete.data.requiresReview, true);
  assert.equal(second.complete.data.booking.status, 'pending_payment');

  const db = readDb(servers.mock);
  const confirmed = db
    .prepare("SELECT COUNT(*) AS n FROM bookings WHERE salon_id IS NOT NULL AND date = ? AND time = ? AND status = 'confirmed'")
    .get(date, time);
  db.close();
  assert.equal(confirmed.n, 1);
});

/* ------------------------------------------------------------------ */
/* 6. Production blocks mock payments                                  */
/* ------------------------------------------------------------------ */

test('production mode refuses mock payment requests', async () => {
  const base = prodBase();
  const config = await makeClient(base).get('/api/public/payments/config');
  assert.equal(config.status, 200);
  assert.equal(config.data.payment.mock, false);
  assert.equal(config.data.payment.mockAllowed, false);
  assert.equal(config.data.payment.mode, 'disabled');

  // With PAYMENT_REQUIRE_ADVANCE=true and no provider, booking creation fails
  // closed instead of silently creating an unpaid confirmation path.
  const booking = await createBooking(base);
  assert.equal(booking.status, 503);
  assert.equal(booking.data.code, 'PAYMENT_UNAVAILABLE');

  const checkout = await makeClient(base).post('/api/public/payments/mock/checkout', {
    orderId: 'anything',
    method: 'upi',
    upiId: 'success@mockupi',
  });
  assert.equal(checkout.status, 403);
  assert.equal(checkout.data.code, 'MOCK_PAYMENT_DISABLED');

  const complete = await makeClient(base).post('/api/public/payments/mock/complete', {
    orderId: 'anything',
    transactionId: 'MOCKTXN-ANY',
  });
  assert.equal(complete.status, 403);
  assert.equal(complete.data.code, 'MOCK_PAYMENT_DISABLED');

  const cancel = await makeClient(base).post('/api/public/payments/mock/cancel', { orderId: 'anything' });
  assert.equal(cancel.status, 403);

  const order = await makeClient(base).post('/api/public/payments/orders', { bookingId: 'anything' });
  assert.equal(order.status, 503);
});

/* ------------------------------------------------------------------ */
/* 7. Razorpay: server-side orders + signature verification            */
/* ------------------------------------------------------------------ */

function signPayment(orderId, paymentId) {
  return crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

test('razorpay orders are created server-side and only valid signatures confirm the booking', async () => {
  const base = rzpBase();
  const bookingRes = await createBooking(base);
  assert.equal(bookingRes.status, 201);
  const bookingId = bookingRes.data.booking.id;
  assert.equal(bookingRes.data.booking.status, 'pending_payment');

  const orderRes = await makeClient(base).post('/api/public/payments/orders', { bookingId });
  assert.equal(orderRes.status, 201, JSON.stringify(orderRes.data));
  assert.equal(orderRes.data.payment.provider, 'razorpay');
  assert.equal(orderRes.data.payment.amountPaise, ADVANCE_PAISE);
  assert.match(orderRes.data.payment.orderId, /^order_test_/);
  assert.ok(stub.orders.has(orderRes.data.payment.orderId), 'order was created through the gateway API');
  assert.equal(stub.orders.get(orderRes.data.payment.orderId).amount, ADVANCE_PAISE);

  const razorpayPaymentId = 'pay_test_success_1';
  stub.payments.set(razorpayPaymentId, {
    id: razorpayPaymentId,
    entity: 'payment',
    order_id: orderRes.data.payment.orderId,
    amount: ADVANCE_PAISE,
    currency: 'INR',
    status: 'captured',
    method: 'upi',
  });

  const badSignature = await makeClient(base).post('/api/public/payments/razorpay/verify', {
    orderId: orderRes.data.payment.id,
    razorpayOrderId: orderRes.data.payment.orderId,
    razorpayPaymentId,
    razorpaySignature: 'a'.repeat(64),
  });
  assert.equal(badSignature.status, 400);
  assert.equal(badSignature.data.code, 'SIGNATURE_MISMATCH');
  assert.equal((await makeClient(base).get(`/api/public/bookings/${bookingId}`)).data.booking.status, 'pending_payment');

  const wrongAmount = await makeClient(base).post('/api/public/payments/razorpay/verify', {
    orderId: orderRes.data.payment.id,
    razorpayOrderId: orderRes.data.payment.orderId,
    razorpayPaymentId,
    razorpaySignature: signPayment(orderRes.data.payment.orderId, razorpayPaymentId),
    amountPaise: ADVANCE_PAISE - 1,
  });
  assert.equal(wrongAmount.status, 400);
  assert.equal(wrongAmount.data.code, 'AMOUNT_MISMATCH');

  const verified = await makeClient(base).post('/api/public/payments/razorpay/verify', {
    orderId: orderRes.data.payment.id,
    razorpayOrderId: orderRes.data.payment.orderId,
    razorpayPaymentId,
    razorpaySignature: signPayment(orderRes.data.payment.orderId, razorpayPaymentId),
  });
  assert.equal(verified.status, 200, JSON.stringify(verified.data));
  assert.equal(verified.data.confirmed, true);
  assert.equal(verified.data.booking.status, 'confirmed');
  assert.equal(verified.data.booking.paymentStatus, 'advance_paid');

  const confirmation = await makeClient(base).get(`/api/public/bookings/${bookingId}/confirmation`);
  assert.equal(confirmation.status, 200);
});

/* ------------------------------------------------------------------ */
/* 8. Razorpay webhooks: verified + idempotent                         */
/* ------------------------------------------------------------------ */

function signWebhook(rawBody) {
  return crypto.createHmac('sha256', RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
}

async function sendWebhook(base, payload, { eventId, signature } = {}) {
  const rawBody = JSON.stringify(payload);
  const res = await fetch(`${base}/api/public/payments/razorpay/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Razorpay-Signature': signature ?? signWebhook(rawBody),
      ...(eventId ? { 'X-Razorpay-Event-Id': eventId } : {}),
    },
    body: rawBody,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

test('webhook processing verifies the signature and is idempotent', async () => {
  const base = rzpBase();
  const bookingRes = await createBooking(base);
  const bookingId = bookingRes.data.booking.id;
  const orderRes = await makeClient(base).post('/api/public/payments/orders', { bookingId });
  const paymentOrder = orderRes.data.payment;

  const payload = {
    entity: 'event',
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_webhook_1',
          order_id: paymentOrder.orderId,
          amount: ADVANCE_PAISE,
          currency: 'INR',
          status: 'captured',
          notes: { bookingId },
        },
      },
    },
  };

  const badSignature = await sendWebhook(base, payload, { eventId: 'evt_bad', signature: '0'.repeat(64) });
  assert.equal(badSignature.status, 400);
  assert.equal(badSignature.data.code, 'INVALID_SIGNATURE');
  assert.equal((await makeClient(base).get(`/api/public/bookings/${bookingId}`)).data.booking.status, 'pending_payment');

  const first = await sendWebhook(base, payload, { eventId: 'evt_captured_1' });
  assert.equal(first.status, 200);
  assert.equal(first.data.status, 'processed');
  assert.equal(first.data.duplicate, false);

  const afterFirst = await makeClient(base).get(`/api/public/bookings/${bookingId}`);
  assert.equal(afterFirst.data.booking.status, 'confirmed');
  const confirmedAt = afterFirst.data.booking.confirmedAt;

  const duplicate = await sendWebhook(base, payload, { eventId: 'evt_captured_1' });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.data.duplicate, true);

  const afterDuplicate = await makeClient(base).get(`/api/public/bookings/${bookingId}`);
  assert.equal(afterDuplicate.data.booking.status, 'confirmed');
  assert.equal(afterDuplicate.data.booking.confirmedAt, confirmedAt);

  // Same payload under a different event id is also a no-op (payment already paid).
  const replayed = await sendWebhook(base, payload, { eventId: 'evt_captured_1_retry' });
  assert.equal(replayed.status, 200);
  assert.equal(replayed.data.status, 'processed');

  // Amount tampering on a *fresh* order is rejected and never confirms it.
  const freshBooking = await createBooking(base);
  const freshOrder = await makeClient(base).post('/api/public/payments/orders', {
    bookingId: freshBooking.data.booking.id,
  });
  const mismatch = await sendWebhook(
    base,
    {
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_tampered',
            order_id: freshOrder.data.payment.orderId,
            amount: ADVANCE_PAISE + 500,
            currency: 'INR',
            status: 'captured',
            notes: { bookingId: freshBooking.data.booking.id },
          },
        },
      },
    },
    { eventId: 'evt_amount_mismatch' }
  );
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.data.status, 'rejected');
  assert.equal(
    (await makeClient(base).get(`/api/public/bookings/${freshBooking.data.booking.id}`)).data.booking.status,
    'pending_payment'
  );

  // Currency tampering is rejected as well.
  const currencyMismatch = await sendWebhook(
    base,
    {
      entity: 'event',
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_webhook_tampered',
            order_id: freshOrder.data.payment.orderId,
            amount: ADVANCE_PAISE,
            currency: 'USD',
            status: 'captured',
            notes: { bookingId: freshBooking.data.booking.id },
          },
        },
      },
    },
    { eventId: 'evt_currency_mismatch' }
  );
  assert.equal(currencyMismatch.status, 200);
  assert.equal(currencyMismatch.data.status, 'rejected');

  const db = readDb(servers.razorpay);
  const paid = db
    .prepare("SELECT COUNT(*) AS n FROM payments WHERE booking_id = ? AND status = 'paid'")
    .get(bookingId);
  const events = db.prepare('SELECT COUNT(*) AS n FROM payment_webhook_events').get();
  db.close();
  assert.equal(paid.n, 1, 'exactly one paid payment row after duplicate webhooks');
  assert.ok(events.n >= 3);
});
