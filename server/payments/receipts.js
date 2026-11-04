/**
 * Payment receipts.
 *
 * A receipt is issued exactly once per verified payment (unique payment_id).
 * The public download link carries a random 192-bit capability token stored
 * server-side; it is only ever handed to the paying customer (checkout
 * response + WhatsApp message). Salon owners and admins download receipts
 * through authenticated dashboard endpoints without needing the token.
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, newId, nowIso, UPLOAD_DIR } from '../db.js';
import { HttpError } from '../security.js';
import { buildReceiptPdf } from './pdf.js';
import { PAYMENT_METHOD_LABELS } from './salon-settings.js';

export function methodLabel(method, provider) {
  if (PAYMENT_METHOD_LABELS[method]) return PAYMENT_METHOD_LABELS[method];
  if (provider === 'manual_upi') return 'UPI (direct to salon QR)';
  if (method === 'upi') return 'UPI';
  return method ? String(method).toUpperCase() : provider === 'razorpay' ? 'Razorpay' : 'Online payment';
}

function makeReceiptNumber() {
  const year = new Date().getUTCFullYear();
  for (let i = 0; i < 5; i += 1) {
    const candidate = `RCP-${year}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    if (!db.prepare('SELECT 1 FROM payment_receipts WHERE receipt_number = ?').get(candidate)) {
      return candidate;
    }
  }
  return `RCP-${year}-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
}

/**
 * Issues the receipt for a verified payment (idempotent).
 * Returns { receipt, accessToken, created }.
 */
export function issueReceiptForPayment(booking, payment) {
  const existing = db.prepare('SELECT * FROM payment_receipts WHERE payment_id = ?').get(payment.id);
  if (existing) return { receipt: existing, accessToken: existing.access_token, created: false };

  const id = newId();
  const accessToken = crypto.randomBytes(24).toString('base64url');
  const totalPaise = Number(booking.amount_paise) || 0;
  const paidPaise = Number(payment.amount_paise) || 0;
  const alreadyPaid = db
    .prepare("SELECT COALESCE(SUM(amount_paise), 0) AS n FROM payments WHERE booking_id = ? AND status = 'paid' AND id <> ?")
    .get(booking.id, payment.id).n;
  const remainingPaise = Math.max(0, totalPaise - alreadyPaid - paidPaise);

  db.prepare(
    `INSERT INTO payment_receipts
       (id, receipt_number, booking_id, payment_id, salon_id, access_token, kind,
        total_paise, paid_paise, remaining_paise, method, transaction_ref, currency, issued_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    makeReceiptNumber(),
    booking.id,
    payment.id,
    booking.salon_id || null,
    accessToken,
    payment.kind || 'advance',
    totalPaise,
    paidPaise,
    remainingPaise,
    methodLabel(payment.method, payment.provider),
    payment.provider_payment_id || payment.manual_reference || payment.id,
    payment.currency || 'INR',
    nowIso()
  );
  return { receipt: db.prepare('SELECT * FROM payment_receipts WHERE id = ?').get(id), accessToken, created: true };
}

export function getReceiptRow(receiptId) {
  return db.prepare('SELECT * FROM payment_receipts WHERE id = ?').get(String(receiptId || '')) || null;
}

export function receiptsForBooking(bookingId) {
  return db.prepare('SELECT * FROM payment_receipts WHERE booking_id = ? ORDER BY issued_at ASC').all(bookingId);
}

/**
 * Public access: the booking id plus the secret token issued with the receipt.
 * The token is compared timing-safely via its hash.
 */
export function findReceiptByToken(bookingId, token) {
  const key = String(token || '').trim();
  if (!key || key.length > 200) return null;
  const rows = db.prepare('SELECT * FROM payment_receipts WHERE booking_id = ?').all(String(bookingId || ''));
  for (const row of rows) {
    const a = Buffer.from(String(row.access_token || ''), 'utf8');
    const b = Buffer.from(key, 'utf8');
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return row;
  }
  return null;
}

export function serializeReceipt(row, { accessToken = null, baseUrl = '' } = {}) {
  if (!row) return null;
  const suffix = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return {
    id: row.id,
    receiptNumber: row.receipt_number,
    bookingId: row.booking_id,
    paymentId: row.payment_id,
    kind: row.kind,
    totalPaise: row.total_paise,
    paidPaise: row.paid_paise,
    remainingPaise: row.remaining_paise,
    method: row.method,
    transactionRef: row.transaction_ref,
    currency: row.currency,
    issuedAt: row.issued_at,
    viewUrl: `${baseUrl}/receipt/${row.booking_id}${suffix}`,
    pdfUrl: `/api/public/receipts/${row.booking_id}/pdf${suffix}`,
  };
}

function loadLogoJpeg(salon) {
  try {
    const url = String(salon?.logo_url || '');
    const m = url.match(/^\/api\/uploads\/([A-Za-z0-9._-]+)$/);
    if (m) {
      const file = path.join(UPLOAD_DIR, m[1]);
      if (fs.existsSync(file)) {
        const buffer = fs.readFileSync(file);
        if (buffer[0] === 0xff && buffer[1] === 0xd8) return buffer;
      }
    }
    const data = url.match(/^data:image\/jpe?g;base64,([A-Za-z0-9+/=]+)$/);
    if (data) return Buffer.from(data[1], 'base64');
  } catch {
    // Logo is decorative; a receipt must never fail because of it.
  }
  return null;
}

export function paymentStatusBookingLabel(booking) {
  const status = booking?.payment_status;
  if (status === 'paid') return 'PAID IN FULL';
  if (status === 'advance_paid') return 'ADVANCE PAID';
  if (status === 'refunded') return 'REFUNDED';
  return String(status || '').toUpperCase();
}

/** Assembles the full receipt view model (used by JSON + PDF endpoints). */
export function receiptViewModel(receiptRow) {
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(receiptRow.booking_id);
  if (!booking) throw new HttpError(404, 'Booking not found.', 'BOOKING_NOT_FOUND');
  const salon = booking.salon_id ? db.prepare('SELECT * FROM salons WHERE id = ?').get(booking.salon_id) : null;
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(receiptRow.payment_id);
  return {
    receipt: receiptRow,
    booking,
    salon,
    payment,
    pdf: () =>
      buildReceiptPdf({
        salonName: salon?.name || 'Salon',
        salonAddress: [salon?.address_line, salon?.city, salon?.state].filter(Boolean).join(', '),
        salonPhone: salon?.phone || '',
        salonEmail: salon?.email || '',
        accent: '#B37E28',
        logoJpeg: loadLogoJpeg(salon),
        receiptNumber: receiptRow.receipt_number,
        receiptId: receiptRow.id,
        issuedAt: String(receiptRow.issued_at || '').replace('T', ' ').slice(0, 16) + ' UTC',
        bookingReference: booking.reference,
        bookingStatusLabel: String(booking.status || '').toUpperCase(),
        paymentStatusLabel: paymentStatusBookingLabel(booking),
        customerName: booking.full_name,
        customerPhone: booking.phone,
        service: booking.service,
        stylist: booking.stylist || '',
        date: booking.date,
        time: booking.time,
        totalPaise: receiptRow.total_paise,
        paidPaise: receiptRow.paid_paise,
        remainingPaise: receiptRow.remaining_paise,
        balancePolicy: booking.balance_policy || 'at_salon',
        kind: receiptRow.kind,
        methodLabel: receiptRow.method,
        transactionRef: receiptRow.transaction_ref,
        currency: receiptRow.currency,
        verifiedAt: payment?.verified_at ? String(payment.verified_at).replace('T', ' ').slice(0, 16) + ' UTC' : '',
      }),
  };
}
