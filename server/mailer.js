import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DATA_PATH } from './db.js';

const OUTBOX = path.join(DATA_PATH, 'outbox');
fs.mkdirSync(OUTBOX, { recursive: true });

/**
 * Minimal transactional mailer.
 *
 * No SMTP provider is bundled with this sandbox, so messages are persisted to
 * `data/outbox/*.json` (and logged) and the verification URL is returned to the
 * client in non-production so the flow is usable end to end. Wire `sendMail`
 * to your provider (Resend, SES, Postmark…) for real delivery.
 */
export async function sendMail({ to, subject, text, html, tag = 'mail' }) {
  const id = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const message = { id, to, subject, text, html: html || null, tag, sentAt: new Date().toISOString() };
  try {
    fs.writeFileSync(path.join(OUTBOX, `${id}.json`), JSON.stringify(message, null, 2));
  } catch (err) {
    console.error('[mail] could not persist message', err.message);
  }
  console.log(`\n[mail] ${subject} → ${to}\n${text}\n`);
  return { delivered: false, stored: true, id };
}

export function verificationEmail({ name, url }) {
  return {
    subject: 'Verify your BeautyZone email address',
    text: `Hi ${name},\n\nPlease confirm your email address to activate website submissions:\n${url}\n\nThis link expires in 24 hours. If you did not create a BeautyZone account you can ignore this email.`,
    html: `<p>Hi ${name},</p><p>Please confirm your email address to activate website submissions:</p><p><a href="${url}">Verify my email</a></p><p>This link expires in 24 hours.</p>`,
  };
}

export function reviewNotificationEmail({ ownerName, salonName, outcome, note, dashboardUrl }) {
  const label =
    outcome === 'approved' ? 'approved 🎉' : outcome === 'rejected' ? 'rejected' : 'returned for changes';
  const reason = note ? `\n\nReviewer note: ${note}` : '';
  return {
    subject: `Your website for ${salonName} was ${label}`,
    text: `Hi ${ownerName},\n\nYour website "${salonName}" has been ${label}.${reason}\n\nOpen your dashboard: ${dashboardUrl}\n`,
    html: `<p>Hi ${ownerName},</p><p>Your website <strong>${salonName}</strong> has been ${label}.</p>${
      note ? `<p><em>Reviewer note:</em> ${note}</p>` : ''
    }<p><a href="${dashboardUrl}">Open your dashboard</a></p>`,
  };
}
