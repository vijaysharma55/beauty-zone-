/**
 * Booking payment APIs.
 *
 * Mounted at both `/api/public/payments` (public checkout) and
 * `/api/payments` (same handlers, convenient for tooling).
 *
 * Every endpoint re-resolves the payment configuration on each request, so a
 * running server can switch between mock and Razorpay mode via environment
 * changes without any client-supplied hint being trusted.
 */

import { Router } from 'express';
import { audit } from '../db.js';
import { HttpError, rateLimit, str } from '../security.js';
import { asyncHandler } from '../middleware.js';
import { publicPaymentConfig, resolvePaymentConfig } from '../payments/config.js';
import { bookingPaymentSummary, isConfirmedStatus, publicBookingStatus, serializeBooking } from './bookings.js';
import {
  cancelMockPayment,
  completeMockPayment,
  createPaymentOrder,
  expireStaleBookingHolds,
  getBookingRow,
  getPaymentRow,
  latestPaymentForBooking,
  processRazorpayWebhook,
  serializePayment,
  startMockCheckout,
  verifyRazorpayPayment,
} from '../payments/service.js';

export const paymentsRouter = Router();

const orderLimiter = rateLimit({ windowMs: 60_000, max: 40, key: 'payment-order' });
const verifyLimiter = rateLimit({ windowMs: 60_000, max: 60, key: 'payment-verify' });
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 120, key: 'payment-webhook' });

function bookingPayload(bookingId) {
  const row = getBookingRow(bookingId);
  const config = resolvePaymentConfig();
  return {
    booking: serializeBooking(row),
    bookingStatus: publicBookingStatus(row),
    paymentSummary: row ? bookingPaymentSummary(row, config) : null,
    confirmed: isConfirmedStatus(row?.status),
    calendarEnabled: isConfirmedStatus(row?.status),
    notificationsEnabled: isConfirmedStatus(row?.status),
  };
}

/** Public, secret-free payment configuration used to render the checkout. */
paymentsRouter.get('/config', (req, res) => {
  res.json({ payment: publicPaymentConfig() });
});

/** Creates the server-side order the checkout will pay against. */
paymentsRouter.post(
  '/orders',
  orderLimiter,
  asyncHandler(async (req, res) => {
    const bookingId = str(req.body?.bookingId, { max: 80, field: 'Booking', required: true });
    const method = str(req.body?.method, { max: 20, field: 'Payment method' }) || '';
    const result = await createPaymentOrder({ bookingId, method });

    audit(req, 'payment.order_created', 'payment', result.payment.id, {
      bookingId,
      provider: result.payment.provider,
      amountPaise: result.payment.amount_paise,
    });

    res.status(201).json({
      payment: serializePayment(result.payment),
      ...bookingPayload(bookingId),
      config: result.config,
    });
  })
);

/** Latest payment attempt + booking state, for polling a pending payment. */
paymentsRouter.get(
  '/orders/:paymentId',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const payment = getPaymentRow(req.params.paymentId);
    if (!payment) throw new HttpError(404, 'Payment order not found.', 'PAYMENT_NOT_FOUND');
    expireStaleBookingHolds();
    res.json({
      payment: serializePayment(payment),
      ...bookingPayload(payment.booking_id),
    });
  })
);

/**
 * Mock checkout — the server decides the outcome from the test instrument and
 * issues the mock transaction id. No real money, no real UPI/payment network.
 */
paymentsRouter.post(
  '/mock/checkout',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const result = startMockCheckout({
      paymentId: str(req.body?.orderId || req.body?.paymentId, {
        max: 80,
        field: 'Payment order',
        required: true,
      }),
      method: str(req.body?.method, { max: 20, field: 'Payment method' }) || '',
      upiId: str(req.body?.upiId, { max: 120, field: 'UPI ID' }) || '',
      cardNumber: str(req.body?.cardNumber, { max: 32, field: 'Card number' }) || '',
      bank: str(req.body?.bank, { max: 40, field: 'Bank' }) || '',
      wallet: str(req.body?.wallet, { max: 40, field: 'Wallet' }) || '',
      requestedOutcome: str(req.body?.requestedOutcome, { max: 20, field: 'Expected outcome' }) || '',
    });

    audit(req, 'payment.mock_checkout', 'payment', result.payment.id, {
      outcome: result.outcome,
      transactionId: result.transactionId,
      method: req.body?.method || '',
    });

    res.json({
      transactionId: result.transactionId,
      outcome: result.outcome,
      message: result.message,
      instrumentLabel: result.instrumentLabel,
      payment: serializePayment(result.payment),
      ...bookingPayload(result.booking.id),
    });
  })
);

/** Verifies the mock transaction against the server ledger and confirms the booking. */
paymentsRouter.post(
  '/mock/complete',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const result = completeMockPayment({
      paymentId: str(req.body?.orderId || req.body?.paymentId, {
        max: 80,
        field: 'Payment order',
        required: true,
      }),
      transactionId: str(req.body?.transactionId, { max: 120, field: 'Transaction' }) || '',
      amountPaise: req.body?.amountPaise,
      currency: req.body?.currency,
    });

    audit(req, 'payment.mock_complete', 'payment', result.payment.id, {
      outcome: result.outcome,
      transactionId: result.transactionId,
      confirmed: result.confirmed,
    });

    res.json({
      status: result.status,
      outcome: result.outcome,
      transactionId: result.transactionId,
      message: result.message,
      confirmed: !!result.confirmed,
      requiresReview: !!result.requiresReview,
      idempotent: !!result.idempotent,
      payment: serializePayment(result.payment),
      ...bookingPayload(result.booking.id),
    });
  })
);

/** Cancels an unpaid mock order (booking stays unconfirmed). */
paymentsRouter.post(
  '/mock/cancel',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const result = cancelMockPayment({
      paymentId: str(req.body?.orderId || req.body?.paymentId, {
        max: 80,
        field: 'Payment order',
        required: true,
      }),
    });

    audit(req, 'payment.mock_cancel', 'payment', result.payment.id, { status: result.status });

    res.json({
      status: 'cancelled',
      message: result.message,
      payment: serializePayment(result.payment),
      ...(result.booking ? bookingPayload(result.booking.id) : {}),
    });
  })
);

/** Razorpay Checkout response verification (HMAC signature). */
paymentsRouter.post(
  '/razorpay/verify',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const result = await verifyRazorpayPayment({
      paymentId: str(req.body?.orderId || req.body?.paymentId, {
        max: 80,
        field: 'Payment order',
        required: true,
      }),
      razorpayOrderId: str(req.body?.razorpayOrderId, { max: 120, field: 'Razorpay order' }),
      razorpayPaymentId: str(req.body?.razorpayPaymentId, { max: 120, field: 'Razorpay payment' }),
      razorpaySignature: str(req.body?.razorpaySignature, { max: 256, field: 'Razorpay signature' }),
      amountPaise: req.body?.amountPaise,
      currency: req.body?.currency,
    });

    audit(req, 'payment.razorpay_verify', 'payment', result.payment.id, {
      confirmed: result.confirmed,
      paymentId: req.body?.razorpayPaymentId || '',
    });

    res.json({
      status: result.status,
      message: result.message,
      confirmed: !!result.confirmed,
      requiresReview: !!result.requiresReview,
      payment: serializePayment(result.payment),
      ...bookingPayload(result.booking.id),
    });
  })
);

/**
 * Razorpay webhook receiver.
 *
 * The raw request body is captured (express.raw) because the HMAC signature is
 * computed over the exact bytes Razorpay sent. Deliveries are recorded by event
 * id, so a retried webhook never double-processes a payment.
 */
paymentsRouter.post(
  '/razorpay/webhook',
  webhookLimiter,
  asyncHandler(async (req, res) => {
    const config = resolvePaymentConfig();
    if (!config.webhookSecret) {
      return res.status(503).json({ error: 'Webhook secret is not configured.', code: 'WEBHOOK_NOT_CONFIGURED' });
    }
    const result = processRazorpayWebhook({
      rawBody: Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ? JSON.stringify(req.body) : ''),
      signature: req.get('x-razorpay-signature') || '',
      eventIdHeader: req.get('x-razorpay-event-id') || '',
    });
    return res.status(200).json(result);
  })
);

export default paymentsRouter;
