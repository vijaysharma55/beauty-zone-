/** Private payment-proof uploads.
 *
 * Proof images can contain customer financial details. They are stored outside
 * the public upload directory and can only be streamed by the owning salon or
 * a super administrator after a server-side payment ownership check.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db, DATA_PATH, nowIso } from '../db.js';
import { HttpError } from '../security.js';
import { getPaymentRow } from './service.js';
import { recordPaymentAudit } from './audit.js';

const PROOF_DIR = path.join(DATA_PATH, 'payment-proofs');
fs.mkdirSync(PROOF_DIR, { recursive: true, mode: 0o700 });
const MAX_PROOF_BYTES = 2 * 1024 * 1024;

export function detectImage(buffer, declaredMime = '') {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  let mime = null;
  if (
    buffer.length >= 45 && buffer[0] === 0x89 && buffer.subarray(1, 4).toString('ascii') === 'PNG' &&
    buffer.subarray(12, 16).toString('ascii') === 'IHDR' && buffer.subarray(buffer.length - 8, buffer.length - 4).toString('ascii') === 'IEND'
  ) mime = 'image/png';
  else if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9) mime = 'image/jpeg';
  else if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP' &&
    buffer.readUInt32LE(4) + 8 <= buffer.length
  ) mime = 'image/webp';
  if (!mime) return null;
  const declared = String(declaredMime).split(';')[0].trim().toLowerCase();
  if (declared === 'image/jpg') return mime === 'image/jpeg' ? mime : null;
  return declared === mime ? mime : null;
}

export function savePaymentProof({ paymentId, buffer, contentType }) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new HttpError(400, 'Choose a payment proof image.', 'EMPTY_PROOF');
  if (buffer.length > MAX_PROOF_BYTES) throw new HttpError(413, 'Payment proof must be 2 MB or smaller.', 'PROOF_TOO_LARGE');
  const mime = detectImage(buffer, contentType);
  if (!mime) throw new HttpError(415, 'Payment proof must be a valid PNG, JPEG or WEBP image matching its file type.', 'INVALID_PROOF');
  const payment = getPaymentRow(paymentId);
  if (!payment || payment.provider !== 'manual_upi') throw new HttpError(404, 'Manual UPI payment not found.', 'PAYMENT_NOT_FOUND');
  if (!['created', 'verification_pending'].includes(payment.status)) {
    throw new HttpError(409, 'Proof can only be added to an active or pending-verification UPI payment.', 'PAYMENT_NOT_ACTIVE');
  }
  const extension = mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg';
  const fileName = `${crypto.randomBytes(24).toString('hex')}${extension}`;
  const storedName = `proof:${fileName}`;
  fs.writeFileSync(path.join(PROOF_DIR, fileName), buffer, { mode: 0o600, flag: 'wx' });
  try {
    db.prepare('UPDATE payments SET payment_proof_url = ?, updated_at = ? WHERE id = ?').run(storedName, nowIso(), payment.id);
  } catch (err) {
    fs.rmSync(path.join(PROOF_DIR, fileName), { force: true });
    throw err;
  }
  recordPaymentAudit({
    paymentId: payment.id,
    action: 'manual.proof_uploaded',
    previousStatus: payment.status,
    newStatus: payment.status,
    notes: 'Customer supplied an image. It is supporting evidence only, not automatic verification.',
  });
  return { uploaded: true, paymentId: payment.id };
}

export function readPaymentProof(payment) {
  const stored = String(payment?.payment_proof_url || '');
  if (!/^proof:[a-f0-9]{48}\.(png|jpg|webp)$/.test(stored)) throw new HttpError(404, 'Payment proof not found.', 'PROOF_NOT_FOUND');
  const fileName = stored.slice(6);
  const buffer = fs.readFileSync(path.join(PROOF_DIR, fileName));
  const mime = fileName.endsWith('.png') ? 'image/png' : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
  return { buffer, mime, fileName };
}
