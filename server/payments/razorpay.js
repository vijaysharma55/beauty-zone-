/**
 * Razorpay integration helpers.
 *
 * Everything here is server-side: the key secret never leaves this module and
 * the browser only ever receives the public `key_id` plus an order id.
 *
 * Signature verification uses HMAC-SHA256 with a timing-safe comparison:
 *   - checkout:  HMAC(order_id + "|" + payment_id, key_secret)
 *   - webhook:   HMAC(raw request body, webhook_secret)
 */

import crypto from 'node:crypto';
import { HttpError } from '../security.js';

/**
 * Base URL for the Razorpay REST API. Overridable so automated tests (and a
 * private proxy in locked-down networks) can point at a stub; production leaves
 * the default untouched.
 */
function apiBase() {
  const custom = String(process.env.RAZORPAY_API_BASE || '').trim().replace(/\/+$/, '');
  return custom || 'https://api.razorpay.com/v1';
}

function authHeader(config) {
  return `Basic ${Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64')}`;
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''), 'utf8');
  const right = Buffer.from(String(b || ''), 'utf8');
  if (left.length === 0 || left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function hmacHex(secret, payload) {
  return crypto.createHmac('sha256', String(secret)).update(payload).digest('hex');
}

/** Signature returned to Razorpay Checkout after a successful payment. */
export function verifyRazorpaySignature({ orderId, paymentId, signature, secret }) {
  if (!orderId || !paymentId || !signature || !secret) return false;
  return safeEqual(hmacHex(secret, `${orderId}|${paymentId}`), String(signature).trim());
}

/** `X-Razorpay-Signature` for a webhook delivery. */
export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  return safeEqual(hmacHex(secret, body), String(signature).trim());
}

export function signRazorpayPayment({ orderId, paymentId, secret }) {
  return hmacHex(secret, `${orderId}|${paymentId}`);
}

export function signWebhookPayload({ rawBody, secret }) {
  return hmacHex(secret, rawBody);
}

export async function createRazorpayOrder({
  amountPaise,
  currency = 'INR',
  receipt,
  notes,
  linkedAccountId = '',
  config,
  fetchImpl = globalThis.fetch,
}) {
  if (!config?.keyId || !config?.keySecret) {
    throw new HttpError(503, 'Razorpay is not configured on this server.', 'RAZORPAY_NOT_CONFIGURED');
  }
  const amount = Number(amountPaise);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, 'Invalid payment amount.', 'INVALID_AMOUNT');
  }

  let response;
  try {
    response = await fetchImpl(`${apiBase()}/orders`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(config),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt: String(receipt || '').slice(0, 40),
        notes: notes || {},
        payment_capture: 1,
        // Razorpay Route transfers settle to the salon's linked account under
        // the provider's rules. Never add a transfer without verified KYC.
        ...(linkedAccountId
          ? { transfers: [{ account: linkedAccountId, amount, currency, notes: notes || {}, on_hold: false }] }
          : {}),
      }),
    });
  } catch (err) {
    console.error('[razorpay] order request failed', err?.message || err);
    throw new HttpError(502, 'Could not reach the payment gateway. Please try again.', 'RAZORPAY_UNREACHABLE');
  }

  if (!response.ok) {
    console.error('[razorpay] order rejected', response.status);
    throw new HttpError(502, 'The payment gateway rejected the order. Please try again.', 'RAZORPAY_ORDER_FAILED');
  }

  const order = await response.json().catch(() => null);
  if (!order?.id || Number(order.amount) !== amount) {
    throw new HttpError(502, 'The payment gateway returned an unexpected order.', 'RAZORPAY_ORDER_INVALID');
  }
  return order;
}

export async function createRazorpayRefund({
  paymentId,
  amountPaise,
  notes,
  config,
  fetchImpl = globalThis.fetch,
}) {
  if (!config?.keyId || !config?.keySecret) {
    throw new HttpError(503, 'Razorpay is not configured on this server.', 'RAZORPAY_NOT_CONFIGURED');
  }
  const amount = Number(amountPaise);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, 'Invalid refund amount.', 'INVALID_REFUND_AMOUNT');
  }
  let response;
  try {
    response = await fetchImpl(`${apiBase()}/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: 'POST',
      headers: { Authorization: authHeader(config), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, notes: notes || {} }),
    });
  } catch (err) {
    console.error('[razorpay] refund request failed', err?.message || err);
    throw new HttpError(502, 'Could not reach the payment gateway. No refund was recorded.', 'RAZORPAY_UNREACHABLE');
  }
  if (!response.ok) {
    console.error('[razorpay] refund rejected', response.status);
    throw new HttpError(502, 'The payment gateway rejected the refund. No refund was recorded.', 'RAZORPAY_REFUND_FAILED');
  }
  const refund = await response.json().catch(() => null);
  if (!refund?.id || Number(refund.amount) !== amount) {
    throw new HttpError(502, 'The gateway returned an invalid refund response. Check the provider dashboard before retrying.', 'RAZORPAY_REFUND_INVALID');
  }
  return refund;
}

export async function fetchRazorpayPayment({ paymentId, config, fetchImpl = globalThis.fetch }) {
  if (!config?.keyId || !config?.keySecret) {
    throw new HttpError(503, 'Razorpay is not configured on this server.', 'RAZORPAY_NOT_CONFIGURED');
  }
  const response = await fetchImpl(`${apiBase()}/payments/${encodeURIComponent(paymentId)}`, {
    method: 'GET',
    headers: { Authorization: authHeader(config) },
  });
  if (!response.ok) {
    throw new HttpError(502, 'Could not load the payment from the gateway.', 'RAZORPAY_PAYMENT_LOOKUP_FAILED');
  }
  return response.json();
}
