/** Full-refund workflow for verified payments.
 *
 * Razorpay refunds are created through the provider API first. Direct UPI/cash
 * refunds are explicitly *owner-recorded*: the API never claims to have moved
 * money or reconciled a bank account. Mock payments cannot be refunded because
 * no real money exists.
 */
import { db, newId, nowIso } from '../db.js';
import { HttpError, str, ValidationError } from '../security.js';
import { resolvePaymentConfig } from './config.js';
import { createRazorpayRefund } from './razorpay.js';
import { getPaymentRow } from './service.js';
import { recordPaymentAudit } from './audit.js';

export function serializeRefund(row) {
  if (!row) return null;
  return {
    id: row.id,
    paymentId: row.payment_id,
    amountPaise: row.amount_paise,
    providerRefundId: row.provider_refund_id || null,
    reference: row.reference || '',
    reason: row.reason || '',
    status: row.status,
    performedBy: row.performed_by || null,
    createdAt: row.created_at,
  };
}

export async function refundPayment({ paymentId, actor, amountPaise, reference = '', reason = '', confirmed = false, fetchImpl }) {
  const payment = getPaymentRow(paymentId);
  if (!payment) throw new HttpError(404, 'Payment not found.', 'PAYMENT_NOT_FOUND');
  if (payment.status !== 'paid') throw new HttpError(409, 'Only verified payments can be refunded.', 'PAYMENT_NOT_VERIFIED');
  if (payment.refunded_at || Number(payment.refunded_amount_paise || 0) > 0) {
    const existing = db.prepare('SELECT * FROM payment_refunds WHERE payment_id = ? ORDER BY created_at DESC LIMIT 1').get(payment.id);
    return { payment, refund: existing, idempotent: true, message: 'This payment was already refunded.' };
  }
  if (payment.provider === 'mock') {
    throw new HttpError(409, 'Mock payments involve no real money and cannot be refunded.', 'MOCK_REFUND_UNAVAILABLE');
  }
  const amount = Number(amountPaise ?? payment.amount_paise);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount !== Number(payment.amount_paise)) {
    throw new ValidationError('Refunds must be for the full verified payment amount.');
  }
  const note = str(reason, { min: 3, max: 500, field: 'Refund reason', required: true });
  const provider = payment.provider;
  let providerRefund = null;
  let refundReference = str(reference, { max: 80, field: 'Refund reference' });

  if (provider === 'razorpay') {
    if (!payment.provider_payment_id) throw new HttpError(409, 'The provider payment ID is missing.', 'PROVIDER_PAYMENT_MISSING');
    providerRefund = await createRazorpayRefund({
      paymentId: payment.provider_payment_id,
      amountPaise: amount,
      notes: { bookingId: payment.booking_id, paymentId: payment.id, reason: note },
      config: resolvePaymentConfig(),
      fetchImpl,
    });
    refundReference = providerRefund.id;
  } else {
    if (confirmed !== true) {
      throw new ValidationError('Confirm that you have already sent this refund from your own UPI/bank account.');
    }
    refundReference = refundReference.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z0-9-]{6,80}$/.test(refundReference)) {
      throw new ValidationError('Enter the actual UPI/bank refund reference (at least 6 characters).');
    }
  }

  const ts = nowIso();
  const id = newId();
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = db.prepare('SELECT refunded_at FROM payments WHERE id = ?').get(payment.id);
    if (current?.refunded_at) throw new HttpError(409, 'This payment was already refunded.', 'PAYMENT_ALREADY_REFUNDED');
    db.prepare(
      `INSERT INTO payment_refunds
         (id, payment_id, salon_id, amount_paise, provider_refund_id, reference, reason, status, performed_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, payment.id, payment.salon_id || null, amount, providerRefund?.id || null,
      refundReference, note, providerRefund ? 'processed' : 'recorded', actor?.id || null, ts
    );
    db.prepare(
      `UPDATE payments SET refunded_amount_paise = ?, refund_reference = ?, refund_reason = ?,
         refunded_at = ?, refunded_by = ?, updated_at = ? WHERE id = ?`
    ).run(amount, refundReference, note, ts, actor?.id || null, ts, payment.id);
    recordPaymentAudit({
      paymentId: payment.id, action: providerRefund ? 'refund.provider_processed' : 'refund.owner_recorded',
      previousStatus: 'verified', newStatus: 'refunded', performedBy: actor?.id,
      notes: `${note} · ${refundReference}`,
    });
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  return {
    payment: getPaymentRow(payment.id),
    refund: db.prepare('SELECT * FROM payment_refunds WHERE id = ?').get(id),
    idempotent: false,
    message: providerRefund
      ? 'The provider accepted the refund. Settlement follows the provider’s refund timeline.'
      : 'Refund recorded from your reference. This is an owner-entered record, not automatic bank confirmation.',
  };
}
