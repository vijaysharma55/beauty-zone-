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
import { audit, findSalonBySlug } from '../db.js';
import { HttpError, rateLimit, str } from '../security.js';
import { asyncHandler } from '../middleware.js';
import { publicPaymentConfig, resolvePaymentConfig } from '../payments/config.js';
import { bookingPaymentSummary, isConfirmedStatus, publicBookingStatus, serializeBooking } from './bookings.js';
import { publicSalonPaymentSummary } from '../payments/salon-settings.js';
import { buildUpiPaymentLink, renderQrSvg } from '../payments/upi.js';
import { serializeReceipt } from '../payments/receipts.js';
import { savePaymentProof } from '../payments/proofs.js';
import { safeJson } from '../db.js';
import { getSalonPaymentSettings } from '../payments/salon-settings.js';
import {
  cancelMockPayment,
  claimManualUpiPayment,
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

/** Public, secret-free payment configuration used to render the checkout.
 *  Pass ?salon=<slug> to include that salon's owner-configured advance rules,
 *  enabled methods and UPI QR details (no secrets). */
paymentsRouter.get('/config', (req, res) => {
  const config = resolvePaymentConfig();
  const slug = str(req.query.salon, { max: 60, field: 'Salon' });
  let salonPayment = null;
  if (slug) {
    const salon = findSalonBySlug(slug);
    if (salon) salonPayment = publicSalonPaymentSummary(salon.id, config);
  }
  res.json({ payment: publicPaymentConfig(config), salonPayment });
});

/** Creates the server-side order the checkout will pay against. */
paymentsRouter.post(
  '/orders',
  orderLimiter,
  asyncHandler(async (req, res) => {
    const bookingId = str(req.body?.bookingId, { max: 80, field: 'Booking', required: true });
    const method = str(req.body?.method, { max: 20, field: 'Payment method' }) || '';
    const kind = str(req.body?.kind, { max: 10, field: 'Payment kind' }) || 'advance';
    const result = await createPaymentOrder({ bookingId, method, kind });

    audit(req, 'payment.order_created', 'payment', result.payment.id, {
      bookingId,
      provider: result.payment.provider,
      kind: result.payment.kind,
      amountPaise: result.payment.amount_paise,
    });

    res.status(201).json({
      payment: serializePayment(result.payment),
      ...bookingPayload(bookingId),
      config: result.config,
      ...(result.manualUpi ? { manualUpi: result.manualUpi } : {}),
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
      receipt: result.receipt ? serializeReceipt(result.receipt, { accessToken: result.receiptAccessToken }) : null,
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
      receipt: result.receipt ? serializeReceipt(result.receipt, { accessToken: result.receiptAccessToken }) : null,
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

/**
 * Dynamic UPI QR for a manual order — a real scannable SVG carrying the exact
 * amount and booking reference. Scanning it never proves payment by itself.
 */
paymentsRouter.get(
  '/orders/:paymentId/upi-qr',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const payment = getPaymentRow(req.params.paymentId);
    if (!payment) throw new HttpError(404, 'Payment order not found.', 'PAYMENT_NOT_FOUND');
    if (payment.provider !== 'manual_upi') {
      throw new HttpError(400, 'This order is not a direct UPI QR payment.', 'NOT_MANUAL_ORDER');
    }
    const booking = getBookingRow(payment.booking_id);
    const current = getSalonPaymentSettings(payment.salon_id);
    const settings = safeJson(payment.raw_json, {}).manualUpi || current;
    if (!settings.upiId) throw new HttpError(409, 'The salon UPI ID is not configured.', 'UPI_NOT_CONFIGURED');
    const link = buildUpiPaymentLink({
      upiId: settings.upiId,
      displayName: settings.displayName ?? settings.paymentDisplayName,
      amountPaise: payment.amount_paise,
      bookingReference: booking?.reference || '',
    });
    const svg = renderQrSvg(link);
    res.set('Content-Type', 'image/svg+xml');
    res.set('Cache-Control', 'no-store');
    res.send(svg);
  })
);

/** Private supporting-evidence upload. This never changes payment status. */
paymentsRouter.post(
  '/manual/proof',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const paymentId = str(req.query.orderId, { max: 80, field: 'Payment order', required: true });
    const result = savePaymentProof({ paymentId, buffer: req.body, contentType: req.get('content-type') || '' });
    res.status(201).json({ ...result, verified: false, message: 'Proof uploaded for salon review. It does not confirm payment.' });
  })
);

/**
 * Customer submits the UPI transaction reference for a manual QR payment.
 * The booking moves to `payment_verification_pending` — it is NEVER confirmed
 * here. Only the salon owner's verification (or a gateway callback) can
 * confirm it.
 */
paymentsRouter.post(
  '/manual/claim',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const result = claimManualUpiPayment({
      paymentId: str(req.body?.orderId || req.body?.paymentId, {
        max: 80,
        field: 'Payment order',
        required: true,
      }),
      reference: str(req.body?.reference || req.body?.transactionRef, {
        max: 60,
        field: 'UPI transaction reference',
        required: true,
      }),
      note: str(req.body?.note, { max: 300, field: 'Note' }) || '',
    });

    audit(req, 'payment.manual_claimed', 'payment', result.payment.id, {
      reference: result.payment.manual_reference,
      bookingId: result.payment.booking_id,
    });

    res.json({
      status: result.status,
      message: result.message,
      confirmed: false,
      payment: serializePayment(result.payment),
      ...bookingPayload(result.booking.id),
    });
  })
);

export default paymentsRouter;
