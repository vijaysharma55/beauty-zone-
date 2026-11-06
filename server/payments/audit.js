/**
 * Append-only payment audit trail.
 *
 * These records are intentionally separate from the general application audit
 * log: they contain the payment state transition needed for reconciliation and
 * are exposed only to the owning salon and platform administrators.
 */
import { db, newId, nowIso } from '../db.js';

export function paymentDisplayStatus(row) {
  if (row?.refunded_at || Number(row?.refunded_amount_paise || 0) > 0) return 'refunded';
  if (row?.status === 'paid') return 'verified';
  if (row?.status === 'failed') return 'rejected';
  if (row?.status === 'verification_pending') return 'pending_verification';
  return row?.status || 'unknown';
}

export function recordPaymentAudit({
  paymentId,
  salonId = null,
  action,
  previousStatus = null,
  newStatus = null,
  performedBy = null,
  notes = '',
}) {
  const payment = paymentId ? db.prepare('SELECT id, salon_id FROM payments WHERE id = ?').get(paymentId) : null;
  if (!payment && !salonId) return null;
  const id = newId();
  db.prepare(
    `INSERT INTO payment_audit_logs
       (id, payment_id, salon_id, action, previous_status, new_status, performed_by, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    payment?.id || paymentId || null,
    salonId || payment?.salon_id || null,
    String(action).slice(0, 80),
    previousStatus,
    newStatus,
    performedBy || null,
    String(notes || '').slice(0, 1000),
    nowIso()
  );
  return id;
}

export function paymentAuditHistory(paymentId, salonId = null) {
  const rows = salonId
    ? db.prepare('SELECT * FROM payment_audit_logs WHERE payment_id = ? AND salon_id = ? ORDER BY created_at ASC').all(paymentId, salonId)
    : db.prepare('SELECT * FROM payment_audit_logs WHERE payment_id = ? ORDER BY created_at ASC').all(paymentId);
  return rows.map((row) => ({
    id: row.id,
    paymentId: row.payment_id,
    action: row.action,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    performedBy: row.performed_by,
    notes: row.notes,
    createdAt: row.created_at,
  }));
}
