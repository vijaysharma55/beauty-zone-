/**
 * Payment lifecycle for bookings.
 *
 * Booking status is never trusted from a browser. A booking starts life as
 * `pending_payment`; only a verified payment (mock test transaction validated
 * against our own server-side ledger, a Razorpay checkout signature, or a
 * signature-verified Razorpay webhook) can move it to `confirmed`.
 */

import crypto from 'node:crypto';
import { db, newId, nowIso } from '../db.js';
import { HttpError, str } from '../security.js';
import { sendMail } from '../mailer.js';
import { CURRENCY, publicPaymentConfig, resolvePaymentConfig } from './config.js';
import { MOCK_OUTCOMES, deriveMockOutcome, toPaise } from './amounts.js';
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  verifyRazorpaySignature,
  verifyWebhookSignature,
} from './razorpay.js';

const STATUS_BILLABLE = 'pending_payment';

export function serializePayment(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    provider: row.provider,
    method: row.method || '',
    status: row.status,
    orderId: row.provider_order_id,
    transactionId: row.provider_payment_id,
    amountPaise: row.amount_paise,
    totalPaise: row.total_paise,
    remainingPaise: row.remaining_paise,
    currency: row.currency,
    instrument: row.instrument || '',
    failureReason: row.failure_reason || '',
    verifiedAt: row.verified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getPaymentRow(paymentId) {
  const key = str(paymentId, { max: 80, field: 'Payment' });
  if (!key) throw new HttpError(400, 'A payment reference is required.', 'PAYMENT_REQUIRED_FIELD');
  return (
    db.prepare('SELECT * FROM payments WHERE id = ?').get(key) ||
    db.prepare('SELECT * FROM payments WHERE provider_order_id = ?').get(key) ||
    null
  );
}

export function latestPaymentForBooking(bookingId) {
  return db
    .prepare('SELECT * FROM payments WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(bookingId);
}

export function getBookingRow(bookingId) {
  return db.prepare('SELECT * FROM bookings WHERE id = ?').get(String(bookingId || ''));
}

/** Releases unpaid slots once the configured hold window has passed. */
export function expireStaleBookingHolds(config = resolvePaymentConfig()) {
  const cutoff = new Date(Date.now() - config.holdMinutes * 60_000).toISOString();
  try {
    const result = db
      .prepare(
        `UPDATE bookings SET status = 'expired', updated_at = ?
         WHERE status = 'pending_payment'
           AND payment_status IN ('unpaid', 'failed', 'cancelled', 'pending')
           AND created_at < ?`
      )
      .run(nowIso(), cutoff);
    if (result.changes > 0) {
      db.prepare(
        `UPDATE payments SET status = 'expired', updated_at = ?
         WHERE status IN ('created', 'pending') AND created_at < ?`
      ).run(nowIso(), cutoff);
    }
    return result.changes || 0;
  } catch (err) {
    console.error('[payments] hold expiry failed', err.message);
    return 0;
  }
}

function setBookingPaymentStatus(bookingId, paymentStatus) {
  db.prepare('UPDATE bookings SET payment_status = ?, updated_at = ? WHERE id = ?').run(
    paymentStatus,
    nowIso(),
    bookingId
  );
}

function assertMockAllowed(config) {
  if (!config.mockAllowed) {
    throw new HttpError(
      403,
      config.isProduction
        ? 'Mock payments are disabled in production. Configure Razorpay to accept live payments.'
        : 'Mock payments are not enabled. Set PAYMENT_MODE=mock.',
      'MOCK_PAYMENT_DISABLED'
    );
  }
}

/**
 * Creates a payment order for a booking that is awaiting payment.
 * The amount always comes from the booking row, never from the request.
 */
export async function createPaymentOrder({ bookingId, method = '', fetchImpl }) {
  const config = resolvePaymentConfig();
  if (!config.available) {
    throw new HttpError(503, config.reason || 'Online payments are unavailable.', 'PAYMENT_UNAVAILABLE');
  }

  const id = str(bookingId, { required: true, max: 80, field: 'Booking' });
  const booking = getBookingRow(id);
  if (!booking) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');

  if (booking.status === 'confirmed' || booking.status === 'advance_paid' || booking.status === 'completed') {
    throw new HttpError(409, 'This booking is already confirmed.', 'BOOKING_ALREADY_CONFIRMED');
  }
  if (booking.status !== STATUS_BILLABLE) {
    throw new HttpError(409, 'This booking is not awaiting payment.', 'BOOKING_NOT_PAYABLE');
  }
  const amountPaise = toPaise(booking.advance_paise);
  if (amountPaise <= 0) {
    throw new HttpError(409, 'This booking does not require an online payment.', 'NO_PAYMENT_REQUIRED');
  }
  if (Number(booking.amount_paise) <= 0) {
    throw new HttpError(409, 'This booking has no payable amount.', 'INVALID_AMOUNT');
  }

  // Any earlier unfinished attempt is closed so a stale checkout cannot be reused.
  db.prepare(
    `UPDATE payments SET status = 'expired', updated_at = ?
     WHERE booking_id = ? AND status IN ('created', 'pending')`
  ).run(nowIso(), booking.id);

  const requestedMethod = String(method || '').trim().toLowerCase();
  const paymentMethod = ['upi', 'card', 'netbanking', 'wallet'].includes(requestedMethod)
    ? requestedMethod
    : '';

  const paymentId = newId();
  let providerOrderId = '';
  let rawJson = null;

  if (config.mode === 'razorpay') {
    const order = await createRazorpayOrder({
      amountPaise,
      currency: config.currency,
      receipt: booking.reference,
      notes: { bookingId: booking.id, bookingReference: booking.reference },
      config,
      fetchImpl,
    });
    providerOrderId = order.id;
    rawJson = JSON.stringify(order);
  } else {
    providerOrderId = `mock_order_${crypto.randomBytes(10).toString('hex')}`;
  }

  const ts = nowIso();
  db.prepare(
    `INSERT INTO payments
       (id, booking_id, salon_id, provider, method, provider_order_id, provider_payment_id,
        amount_paise, total_paise, remaining_paise, currency, status, failure_reason, instrument,
        raw_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, 'created', '', '', ?, ?, ?)`
  ).run(
    paymentId,
    booking.id,
    booking.salon_id || null,
    config.mode,
    paymentMethod,
    providerOrderId,
    amountPaise,
    toPaise(booking.amount_paise),
    toPaise(booking.amount_paise) - amountPaise,
    config.currency,
    rawJson,
    ts,
    ts
  );

  if (booking.payment_status !== 'unpaid') setBookingPaymentStatus(booking.id, 'unpaid');

  return {
    payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId),
    booking: getBookingRow(booking.id),
    config: publicPaymentConfig(config),
  };
}

/**
 * Simulates a gateway authorisation for a mock order.
 *
 * The outcome is decided here from the test instrument. A browser may state the
 * outcome it expects, but it is only accepted when it matches what the server
 * derived — so a "success" button click can never force a success.
 */
export function startMockCheckout({ paymentId, method, upiId, cardNumber, bank, wallet, requestedOutcome }) {
  const config = resolvePaymentConfig();
  assertMockAllowed(config);

  const payment = getPaymentRow(paymentId);
  if (!payment) throw new HttpError(404, 'Payment order not found.', 'PAYMENT_NOT_FOUND');
  if (payment.provider !== 'mock') {
    throw new HttpError(400, 'This order was not created in mock mode.', 'NOT_MOCK_ORDER');
  }
  if (payment.status === 'paid') {
    throw new HttpError(409, 'This payment has already been completed.', 'PAYMENT_ALREADY_PAID');
  }
  if (payment.status === 'cancelled') {
    throw new HttpError(409, 'This payment was cancelled. Start a new payment attempt.', 'PAYMENT_CANCELLED');
  }
  if (payment.status === 'expired') {
    throw new HttpError(409, 'This payment order expired. Start a new payment attempt.', 'PAYMENT_EXPIRED');
  }

  const booking = getBookingRow(payment.booking_id);
  if (!booking) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
  if (booking.status !== STATUS_BILLABLE) {
    throw new HttpError(409, 'This booking is no longer awaiting payment.', 'BOOKING_NOT_PAYABLE');
  }

  const derived = deriveMockOutcome({ method, upiId, cardNumber, bank, wallet });

  let expectedOutcome = '';
  if (requestedOutcome !== undefined && requestedOutcome !== null && requestedOutcome !== '') {
    expectedOutcome = String(requestedOutcome).trim().toLowerCase();
    if (!MOCK_OUTCOMES.includes(expectedOutcome)) {
      throw new HttpError(400, 'Unknown mock payment outcome.', 'INVALID_MOCK_OUTCOME');
    }
    if (expectedOutcome !== derived.outcome) {
      throw new HttpError(
        409,
        `Mock outcome mismatch: the selected test instrument simulates "${derived.outcome}", not "${expectedOutcome}".`,
        'MOCK_OUTCOME_MISMATCH'
      );
    }
  }

  const transactionId = `MOCKTXN-${crypto.randomBytes(9).toString('hex').toUpperCase()}`;
  const ts = nowIso();

  db.prepare(
    `INSERT INTO mock_transactions
       (id, payment_id, booking_id, provider_order_id, outcome, method, instrument,
        amount_paise, currency, consumed_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`
  ).run(
    transactionId,
    payment.id,
    booking.id,
    payment.provider_order_id,
    derived.outcome,
    String(method).trim().toLowerCase(),
    derived.instrument,
    payment.amount_paise,
    payment.currency,
    ts
  );

  const paymentStatus =
    derived.outcome === 'success'
      ? 'created'
      : derived.outcome === 'pending'
        ? 'pending'
        : derived.outcome === 'cancelled'
          ? 'cancelled'
          : 'failed';

  db.prepare(
    `UPDATE payments SET status = ?, method = ?, instrument = ?, failure_reason = ?, updated_at = ?
     WHERE id = ?`
  ).run(
    paymentStatus,
    String(method).trim().toLowerCase(),
    derived.instrument,
    derived.outcome === 'success' ? '' : derived.message,
    ts,
    payment.id
  );

  if (derived.outcome !== 'success') {
    const bookingPaymentStatus =
      derived.outcome === 'pending' ? 'pending' : derived.outcome === 'cancelled' ? 'cancelled' : 'failed';
    setBookingPaymentStatus(booking.id, bookingPaymentStatus);
  }

  return {
    transactionId,
    outcome: derived.outcome,
    message: derived.message,
    instrumentLabel: derived.instrumentLabel,
    payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
    booking: getBookingRow(booking.id),
  };
}

/** Cancels an unpaid mock order. A cancelled payment can never confirm a booking. */
export function cancelMockPayment({ paymentId }) {
  const config = resolvePaymentConfig();
  assertMockAllowed(config);

  const payment = getPaymentRow(paymentId);
  if (!payment) throw new HttpError(404, 'Payment order not found.', 'PAYMENT_NOT_FOUND');
  if (payment.provider !== 'mock') {
    throw new HttpError(400, 'This order was not created in mock mode.', 'NOT_MOCK_ORDER');
  }
  if (payment.status === 'paid') {
    throw new HttpError(409, 'This payment has already been completed.', 'PAYMENT_ALREADY_PAID');
  }

  const ts = nowIso();
  db.prepare(
    `UPDATE payments SET status = 'cancelled', failure_reason = ?, updated_at = ? WHERE id = ?`
  ).run('Payment cancelled by customer', ts, payment.id);

  const booking = getBookingRow(payment.booking_id);
  if (booking && booking.status === STATUS_BILLABLE) setBookingPaymentStatus(booking.id, 'cancelled');

  return {
    payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
    booking: booking ? getBookingRow(booking.id) : null,
    status: 'cancelled',
    message: 'Payment cancelled. Your slot is held for a short time — you can retry the payment.',
  };
}

function assertPaymentAmounts(payment, booking) {
  if (String(payment.currency).toUpperCase() !== CURRENCY) {
    throw new HttpError(400, 'Unsupported payment currency.', 'CURRENCY_MISMATCH');
  }
  if (toPaise(payment.amount_paise) !== toPaise(booking.advance_paise)) {
    throw new HttpError(409, 'The payment amount no longer matches this booking.', 'AMOUNT_MISMATCH');
  }
  if (toPaise(payment.total_paise) !== toPaise(booking.amount_paise)) {
    throw new HttpError(409, 'The booking total changed after the payment started.', 'AMOUNT_MISMATCH');
  }
}

/**
 * Marks a payment as captured and confirms the booking — once.
 *
 * Re-running this for an already-paid payment is a no-op, which makes webhook
 * retries and double clicks safe.
 */
export function confirmBookingPayment({ paymentId, providerPaymentId, instrument = null, raw = null }) {
  const ts = nowIso();
  db.exec('BEGIN IMMEDIATE');
  try {
    const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId);
    if (!payment) throw new HttpError(404, 'Payment not found.', 'PAYMENT_NOT_FOUND');
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(payment.booking_id);
    if (!booking) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');

    if (payment.status === 'paid') {
      db.exec('COMMIT');
      return {
        confirmed: booking.status === 'confirmed' || booking.status === 'advance_paid',
        idempotent: true,
        payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
        booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id),
      };
    }

    assertPaymentAmounts(payment, booking);

    const markPaid = () => {
      db.prepare(
        `UPDATE payments SET status = 'paid', provider_payment_id = COALESCE(?, provider_payment_id),
           instrument = COALESCE(?, instrument), failure_reason = '', verified_at = ?, updated_at = ?,
           raw_json = COALESCE(?, raw_json)
         WHERE id = ?`
      ).run(providerPaymentId || null, instrument, ts, ts, raw, payment.id);
    };

    if (booking.status !== STATUS_BILLABLE) {
      // Money arrived for a booking that can no longer be honoured (cancelled,
      // expired, already confirmed elsewhere). Record the payment, never confirm.
      markPaid();
      db.exec('COMMIT');
      return {
        confirmed: false,
        requiresReview: true,
        reason: 'booking_not_payable',
        payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
        booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id),
      };
    }

    // Defence in depth: never let two bookings own the same confirmed slot.
    const conflict = booking.salon_id
      ? db
          .prepare(
            `SELECT id, reference FROM bookings
             WHERE salon_id = ? AND date = ? AND time = ? AND id <> ?
               AND status IN ('confirmed', 'advance_paid', 'completed')
             LIMIT 1`
          )
          .get(booking.salon_id, booking.date, booking.time, booking.id)
      : null;

    if (conflict) {
      markPaid();
      db.prepare('UPDATE bookings SET payment_status = ?, updated_at = ? WHERE id = ?').run(
        'paid',
        ts,
        booking.id
      );
      db.exec('COMMIT');
      console.warn('[payments] slot already taken, payment recorded for review', booking.reference);
      return {
        confirmed: false,
        requiresReview: true,
        reason: 'slot_taken',
        payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
        booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id),
      };
    }

    markPaid();
    const paymentStatus = toPaise(booking.advance_paise) >= toPaise(booking.amount_paise) ? 'paid' : 'advance_paid';
    db.prepare(
      `UPDATE bookings
         SET status = 'confirmed', payment_status = ?, advance_paid = ?, advance_paise = ?,
             advance_ref = ?, confirmed_at = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      paymentStatus,
      Math.round(toPaise(booking.advance_paise) / 100),
      toPaise(booking.advance_paise),
      providerPaymentId || payment.provider_payment_id || payment.id,
      ts,
      ts,
      booking.id
    );

    db.exec('COMMIT');
    return {
      confirmed: true,
      idempotent: false,
      payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
      booking: db.prepare('SELECT * FROM bookings WHERE id = ?').get(booking.id),
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // already rolled back
    }
    throw err;
  }
}

/** Verifies the mock transaction that the server itself issued. */
export function completeMockPayment({ paymentId, transactionId, amountPaise, currency }) {
  const config = resolvePaymentConfig();
  assertMockAllowed(config);

  const payment = getPaymentRow(paymentId);
  if (!payment) throw new HttpError(404, 'Payment order not found.', 'PAYMENT_NOT_FOUND');
  if (payment.provider !== 'mock') {
    throw new HttpError(400, 'This order was not created in mock mode.', 'NOT_MOCK_ORDER');
  }

  const txnKey = String(transactionId || '').trim();
  if (!txnKey) throw new HttpError(400, 'A mock transaction ID is required.', 'INVALID_MOCK_TRANSACTION');
  const txn = db.prepare('SELECT * FROM mock_transactions WHERE id = ?').get(txnKey);
  if (!txn || txn.payment_id !== payment.id) {
    throw new HttpError(400, 'Invalid mock transaction ID for this payment.', 'INVALID_MOCK_TRANSACTION');
  }

  if (currency !== undefined && currency !== null && String(currency).toUpperCase() !== CURRENCY) {
    throw new HttpError(400, 'Unsupported payment currency.', 'CURRENCY_MISMATCH');
  }
  if (amountPaise !== undefined && amountPaise !== null && amountPaise !== '') {
    const claimed = Number(amountPaise);
    if (!Number.isInteger(claimed) || claimed !== toPaise(payment.amount_paise)) {
      throw new HttpError(400, 'The payment amount does not match this order.', 'AMOUNT_MISMATCH');
    }
  }
  if (toPaise(txn.amount_paise) !== toPaise(payment.amount_paise)) {
    throw new HttpError(409, 'The mock transaction amount does not match this order.', 'AMOUNT_MISMATCH');
  }

  const booking = getBookingRow(payment.booking_id);
  if (!booking) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');

  if (payment.status === 'paid') {
    return {
      status: 'paid',
      outcome: 'success',
      idempotent: true,
      transactionId: txn.id,
      payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
      booking: getBookingRow(booking.id),
      message: 'This payment was already verified.',
    };
  }

  if (txn.consumed_at && txn.outcome !== 'pending') {
    throw new HttpError(409, 'This mock transaction has already been used.', 'MOCK_TRANSACTION_USED');
  }

  const ts = nowIso();

  if (txn.outcome === 'success') {
    const result = confirmBookingPayment({
      paymentId: payment.id,
      providerPaymentId: txn.id,
      instrument: txn.instrument,
      raw: JSON.stringify({ provider: 'mock', transactionId: txn.id, outcome: txn.outcome }),
    });
    db.prepare('UPDATE mock_transactions SET consumed_at = ? WHERE id = ?').run(ts, txn.id);
    if (result.confirmed && !result.idempotent) {
      notifyBookingConfirmed(result.booking, result.payment);
    }
    return {
      status: result.confirmed ? 'paid' : result.requiresReview ? 'review' : 'pending',
      outcome: 'success',
      transactionId: txn.id,
      payment: result.payment,
      booking: result.booking,
      confirmed: result.confirmed,
      requiresReview: !!result.requiresReview,
      idempotent: !!result.idempotent,
      message: result.confirmed
        ? 'Mock payment verified. Your booking is confirmed.'
        : 'Payment received, but this slot needs manual review. The salon will contact you.',
    };
  }

  const statusMap = { failed: 'failed', pending: 'pending', cancelled: 'cancelled' };
  const nextPaymentStatus = statusMap[txn.outcome] || 'failed';
  db.prepare('UPDATE payments SET status = ?, failure_reason = ?, updated_at = ? WHERE id = ?').run(
    nextPaymentStatus,
    txn.outcome === 'pending' ? 'Awaiting mock bank confirmation' : 'Mock payment ' + txn.outcome,
    ts,
    payment.id
  );
  if (booking.status === STATUS_BILLABLE) setBookingPaymentStatus(booking.id, nextPaymentStatus);
  if (txn.outcome !== 'pending') {
    db.prepare('UPDATE mock_transactions SET consumed_at = ? WHERE id = ?').run(ts, txn.id);
  }

  return {
    status: nextPaymentStatus,
    outcome: txn.outcome,
    transactionId: txn.id,
    payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
    booking: getBookingRow(booking.id),
    confirmed: false,
    message:
      txn.outcome === 'pending'
        ? 'Payment is pending bank confirmation. The booking is not confirmed yet.'
        : 'Payment was not successful. The booking is not confirmed — you can retry.',
  };
}

function isVerifyApiEnabled() {
  return String(process.env.RAZORPAY_VERIFY_PAYMENT_API || '').trim().toLowerCase() !== 'false';
}

/** Verifies a Razorpay Checkout response and confirms the booking. */
export async function verifyRazorpayPayment({
  paymentId,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature,
  amountPaise,
  currency,
  fetchImpl,
}) {
  const config = resolvePaymentConfig();
  if (config.mode !== 'razorpay') {
    throw new HttpError(400, 'This server is not accepting Razorpay payments.', 'PAYMENT_MODE_MISMATCH');
  }
  if (!config.keySecret) {
    throw new HttpError(503, 'Razorpay is not configured on this server.', 'RAZORPAY_NOT_CONFIGURED');
  }

  const payment = getPaymentRow(paymentId);
  if (!payment) throw new HttpError(404, 'Payment order not found.', 'PAYMENT_NOT_FOUND');
  if (payment.provider !== 'razorpay') {
    throw new HttpError(400, 'This order was not created with Razorpay.', 'NOT_RAZORPAY_ORDER');
  }
  if (String(razorpayOrderId || '').trim() !== payment.provider_order_id) {
    throw new HttpError(400, 'The Razorpay order does not match this payment.', 'ORDER_MISMATCH');
  }
  if (currency && String(currency).toUpperCase() !== CURRENCY) {
    throw new HttpError(400, 'Unsupported payment currency.', 'CURRENCY_MISMATCH');
  }
  if (amountPaise !== undefined && amountPaise !== null && amountPaise !== '') {
    const claimed = Number(amountPaise);
    if (!Number.isInteger(claimed) || claimed !== toPaise(payment.amount_paise)) {
      throw new HttpError(400, 'The payment amount does not match this order.', 'AMOUNT_MISMATCH');
    }
  }
  if (payment.status === 'paid') {
    return {
      status: 'paid',
      idempotent: true,
      payment: db.prepare('SELECT * FROM payments WHERE id = ?').get(payment.id),
      booking: getBookingRow(payment.booking_id),
      confirmed: true,
      message: 'This payment was already verified.',
    };
  }

  const signatureOk = verifyRazorpaySignature({
    orderId: payment.provider_order_id,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
    secret: config.keySecret,
  });
  if (!signatureOk) {
    throw new HttpError(400, 'Payment signature verification failed.', 'SIGNATURE_MISMATCH');
  }

  if (isVerifyApiEnabled() && config.keySecret) {
    try {
      const remote = await fetchRazorpayPayment({
        paymentId: razorpayPaymentId,
        config,
        fetchImpl,
      });
      if (remote?.order_id && remote.order_id !== payment.provider_order_id) {
        throw new HttpError(400, 'The gateway payment belongs to another order.', 'ORDER_MISMATCH');
      }
      if (Number(remote?.amount) !== toPaise(payment.amount_paise)) {
        throw new HttpError(400, 'The gateway payment amount does not match this order.', 'AMOUNT_MISMATCH');
      }
      if (String(remote?.currency || CURRENCY).toUpperCase() !== CURRENCY) {
        throw new HttpError(400, 'Unsupported payment currency.', 'CURRENCY_MISMATCH');
      }
      if (!['captured', 'authorized'].includes(String(remote?.status))) {
        throw new HttpError(409, 'The payment is not captured yet.', 'PAYMENT_NOT_CAPTURED');
      }
    } catch (err) {
      if (err instanceof HttpError && err.code !== 'RAZORPAY_PAYMENT_LOOKUP_FAILED') throw err;
      // Signature already proved authenticity; a lookup outage must not block a
      // genuine, signed payment.
      console.warn('[payments] razorpay lookup skipped', err?.message || err);
    }
  }

  const result = confirmBookingPayment({
    paymentId: payment.id,
    providerPaymentId: String(razorpayPaymentId || '').slice(0, 80),
  });

  if (result.confirmed && !result.idempotent) {
    notifyBookingConfirmed(result.booking, result.payment);
  }

  return {
    status: result.confirmed ? 'paid' : 'review',
    payment: result.payment,
    booking: result.booking,
    confirmed: result.confirmed,
    requiresReview: !!result.requiresReview,
    idempotent: !!result.idempotent,
    message: result.confirmed
      ? 'Payment verified. Your booking is confirmed.'
      : 'Payment received, but this slot needs manual review. The salon will contact you.',
  };
}

function newPaymentRowForReconciliation({ booking, orderId, paymentId, amountPaise, currency, raw }) {
  const existing = db.prepare('SELECT * FROM payments WHERE provider_order_id = ?').get(orderId);
  if (existing) return existing;
  const id = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO payments
       (id, booking_id, salon_id, provider, method, provider_order_id, provider_payment_id,
        amount_paise, total_paise, remaining_paise, currency, status, failure_reason, instrument,
        raw_json, created_at, updated_at)
     VALUES (?, ?, ?, 'razorpay', '', ?, ?, ?, ?, ?, ?, 'created', '', '', ?, ?, ?)`
  ).run(
    id,
    booking.id,
    booking.salon_id || null,
    orderId,
    paymentId || null,
    amountPaise,
    toPaise(booking.amount_paise),
    Math.max(0, toPaise(booking.amount_paise) - amountPaise),
    currency || CURRENCY,
    raw,
    ts,
    ts
  );
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id);
}

/**
 * Signature-verified, idempotent Razorpay webhook processing.
 */
export function processRazorpayWebhook({ rawBody, signature, eventIdHeader }) {
  const config = resolvePaymentConfig();
  if (!config.webhookSecret) {
    throw new HttpError(503, 'Razorpay webhook secret is not configured.', 'WEBHOOK_NOT_CONFIGURED');
  }
  if (!verifyWebhookSignature({ rawBody, signature, secret: config.webhookSecret })) {
    throw new HttpError(400, 'Invalid webhook signature.', 'INVALID_SIGNATURE');
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody || ''), 'utf8');
  let event;
  try {
    event = JSON.parse(bodyBuffer.toString('utf8'));
  } catch {
    throw new HttpError(400, 'Malformed webhook payload.', 'INVALID_PAYLOAD');
  }

  const eventType = String(event?.event || '').slice(0, 80);
  const eventKey =
    String(eventIdHeader || '').trim().slice(0, 120) ||
    `sha256:${crypto.createHash('sha256').update(bodyBuffer).digest('hex')}`;
  const payloadHash = crypto.createHash('sha256').update(bodyBuffer).digest('hex');
  const ts = nowIso();

  const existing = db.prepare('SELECT * FROM payment_webhook_events WHERE id = ?').get(eventKey);
  if (existing && existing.status === 'processed') {
    return { ok: true, duplicate: true, status: 'processed', eventType, eventId: eventKey };
  }
  if (!existing) {
    db.prepare(
      `INSERT INTO payment_webhook_events (id, provider, event_type, payload_hash, status, result, received_at)
       VALUES (?, 'razorpay', ?, ?, 'received', '', ?)`
    ).run(eventKey, eventType, payloadHash, ts);
  } else {
    db.prepare('UPDATE payment_webhook_events SET status = ?, result = ?, received_at = ? WHERE id = ?').run(
      'received',
      '',
      ts,
      eventKey
    );
  }

  const finish = (status, result, payload) => {
    db.prepare('UPDATE payment_webhook_events SET status = ?, result = ?, processed_at = ? WHERE id = ?').run(
      status,
      JSON.stringify(result).slice(0, 2000),
      nowIso(),
      eventKey
    );
    return { ok: true, duplicate: false, status, eventType, eventId: eventKey, ...payload };
  };

  const paymentEntity = event?.payload?.payment?.entity || null;
  const orderEntity = event?.payload?.order?.entity || null;
  const entity = paymentEntity || orderEntity;

  if (!['payment.captured', 'order.paid', 'payment.failed', 'payment.authorized'].includes(eventType)) {
    return finish('ignored', { reason: 'event_ignored', eventType });
  }
  if (!entity) return finish('ignored', { reason: 'no_entity', eventType });

  const orderId = String(entity.order_id || (orderEntity ? orderEntity.id : '') || '').slice(0, 120);
  const providerPaymentId = paymentEntity ? String(paymentEntity.id || '').slice(0, 120) : '';
  const amount = Number(entity.amount);
  const currency = String(entity.currency || CURRENCY).toUpperCase();
  const notes = entity.notes || {};

  let payment = orderId
    ? db.prepare('SELECT * FROM payments WHERE provider_order_id = ?').get(orderId)
    : null;

  if (!payment) {
    const bookingFromNotes = notes.bookingId || notes.booking_id;
    if (bookingFromNotes) {
      const booking = getBookingRow(bookingFromNotes);
      if (booking) {
        payment = newPaymentRowForReconciliation({
          booking,
          orderId,
          paymentId: providerPaymentId || null,
          amountPaise: Number.isInteger(amount) ? amount : toPaise(booking.advance_paise),
          currency,
          raw: JSON.stringify(entity).slice(0, 4000),
        });
      }
    }
  }

  if (!payment) {
    return finish('ignored', { reason: 'unknown_order', orderId });
  }

  if (eventType === 'payment.failed') {
    db.prepare(
      `UPDATE payments SET status = 'failed', failure_reason = ?, updated_at = ?
       WHERE id = ? AND status <> 'paid'`
    ).run(String(paymentEntity?.error_description || 'Payment failed at the gateway').slice(0, 300), nowIso(), payment.id);
    const booking = getBookingRow(payment.booking_id);
    if (booking && booking.status === STATUS_BILLABLE && booking.payment_status !== 'paid') {
      setBookingPaymentStatus(booking.id, 'failed');
    }
    return finish('processed', { reason: 'payment_failed', paymentId: payment.id });
  }

  if (payment.status === 'paid') {
    return finish('processed', { reason: 'already_paid', paymentId: payment.id, paymentRowId: payment.id });
  }

  if (Number.isInteger(amount) && amount !== toPaise(payment.amount_paise)) {
    return finish('rejected', { reason: 'amount_mismatch', expected: payment.amount_paise, received: amount });
  }
  if (currency !== CURRENCY) {
    return finish('rejected', { reason: 'currency_mismatch', received: currency });
  }
  if (orderId && payment.provider_order_id && orderId !== payment.provider_order_id) {
    return finish('rejected', { reason: 'order_mismatch' });
  }

  const result = confirmBookingPayment({
    paymentId: payment.id,
    providerPaymentId: providerPaymentId || payment.provider_payment_id || null,
    raw: JSON.stringify(entity).slice(0, 4000),
  });

  if (result.confirmed && !result.idempotent) {
    notifyBookingConfirmed(result.booking, result.payment);
  }

  return finish('processed', {
    reason: result.idempotent ? 'idempotent' : result.confirmed ? 'confirmed' : 'review',
    paymentId: payment.id,
    bookingId: payment.booking_id,
  });
}

/** Best-effort confirmation email for the salon owner. */
export function notifyBookingConfirmed(booking, payment) {
  if (!booking?.salon_id) return;
  try {
    const salon = db.prepare('SELECT * FROM salons WHERE id = ?').get(booking.salon_id);
    const owner = salon ? db.prepare('SELECT * FROM users WHERE id = ?').get(salon.owner_id) : null;
    if (!owner?.email) return;
    sendMail({
      to: owner.email,
      subject: `Payment received — booking ${booking.reference} confirmed`,
      tag: 'booking-confirmed',
      text: [
        `A booking for ${salon.name} has been paid and confirmed.`,
        '',
        `Reference : ${booking.reference}`,
        `Client    : ${booking.full_name} (${booking.phone})`,
        `Service   : ${booking.service}`,
        `When      : ${booking.date} at ${booking.time}`,
        `Paid now  : ₹${(Number(payment.amount_paise) / 100).toFixed(2)} (${payment.provider})`,
        `Received  : ${payment.provider_payment_id || payment.id}`,
        '',
        'The appointment is now visible as confirmed in your dashboard.',
      ].join('\n'),
    }).catch((err) => console.error('[payments] confirmation email failed', err.message));
  } catch (err) {
    console.error('[payments] confirmation notification failed', err.message);
  }
}
