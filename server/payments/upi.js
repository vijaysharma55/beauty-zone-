/**
 * UPI helpers for the salon-owner direct QR flow.
 *
 * A dynamic UPI payment link carries the exact advance amount and the booking
 * reference, so the customer's UPI app pre-fills the correct payee and amount.
 * The QR is rendered server-side as an SVG from the same link.
 *
 * IMPORTANT: scanning a QR (uploaded or generated) never proves payment. The
 * booking stays in `payment_verification_pending` until the salon owner
 * verifies the bank/UPI transaction reference, or a supported gateway
 * callback confirms the payment.
 */

import { QrCode, QrSegment } from './qrcodegen.js';
import { ValidationError } from '../security.js';
import { isValidUpiVpa } from './amounts.js';

/** Builds a standards-compliant upi://pay deep link. */
export function buildUpiPaymentLink({ upiId, displayName, amountPaise, bookingReference, note }) {
  const vpa = String(upiId || '').trim().toLowerCase();
  if (!isValidUpiVpa(vpa)) throw new ValidationError('A valid salon UPI ID is required to build a payment link');
  const amount = (Math.max(0, Math.round(Number(amountPaise) || 0)) / 100).toFixed(2);
  const params = new URLSearchParams();
  params.set('pa', vpa);
  if (displayName) params.set('pn', String(displayName).slice(0, 80));
  params.set('am', amount);
  params.set('cu', 'INR');
  const reference = String(bookingReference || '').slice(0, 35);
  if (reference) {
    params.set('tn', String(note || `Booking ${reference}`).slice(0, 80));
    params.set('tr', reference);
  }
  // URLSearchParams encodes spaces as '+', but UPI apps expect %20.
  const query = params.toString().replace(/\+/g, '%20');
  return `upi://pay?${query}`;
}

/** Renders a real, scannable QR code as a standalone SVG string. */
export function renderQrSvg(text, { size = 264, dark = '#0F172A', light = '#FFFFFF', border = 4 } = {}) {
  const segments = QrSegment.makeSegments(String(text));
  const qr = QrCode.encodeSegments(segments, QrCode.Ecc.MEDIUM);
  const dim = qr.size + border * 2;
  let path = '';
  for (let y = 0; y < qr.size; y += 1) {
    for (let x = 0; x < qr.size; x += 1) {
      if (qr.getModule(x, y)) path += `M${x + border},${y + border}h1v1h-1z`;
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${size}" height="${size}" role="img" aria-label="UPI payment QR code">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}" shape-rendering="crispEdges"/>` +
    `</svg>`
  );
}

/** Normalises an Indian mobile number to E.164 digits (no '+'). */
export function normalizeIndianPhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  if (digits.length < 11 || digits.length > 15) return '';
  return digits;
}
