/**
 * Unit tests for the payment primitives: configuration, amounts, mock test
 * instruments and Razorpay signature verification.
 *
 * Run with: npm run test:unit
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { resolvePaymentConfig, publicPaymentConfig, MOCK_UPI_IDS } from '../payments/config.js';
import { computeAdvancePaise, computePaymentAmounts, deriveMockOutcome } from '../payments/amounts.js';
import {
  createRazorpayOrder,
  signRazorpayPayment,
  signWebhookPayload,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from '../payments/razorpay.js';
import { ValidationError } from '../security.js';

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */

test('local development defaults to mock payments with a 25% advance', () => {
  const config = resolvePaymentConfig({});
  assert.equal(config.mode, 'mock');
  assert.equal(config.mock, true);
  assert.equal(config.mockAllowed, true);
  assert.equal(config.available, true);
  assert.equal(config.advancePercent, 25);
  assert.equal(config.advanceRequired, true);
  assert.equal(config.holdMinutes, 30);
});

test('mock mode is blocked in production', () => {
  const config = resolvePaymentConfig({ NODE_ENV: 'production', PAYMENT_MODE: 'mock' });
  assert.equal(config.mock, false);
  assert.equal(config.mockAllowed, false);
  assert.equal(config.available, false);
  assert.equal(config.mode, 'disabled');
  assert.match(config.reason, /production/i);
});

test('razorpay mode requires credentials before it is available', () => {
  const missing = resolvePaymentConfig({ NODE_ENV: 'production', PAYMENT_MODE: 'razorpay' });
  assert.equal(missing.mode, 'razorpay');
  assert.equal(missing.available, false);
  assert.match(missing.reason, /RAZORPAY_KEY/i);

  const ready = resolvePaymentConfig({
    NODE_ENV: 'production',
    PAYMENT_MODE: 'razorpay',
    RAZORPAY_KEY_ID: 'rzp_test_abc',
    RAZORPAY_KEY_SECRET: 'secret',
    RAZORPAY_WEBHOOK_SECRET: 'whsec',
  });
  assert.equal(ready.available, true);
  assert.equal(ready.advanceRequired, true);
  assert.equal(ready.keyId, 'rzp_test_abc');
});

test('advance percentage parsing handles zero, blanks and out-of-range values', () => {
  assert.equal(resolvePaymentConfig({ PAYMENT_ADVANCE_PERCENT: '0' }).advanceRequired, false);
  assert.equal(resolvePaymentConfig({ PAYMENT_ADVANCE_PERCENT: '' }).advancePercent, 25);
  assert.equal(resolvePaymentConfig({ PAYMENT_ADVANCE_PERCENT: '500' }).advancePercent, 100);
  assert.equal(resolvePaymentConfig({ PAYMENT_ADVANCE_PERCENT: '-10' }).advancePercent, 0);
  assert.equal(
    resolvePaymentConfig({ PAYMENT_MODE: 'mock', PAYMENT_REQUIRE_ADVANCE: 'false' }).advanceRequired,
    false
  );
  assert.equal(resolvePaymentConfig({ PAYMENT_HOLD_MINUTES: '45' }).holdMinutes, 45);
});

test('public payment config never leaks secrets and lists only test UPI IDs', () => {
  const config = resolvePaymentConfig({
    PAYMENT_MODE: 'mock',
    RAZORPAY_KEY_ID: 'rzp_live_should_not_leak',
    RAZORPAY_KEY_SECRET: 'super-secret',
    RAZORPAY_WEBHOOK_SECRET: 'whsec-secret',
  });
  const publicConfig = publicPaymentConfig(config);
  const serialised = JSON.stringify(publicConfig);
  assert.equal(publicConfig.mode, 'mock');
  assert.equal(publicConfig.testNotice, 'TEST MODE — No real money will be charged.');
  assert.deepEqual(
    publicConfig.testUpiIds.map((entry) => entry.id),
    Object.keys(MOCK_UPI_IDS)
  );
  assert.ok(!serialised.includes('super-secret'));
  assert.ok(!serialised.includes('whsec-secret'));
  assert.ok(!serialised.includes('rzp_live_should_not_leak'));
});

/* ------------------------------------------------------------------ */
/* Amounts                                                             */
/* ------------------------------------------------------------------ */

test('advance is computed from the total and rounded to paise', () => {
  assert.equal(computeAdvancePaise(500_000, 25), 125_000);
  assert.equal(computeAdvancePaise(99_900, 25), 24_975);
  assert.equal(computeAdvancePaise(0, 25), 0);
  assert.equal(computeAdvancePaise(500_000, 0), 0);
  assert.equal(computeAdvancePaise(500_000, 100), 500_000);
  // ₹10 floor protects against a near-zero deposit, but never exceeds the total.
  assert.equal(computeAdvancePaise(1_500, 10), 1_000);
  assert.equal(computeAdvancePaise(400, 25), 400);
});

test('payment breakdown separates the advance from the balance', () => {
  const breakdown = computePaymentAmounts({ amountPaise: 249_900, advancePercent: 25 });
  assert.deepEqual(breakdown, {
    totalPaise: 249_900,
    advancePaise: 62_475,
    remainingPaise: 187_425,
    paymentRequired: true,
  });
  const noAdvance = computePaymentAmounts({ amountPaise: 249_900, advancePercent: 25, advanceRequired: false });
  assert.equal(noAdvance.advancePaise, 0);
  assert.equal(noAdvance.paymentRequired, false);
});

/* ------------------------------------------------------------------ */
/* Mock instruments                                                    */
/* ------------------------------------------------------------------ */

test('mock UPI test IDs map to their documented outcomes', () => {
  assert.equal(deriveMockOutcome({ method: 'upi', upiId: 'success@mockupi' }).outcome, 'success');
  assert.equal(deriveMockOutcome({ method: 'upi', upiId: 'failure@mockupi' }).outcome, 'failed');
  assert.equal(deriveMockOutcome({ method: 'upi', upiId: 'pending@mockupi' }).outcome, 'pending');
  assert.equal(deriveMockOutcome({ method: 'upi', upiId: 'CANCEL@MOCKUPI' }).outcome, 'cancelled');
  assert.equal(deriveMockOutcome({ method: 'upi', upiId: 'success@mockupi' }).instrument, 'success@mockupi');
});

test('unknown or real-looking UPI IDs are rejected instead of guessed', () => {
  assert.throws(() => deriveMockOutcome({ method: 'upi', upiId: 'someone@okhdfcbank' }), ValidationError);
  assert.throws(() => deriveMockOutcome({ method: 'upi', upiId: 'not-a-vpa' }), ValidationError);
  assert.throws(() => deriveMockOutcome({ method: 'upi', upiId: '' }), ValidationError);
});

test('mock cards, net banking and wallets are deterministic', () => {
  assert.equal(deriveMockOutcome({ method: 'card', cardNumber: '4111111111111111' }).outcome, 'success');
  assert.equal(deriveMockOutcome({ method: 'card', cardNumber: '4000 0000 0000 0002' }).outcome, 'failed');
  assert.equal(deriveMockOutcome({ method: 'card', cardNumber: '4000000000000006' }).outcome, 'pending');
  assert.throws(() => deriveMockOutcome({ method: 'card', cardNumber: '5555555555554444' }), ValidationError);

  assert.equal(deriveMockOutcome({ method: 'netbanking', bank: 'test_success' }).outcome, 'success');
  assert.equal(deriveMockOutcome({ method: 'netbanking', bank: 'test_failure' }).outcome, 'failed');
  assert.equal(deriveMockOutcome({ method: 'netbanking', bank: 'test_pending' }).outcome, 'pending');
  assert.throws(() => deriveMockOutcome({ method: 'netbanking', bank: 'hdfc' }), ValidationError);

  assert.equal(deriveMockOutcome({ method: 'wallet', wallet: 'test_success' }).outcome, 'success');
  assert.throws(() => deriveMockOutcome({ method: 'wallet', wallet: 'paytm' }), ValidationError);

  assert.throws(() => deriveMockOutcome({ method: 'cash' }), ValidationError);
});

/* ------------------------------------------------------------------ */
/* Razorpay signatures                                                 */
/* ------------------------------------------------------------------ */

const SECRET = 'rzp_test_secret_key';

test('razorpay checkout signature verification accepts only the correct HMAC', () => {
  const orderId = 'order_TEST123';
  const paymentId = 'pay_TEST456';
  const signature = crypto.createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex');

  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: SECRET }), true);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: 'wrong-secret' }), false);
  assert.equal(verifyRazorpaySignature({ orderId: 'order_OTHER', paymentId, signature, secret: SECRET }), false);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId: 'pay_OTHER', signature, secret: SECRET }), false);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: '', secret: SECRET }), false);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature, secret: '' }), false);
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: 'x'.repeat(64), secret: SECRET }), false);
  // Tampered signature of the right length must fail the timing-safe compare.
  const tampered = `${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;
  assert.equal(verifyRazorpaySignature({ orderId, paymentId, signature: tampered, secret: SECRET }), false);
});

test('razorpay webhook signature covers the exact raw payload', () => {
  const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_1' } } } }));
  const signature = crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');

  assert.equal(verifyWebhookSignature({ rawBody, signature, secret: SECRET }), true);
  assert.equal(verifyWebhookSignature({ rawBody: rawBody.toString('utf8'), signature, secret: SECRET }), true);
  assert.equal(verifyWebhookSignature({ rawBody: Buffer.concat([rawBody, Buffer.from(' ')]), signature, secret: SECRET }), false);
  assert.equal(verifyWebhookSignature({ rawBody, signature, secret: 'nope' }), false);
  assert.equal(verifyWebhookSignature({ rawBody, signature: '', secret: SECRET }), false);
});

test('test signature helpers match the Razorpay algorithm', () => {
  const orderId = 'order_A';
  const paymentId = 'pay_B';
  const rawBody = Buffer.from('{"event":"order.paid"}');
  assert.equal(signRazorpayPayment({ orderId, paymentId, secret: SECRET }), crypto.createHmac('sha256', SECRET).update(`${orderId}|${paymentId}`).digest('hex'));
  assert.equal(signWebhookPayload({ rawBody, secret: SECRET }), crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex'));
});

test('razorpay order creation sends the amount server-side and validates the response', async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body);
    return {
      ok: true,
      json: async () => ({ id: 'order_ABC', amount: body.amount, currency: body.currency, status: 'created' }),
    };
  };

  const order = await createRazorpayOrder({
    amountPaise: 62_475,
    receipt: 'SALON-ABC',
    notes: { bookingId: 'booking-1' },
    config: { keyId: 'rzp_test_key', keySecret: SECRET },
    fetchImpl,
  });

  assert.equal(order.id, 'order_ABC');
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/v1\/orders$/);
  assert.match(calls[0].options.headers.Authorization, /^Basic /);
  assert.equal(JSON.parse(calls[0].options.body).amount, 62_475);
  assert.equal(JSON.parse(calls[0].options.body).currency, 'INR');

  await assert.rejects(
    createRazorpayOrder({
      amountPaise: 100,
      config: { keyId: 'rzp_test_key', keySecret: SECRET },
      fetchImpl: async () => ({ ok: true, json: async () => ({ id: 'order_X', amount: 999 }) }),
    }),
    /unexpected order/i
  );

  await assert.rejects(
    createRazorpayOrder({ amountPaise: 100, config: {}, fetchImpl }),
    /not configured/i
  );
});
