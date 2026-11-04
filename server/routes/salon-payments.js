/**
 * Salon-owner payment dashboard APIs (mounted under /api/salon).
 *
 * Everything is tenant-scoped: the salon is resolved from the authenticated
 * session, and every payment/receipt/booking touched here must belong to it.
 *
 *   GET/PUT /payment-settings        — Booking & Advance Payment Settings
 *   GET/PUT /payment-methods         — Payment Methods (UPI ID, QR, toggles)
 *   GET     /payments                — transactions + advance/balance totals
 *   GET     /payments/summary        — headline numbers
 *   GET     /payments/verification-queue — manual UPI claims awaiting review
 *   POST    /payments/:id/verify     — authorize a claimed UPI transfer
 *   POST    /payments/:id/reject     — reject a claimed UPI transfer
 *   GET     /bookings/:id/receipts   — receipts for one booking
 *   GET     /receipts/:id/pdf        — owner receipt download (no token needed)
 *   GET     /bookings/:id/whatsapp   — notification log
 *   POST    /bookings/:id/whatsapp/retry — retry a failed/skipped send
 *   POST    /bookings/:id/collect-balance — mark balance collected at salon
 */

import { Router } from 'express';
import { db, audit, findSalonByOwner } from '../db.js';
import { HttpError, str, rateLimit } from '../security.js';
import { asyncHandler } from '../middleware.js';
import { resolvePaymentConfig } from '../payments/config.js';
import {
  getSalonPaymentSettings,
  saveSalonPaymentSettings,
  serializeOwnerSettings,
  validateSettingsPatch,
} from '../payments/salon-settings.js';
import {
  recordBalanceCollectedAtSalon,
  rejectManualUpiPayment,
  serializePayment,
  verifyManualUpiPayment,
} from '../payments/service.js';
import { getReceiptRow, receiptViewModel, receiptsForBooking, serializeReceipt } from '../payments/receipts.js';
import {
  notificationsForBooking,
  sendBookingReceiptWhatsApp,
  serializeWhatsAppNotification,
  whatsappPublicStatus,
} from '../notifications/whatsapp.js';
import { serializeBooking } from './bookings.js';

export const salonPaymentsRouter = Router();

const verifyLimiter = rateLimit({ windowMs: 60_000, max: 60, key: 'owner-payment-verify' });
const retryLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, key: 'owner-whatsapp-retry' });

function ownSalon(req) {
  const salon = findSalonByOwner(req.user.id);
  if (!salon) throw new HttpError(409, 'Complete salon onboarding first.', 'ONBOARDING_REQUIRED');
  return salon;
}

function ownPayment(req, paymentId) {
  const salon = ownSalon(req);
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(String(paymentId || ''));
  if (!payment || payment.salon_id !== salon.id) {
    throw new HttpError(404, 'Payment not found.', 'PAYMENT_NOT_FOUND');
  }
  return { salon, payment };
}

function ownBooking(req, bookingId) {
  const salon = ownSalon(req);
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(String(bookingId || ''));
  if (!booking || booking.salon_id !== salon.id) {
    throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
  }
  return { salon, booking };
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

salonPaymentsRouter.get('/payment-settings', (req, res) => {
  const salon = ownSalon(req);
  res.json({
    settings: serializeOwnerSettings(salon.id),
    whatsapp: whatsappPublicStatus(),
  });
});

salonPaymentsRouter.put('/payment-settings', (req, res) => {
  const salon = ownSalon(req);
  const current = getSalonPaymentSettings(salon.id);
  const next = validateSettingsPatch(req.body || {}, current);
  saveSalonPaymentSettings(salon.id, next);
  audit(req, 'salon.payment_settings_updated', 'salon', salon.id, {
    advanceEnabled: next.advanceEnabled,
    advanceType: next.advanceType,
    advancePercent: next.advancePercent,
    advanceFixedPaise: next.advanceFixedPaise,
    balancePolicy: next.balancePolicy,
    manualUpiEnabled: next.manualUpiEnabled,
  });
  res.json({ settings: serializeOwnerSettings(salon.id), whatsapp: whatsappPublicStatus() });
});

salonPaymentsRouter.get('/payment-methods', (req, res) => {
  const salon = ownSalon(req);
  const settings = serializeOwnerSettings(salon.id);
  res.json({
    methods: settings.methods,
    methodLabels: settings.methodLabels,
    upiId: settings.upiId,
    paymentDisplayName: settings.paymentDisplayName,
    upiQrUrl: settings.upiQrUrl,
    manualUpiEnabled: settings.manualUpiEnabled,
    gatewayEnabled: settings.gatewayEnabled,
    channels: settings.channels,
  });
});

salonPaymentsRouter.put('/payment-methods', (req, res) => {
  const salon = ownSalon(req);
  const current = getSalonPaymentSettings(salon.id);
  const b = req.body || {};
  const patch = {};
  for (const key of ['methods', 'upiId', 'paymentDisplayName', 'upiQrUrl', 'manualUpiEnabled', 'gatewayEnabled']) {
    if (b[key] !== undefined) patch[key] = b[key];
  }
  const next = validateSettingsPatch(patch, current);
  saveSalonPaymentSettings(salon.id, next);
  audit(req, 'salon.payment_methods_updated', 'salon', salon.id, {
    manualUpiEnabled: next.manualUpiEnabled,
    gatewayEnabled: next.gatewayEnabled,
    upiId: next.upiId ? '(set)' : '(empty)',
    qr: next.upiQrUrl ? '(set)' : '(empty)',
  });
  const settings = serializeOwnerSettings(salon.id);
  res.json({
    methods: settings.methods,
    methodLabels: settings.methodLabels,
    upiId: settings.upiId,
    paymentDisplayName: settings.paymentDisplayName,
    upiQrUrl: settings.upiQrUrl,
    manualUpiEnabled: settings.manualUpiEnabled,
    gatewayEnabled: settings.gatewayEnabled,
    channels: settings.channels,
  });
});

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

function paymentWithBooking(row) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(row.booking_id);
  const receipt = db.prepare('SELECT * FROM payment_receipts WHERE payment_id = ?').get(row.id);
  const whatsapp = db
    .prepare('SELECT * FROM whatsapp_notifications WHERE booking_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(row.booking_id);
  return {
    ...serializePayment(row),
    salonId: row.salon_id,
    booking: booking ? serializeBooking(booking) : null,
    receipt: receipt ? serializeReceipt(receipt) : null,
    whatsapp: whatsapp ? serializeWhatsAppNotification(whatsapp) : null,
  };
}

salonPaymentsRouter.get('/payments', (req, res) => {
  const salon = ownSalon(req);
  const status = str(req.query.status, { max: 30, field: 'Status' }) || '';
  const rows = status
    ? db.prepare('SELECT * FROM payments WHERE salon_id = ? AND status = ? ORDER BY created_at DESC LIMIT 300').all(salon.id, status)
    : db.prepare('SELECT * FROM payments WHERE salon_id = ? ORDER BY created_at DESC LIMIT 300').all(salon.id);
  res.json({ payments: rows.map(paymentWithBooking) });
});

salonPaymentsRouter.get('/payments/summary', (req, res) => {
  const salon = ownSalon(req);
  const sums = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_paise ELSE 0 END), 0) AS received,
         COALESCE(SUM(CASE WHEN status = 'paid' AND kind = 'advance' THEN amount_paise ELSE 0 END), 0) AS advanceReceived,
         COALESCE(SUM(CASE WHEN status = 'paid' AND kind = 'balance' THEN amount_paise ELSE 0 END), 0) AS balanceReceived,
         SUM(CASE WHEN status = 'verification_pending' THEN 1 ELSE 0 END) AS pendingVerification,
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paidCount,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount
       FROM payments WHERE salon_id = ?`
    )
    .get(salon.id);
  const balances = db
    .prepare(
      `SELECT COALESCE(SUM(amount_paise - advance_paise), 0) AS outstanding
       FROM bookings
       WHERE salon_id = ? AND status IN ('confirmed','advance_paid') AND payment_status = 'advance_paid'`
    )
    .get(salon.id);
  res.json({
    receivedPaise: sums.received,
    advanceReceivedPaise: sums.advanceReceived,
    balanceReceivedPaise: sums.balanceReceived,
    outstandingBalancePaise: balances.outstanding,
    pendingVerificationCount: sums.pendingVerification || 0,
    paidCount: sums.paidCount || 0,
    failedCount: sums.failedCount || 0,
  });
});

salonPaymentsRouter.get('/payments/verification-queue', (req, res) => {
  const salon = ownSalon(req);
  const rows = db
    .prepare(
      `SELECT * FROM payments WHERE salon_id = ? AND provider = 'manual_upi' AND status = 'verification_pending'
       ORDER BY claimed_at ASC LIMIT 100`
    )
    .all(salon.id);
  res.json({ queue: rows.map(paymentWithBooking) });
});

salonPaymentsRouter.post(
  '/payments/:paymentId/verify',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const { payment } = ownPayment(req, req.params.paymentId);
    const result = verifyManualUpiPayment({
      paymentId: payment.id,
      actor: req.user,
      transactionRef: str(req.body?.transactionRef, { max: 60, field: 'Transaction reference' }) || '',
      note: str(req.body?.note, { max: 300, field: 'Note' }) || '',
    });
    audit(req, 'payment.manual_verified', 'payment', payment.id, {
      bookingId: payment.booking_id,
      reference: result.payment?.manual_reference,
      confirmed: result.confirmed,
    });
    res.json({
      confirmed: result.confirmed,
      idempotent: !!result.idempotent,
      message: result.message,
      payment: serializePayment(result.payment),
      booking: serializeBooking(result.booking),
      receipt: result.receipt ? serializeReceipt(result.receipt) : null,
    });
  })
);

salonPaymentsRouter.post(
  '/payments/:paymentId/reject',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const { payment } = ownPayment(req, req.params.paymentId);
    const result = rejectManualUpiPayment({
      paymentId: payment.id,
      actor: req.user,
      note: str(req.body?.note, { max: 300, field: 'Note' }) || '',
    });
    audit(req, 'payment.manual_rejected', 'payment', payment.id, { bookingId: payment.booking_id });
    res.json({
      status: result.status,
      message: result.message,
      payment: serializePayment(result.payment),
      booking: result.booking ? serializeBooking(result.booking) : null,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Receipts                                                            */
/* ------------------------------------------------------------------ */

salonPaymentsRouter.get('/bookings/:bookingId/receipts', (req, res) => {
  const { booking } = ownBooking(req, req.params.bookingId);
  res.json({
    receipts: receiptsForBooking(booking.id).map((r) => serializeReceipt(r, { accessToken: r.access_token })),
  });
});

salonPaymentsRouter.get('/receipts/:receiptId/pdf', (req, res) => {
  const salon = ownSalon(req);
  const receipt = getReceiptRow(req.params.receiptId);
  if (!receipt || receipt.salon_id !== salon.id) {
    throw new HttpError(404, 'Receipt not found.', 'RECEIPT_NOT_FOUND');
  }
  const vm = receiptViewModel(receipt);
  const pdf = vm.pdf();
  audit(req, 'receipt.downloaded', 'receipt', receipt.id, { bookingId: receipt.booking_id });
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="receipt-${vm.booking.reference}-${receipt.receipt_number}.pdf"`);
  res.set('Cache-Control', 'no-store');
  res.send(pdf);
});

/* ------------------------------------------------------------------ */
/* WhatsApp                                                            */
/* ------------------------------------------------------------------ */

salonPaymentsRouter.get('/bookings/:bookingId/whatsapp', (req, res) => {
  const { booking } = ownBooking(req, req.params.bookingId);
  res.json({
    notifications: notificationsForBooking(booking.id).map(serializeWhatsAppNotification),
    provider: whatsappPublicStatus(),
  });
});

salonPaymentsRouter.post(
  '/bookings/:bookingId/whatsapp/retry',
  retryLimiter,
  asyncHandler(async (req, res) => {
    const { booking } = ownBooking(req, req.params.bookingId);
    const result = await sendBookingReceiptWhatsApp({ bookingId: booking.id, force: true });
    audit(req, 'whatsapp.retry', 'booking', booking.id, { status: result.status });
    res.json({
      ok: !!result.ok,
      status: result.status,
      message: result.ok
        ? 'The receipt has been submitted to WhatsApp for delivery.'
        : `WhatsApp send did not complete: ${result.reason || result.status}. The booking remains confirmed and the receipt is downloadable.`,
      notification: result.notification ? serializeWhatsAppNotification(result.notification) : null,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Balance collection                                                  */
/* ------------------------------------------------------------------ */

salonPaymentsRouter.post(
  '/bookings/:bookingId/collect-balance',
  verifyLimiter,
  asyncHandler(async (req, res) => {
    const { booking } = ownBooking(req, req.params.bookingId);
    const result = recordBalanceCollectedAtSalon({ bookingId: booking.id, actor: req.user });
    audit(req, 'payment.balance_collected', 'booking', booking.id, { amountPaise: result.payment.amount_paise });
    res.json({
      message: 'Remaining balance recorded as collected at the salon. A receipt has been issued.',
      booking: serializeBooking(result.booking),
      payment: serializePayment(result.payment),
    });
  })
);

export default salonPaymentsRouter;
