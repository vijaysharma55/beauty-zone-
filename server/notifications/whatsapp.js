/**
 * WhatsApp Business receipts via the Meta WhatsApp Cloud API.
 *
 * Design rules:
 *  - A message is only marked `sent` when the provider API accepts it and
 *    returns a message id. `delivered` / `read` / `failed` updates arrive
 *    through the signature-verified provider webhook.
 *  - When no provider is configured the notification is recorded as `skipped`
 *    (never "sent"), and the booking is unaffected.
 *  - Delivery failure never cancels or reverses a confirmed booking; the
 *    owner/admin can retry from the dashboard and the receipt stays
 *    downloadable on the website.
 *
 * Environment:
 *   WHATSAPP_PROVIDER=meta_cloud|disabled     (default disabled)
 *   WHATSAPP_ACCESS_TOKEN                     (permanent system-user token)
 *   WHATSAPP_PHONE_NUMBER_ID                  (sender phone number id)
 *   WHATSAPP_TEMPLATE_NAME                    (approved template, default booking_confirmation_receipt)
 *   WHATSAPP_TEMPLATE_LANGUAGE                (default en)
 *   WHATSAPP_API_BASE                         (default https://graph.facebook.com/v21.0)
 *   WHATSAPP_VERIFY_TOKEN                     (webhook subscription verify token)
 *   WHATSAPP_APP_SECRET                       (webhook X-Hub-Signature-256 secret)
 *   APP_URL                                   (public base URL for receipt links)
 */

import crypto from 'node:crypto';
import { db, newId, nowIso } from '../db.js';
import { normalizeIndianPhone } from '../payments/upi.js';
import { receiptsForBooking } from '../payments/receipts.js';

export function resolveWhatsAppConfig(env = process.env) {
  const provider = String(env.WHATSAPP_PROVIDER || 'disabled').trim().toLowerCase();
  const accessToken = String(env.WHATSAPP_ACCESS_TOKEN || '').trim();
  const phoneNumberId = String(env.WHATSAPP_PHONE_NUMBER_ID || '').trim();
  const enabled = provider === 'meta_cloud' && Boolean(accessToken && phoneNumberId);
  let reason = null;
  if (provider !== 'meta_cloud') reason = 'WhatsApp provider is disabled (set WHATSAPP_PROVIDER=meta_cloud).';
  else if (!accessToken || !phoneNumberId) reason = 'WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not configured.';
  return {
    provider: provider === 'meta_cloud' ? 'meta_cloud' : 'disabled',
    enabled,
    reason,
    accessToken,
    phoneNumberId,
    templateName: String(env.WHATSAPP_TEMPLATE_NAME || 'booking_confirmation_receipt').trim(),
    templateLanguage: String(env.WHATSAPP_TEMPLATE_LANGUAGE || 'en').trim(),
    apiBase: String(env.WHATSAPP_API_BASE || 'https://graph.facebook.com/v21.0').trim().replace(/\/+$/, ''),
    verifyToken: String(env.WHATSAPP_VERIFY_TOKEN || '').trim(),
    appSecret: String(env.WHATSAPP_APP_SECRET || '').trim(),
    appUrl: String(env.APP_URL || '').trim().replace(/\/+$/, ''),
  };
}

export function whatsappPublicStatus() {
  const config = resolveWhatsAppConfig();
  return {
    enabled: config.enabled,
    provider: config.provider,
    templateName: config.enabled ? config.templateName : '',
    reason: config.reason,
  };
}

const rupees = (paise) => `₹${((Number(paise) || 0) / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function serializeWhatsAppNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    bookingId: row.booking_id,
    salonId: row.salon_id,
    receiptId: row.receipt_id,
    toNumber: row.to_number,
    provider: row.provider,
    templateName: row.template_name,
    status: row.status,
    providerMessageId: row.provider_message_id || null,
    error: row.error || '',
    attempts: row.attempts,
    lastAttemptAt: row.last_attempt_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function notificationsForBooking(bookingId) {
  return db
    .prepare('SELECT * FROM whatsapp_notifications WHERE booking_id = ? ORDER BY created_at DESC')
    .all(bookingId);
}

/**
 * Builds the approved-template payload. The template body must contain 14
 * parameters in this exact order (see docs/WHATSAPP.md) plus one URL button
 * whose dynamic suffix is `<bookingId>?token=<receipt token>`.
 */
export function buildReceiptTemplatePayload({ booking, salon, receipt, config }) {
  const to = normalizeIndianPhone(booking.phone);
  const params = [
    booking.full_name,                                   // 1 customer name
    salon?.name || 'the salon',                          // 2 salon name
    booking.reference,                                   // 3 booking reference
    booking.service,                                     // 4 service(s)
    booking.date,                                        // 5 booking date
    booking.time,                                        // 6 booking time
    rupees(booking.amount_paise),                        // 7 total amount
    rupees(receipt.paid_paise),                          // 8 advance received
    receipt.method || 'Online payment',                  // 9 payment method
    receipt.transaction_ref || '—',                      // 10 transaction reference
    rupees(receipt.remaining_paise),                     // 11 remaining balance
    salon?.phone || salon?.whatsapp || '—',              // 12 salon contact
    [salon?.address_line, salon?.city].filter(Boolean).join(', ') || '—', // 13 salon address
    receipt.receipt_number,                              // 14 receipt number
  ].map((value) => ({ type: 'text', text: String(value).slice(0, 200) }));

  const components = [{ type: 'body', parameters: params }];
  if (config.appUrl) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: `${booking.id}?token=${encodeURIComponent(receipt.access_token)}` }],
    });
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components,
    },
  };
}

/** Human-readable plain-text fallback (used for logs and the dashboard). */
export function receiptMessageText({ booking, salon, receipt }) {
  return [
    `*${salon?.name || 'Salon'} — Booking CONFIRMED*`,
    `Customer: ${booking.full_name}`,
    `Reference: ${booking.reference}`,
    `Service: ${booking.service}`,
    `When: ${booking.date} at ${booking.time}`,
    `Total: ${rupees(booking.amount_paise)}`,
    `Advance received: ${rupees(receipt.paid_paise)} (${receipt.method})`,
    `Transaction: ${receipt.transaction_ref}`,
    `Remaining balance: ${rupees(receipt.remaining_paise)}`,
    `Receipt: ${receipt.receipt_number}`,
    salon?.address_line ? `Address: ${[salon.address_line, salon.city].filter(Boolean).join(', ')}` : null,
    salon?.phone ? `Contact: ${salon.phone}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function recordAttempt(notificationId, { status, providerMessageId = null, error = '', payload = null }) {
  db.prepare(
    `UPDATE whatsapp_notifications
       SET status = ?, provider_message_id = COALESCE(?, provider_message_id), error = ?,
           attempts = attempts + 1, payload_json = COALESCE(?, payload_json),
           last_attempt_at = ?, updated_at = ?
     WHERE id = ?`
  ).run(status, providerMessageId, String(error).slice(0, 500), payload ? JSON.stringify(payload).slice(0, 6000) : null, nowIso(), nowIso(), notificationId);
  return db.prepare('SELECT * FROM whatsapp_notifications WHERE id = ?').get(notificationId);
}

/**
 * Sends (or re-sends) the receipt notification for a booking.
 * Never throws: every outcome is recorded in whatsapp_notifications.
 */
export async function sendBookingReceiptWhatsApp({ bookingId, fetchImpl = globalThis.fetch, force = false }) {
  const config = resolveWhatsAppConfig();
  const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(String(bookingId || ''));
  if (!booking) return { ok: false, status: 'missing_booking' };

  const receipts = receiptsForBooking(booking.id);
  const receipt = receipts[receipts.length - 1];
  if (!receipt) return { ok: false, status: 'no_receipt' };

  const salon = booking.salon_id ? db.prepare('SELECT * FROM salons WHERE id = ?').get(booking.salon_id) : null;

  let notification = db
    .prepare('SELECT * FROM whatsapp_notifications WHERE booking_id = ? AND receipt_id = ? ORDER BY created_at DESC LIMIT 1')
    .get(booking.id, receipt.id);
  if (!notification) {
    const id = newId();
    const ts = nowIso();
    db.prepare(
      `INSERT INTO whatsapp_notifications
         (id, booking_id, salon_id, receipt_id, to_number, provider, template_name, status, attempts, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`
    ).run(
      id,
      booking.id,
      booking.salon_id || null,
      receipt.id,
      normalizeIndianPhone(booking.phone) || String(booking.phone || ''),
      config.provider,
      config.templateName,
      ts,
      ts
    );
    notification = db.prepare('SELECT * FROM whatsapp_notifications WHERE id = ?').get(id);
  }

  if (!force && ['sent', 'delivered', 'read'].includes(notification.status)) {
    return { ok: true, status: notification.status, notification, alreadySent: true };
  }

  if (!config.enabled) {
    const row = recordAttempt(notification.id, { status: 'skipped', error: config.reason || 'Provider not configured' });
    return { ok: false, status: 'skipped', notification: row, reason: config.reason };
  }
  if (!config.appUrl) {
    const row = recordAttempt(notification.id, {
      status: 'failed',
      error: 'APP_URL must be configured so the WhatsApp receipt button links to your public site.',
    });
    return { ok: false, status: 'failed', notification: row };
  }

  const payload = buildReceiptTemplatePayload({ booking, salon, receipt, config });
  if (!payload.to) {
    const row = recordAttempt(notification.id, { status: 'failed', error: 'Customer phone number is not a valid WhatsApp number', payload });
    return { ok: false, status: 'failed', notification: row };
  }

  try {
    const res = await fetchImpl(`${config.apiBase}/${config.phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout ? AbortSignal.timeout(15_000) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    const messageId = data?.messages?.[0]?.id || null;
    if (res.ok && messageId) {
      // The provider accepted the message for submission — not yet delivered.
      const row = recordAttempt(notification.id, { status: 'sent', providerMessageId: messageId, error: '', payload });
      return { ok: true, status: 'sent', notification: row };
    }
    const error = data?.error?.message || `WhatsApp API responded ${res.status}`;
    const row = recordAttempt(notification.id, { status: 'failed', error, payload });
    return { ok: false, status: 'failed', notification: row, reason: error };
  } catch (err) {
    const row = recordAttempt(notification.id, { status: 'failed', error: err?.message || 'Network error', payload });
    return { ok: false, status: 'failed', notification: row, reason: row.error };
  }
}

/** Fire-and-forget hook used right after a payment is verified. */
export function queueBookingReceiptWhatsApp(bookingId) {
  Promise.resolve()
    .then(() => sendBookingReceiptWhatsApp({ bookingId }))
    .catch((err) => console.error('[whatsapp] send failed', err?.message || err));
}

/* ------------------------------------------------------------------ */
/* Provider webhook (delivery statuses)                                */
/* ------------------------------------------------------------------ */

export function verifyWhatsAppWebhookSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Applies delivery/read/failure statuses reported by the provider. */
export function processWhatsAppWebhookPayload(payload) {
  const updates = [];
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const statuses = Array.isArray(change?.value?.statuses) ? change.value.statuses : [];
      for (const status of statuses) {
        const messageId = String(status?.id || '');
        const next = String(status?.status || '').toLowerCase();
        if (!messageId || !['sent', 'delivered', 'read', 'failed'].includes(next)) continue;
        const row = db
          .prepare('SELECT * FROM whatsapp_notifications WHERE provider_message_id = ? ORDER BY created_at DESC LIMIT 1')
          .get(messageId);
        if (!row) continue;
        // Never downgrade a read/delivered notification back to sent.
        const rank = { pending: 0, skipped: 0, failed: 1, sent: 2, delivered: 3, read: 4 };
        if (next !== 'failed' && (rank[row.status] ?? 0) >= (rank[next] ?? 0)) continue;
        const error = next === 'failed' ? String(status?.errors?.[0]?.title || 'Delivery failed at provider').slice(0, 500) : '';
        db.prepare('UPDATE whatsapp_notifications SET status = ?, error = ?, updated_at = ? WHERE id = ?').run(
          next,
          error,
          nowIso(),
          row.id
        );
        updates.push({ id: row.id, status: next });
      }
    }
  }
  return updates;
}
