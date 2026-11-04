/**
 * Public receipt access.
 *
 * GET  /api/public/receipts/:bookingId          — receipt JSON (token required)
 * GET  /api/public/receipts/:bookingId/pdf      — downloadable PDF (token required)
 * POST /api/public/receipts/:bookingId/whatsapp — re-send the receipt on WhatsApp
 *
 * The token is the random capability issued with the receipt (checkout
 * response + WhatsApp button). Without it, only the authenticated salon owner
 * or a platform admin can read a receipt (see salon-payments.js / admin.js).
 */

import { Router } from 'express';
import { db } from '../db.js';
import { HttpError, rateLimit, str } from '../security.js';
import { asyncHandler } from '../middleware.js';
import { findReceiptByToken, receiptViewModel, serializeReceipt } from '../payments/receipts.js';
import { sendBookingReceiptWhatsApp, serializeWhatsAppNotification, notificationsForBooking } from '../notifications/whatsapp.js';

export const receiptsRouter = Router();

const receiptLimiter = rateLimit({ windowMs: 60_000, max: 60, key: 'receipt' });
const resendLimiter = rateLimit({ windowMs: 15 * 60_000, max: 5, key: 'receipt-whatsapp' });

function requireReceipt(req) {
  const bookingId = str(req.params.bookingId, { max: 80, field: 'Booking', required: true });
  const token = str(req.query.token || req.body?.token, { max: 200, field: 'Receipt token' });
  const receipt = findReceiptByToken(bookingId, token);
  if (!receipt) {
    throw new HttpError(404, 'Receipt not found or the link has expired. Ask the salon to resend it on WhatsApp.', 'RECEIPT_NOT_FOUND');
  }
  return receipt;
}

function receiptPayload(receipt) {
  const vm = receiptViewModel(receipt);
  const { booking, salon, payment } = vm;
  return {
    receipt: serializeReceipt(receipt, { accessToken: receipt.access_token }),
    booking: {
      id: booking.id,
      reference: booking.reference,
      fullName: booking.full_name,
      phone: booking.phone,
      service: booking.service,
      stylist: booking.stylist,
      date: booking.date,
      time: booking.time,
      status: booking.status,
      paymentStatus: booking.payment_status,
      amountPaise: booking.amount_paise,
      advancePaise: booking.advance_paise,
      balancePolicy: booking.balance_policy,
      paymentMethod: booking.payment_method,
      confirmedAt: booking.confirmed_at,
    },
    salon: salon
      ? {
          name: salon.name,
          logoUrl: salon.logo_url,
          phone: salon.phone,
          email: salon.email,
          whatsapp: salon.whatsapp,
          addressLine: salon.address_line,
          city: salon.city,
          state: salon.state,
        }
      : null,
    payment: payment
      ? {
          provider: payment.provider,
          method: payment.method,
          transactionId: payment.provider_payment_id || payment.manual_reference,
          verifiedAt: payment.verified_at,
          status: payment.status,
        }
      : null,
    whatsapp: (() => {
      const latest = notificationsForBooking(booking.id)[0];
      return latest ? { status: latest.status, updatedAt: latest.updated_at } : null;
    })(),
  };
}

receiptsRouter.get(
  '/:bookingId',
  receiptLimiter,
  asyncHandler(async (req, res) => {
    const receipt = requireReceipt(req);
    res.json(receiptPayload(receipt));
  })
);

receiptsRouter.get(
  '/:bookingId/pdf',
  receiptLimiter,
  asyncHandler(async (req, res) => {
    const receipt = requireReceipt(req);
    const vm = receiptViewModel(receipt);
    const pdf = vm.pdf();
    res.set('Content-Type', 'application/pdf');
    res.set('Content-Disposition', `attachment; filename="receipt-${vm.booking.reference}-${receipt.receipt_number}.pdf"`);
    res.set('Cache-Control', 'no-store');
    res.send(pdf);
  })
);

receiptsRouter.post(
  '/:bookingId/whatsapp',
  resendLimiter,
  asyncHandler(async (req, res) => {
    const receipt = requireReceipt(req);
    const result = await sendBookingReceiptWhatsApp({ bookingId: receipt.booking_id, force: true });
    res.json({
      ok: !!result.ok,
      status: result.status,
      message: result.ok
        ? result.alreadySent
          ? 'The receipt was already accepted by WhatsApp for this number.'
          : 'The receipt has been submitted to WhatsApp for delivery.'
        : `WhatsApp send did not complete: ${result.reason || result.status}. The receipt remains downloadable here.`,
      notification: result.notification ? serializeWhatsAppNotification(result.notification) : null,
    });
  })
);

export default receiptsRouter;
