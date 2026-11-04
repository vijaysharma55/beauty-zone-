/**
 * Unit tests for the salon-owner-controlled advance payment system.
 *
 * Covers: percentage / fixed / custom advance maths, the "never exceed total"
 * rule, per-service overrides, settings validation, mandatory DOB validation,
 * UPI link/QR generation, receipt PDF generation and the WhatsApp template.
 *
 * Run with: node --test server/tests/advance-unit.test.js
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Isolated throwaway database BEFORE any server module is imported.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beautyzone-advance-unit-'));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = 'test';
process.env.PAYMENT_MODE = 'mock';
process.env.PAYMENT_ADVANCE_PERCENT = '25';

const { db, newId, nowIso } = await import('../db.js');
await import('../migrations.js');
const {
  computeConfiguredAdvancePaise,
  resolveAdvanceForBooking,
  validateSettingsPatch,
  defaultSalonPaymentSettings,
  getSalonPaymentSettings,
  saveSalonPaymentSettings,
  serviceAdvanceFields,
} = await import('../payments/salon-settings.js');
const { resolvePaymentConfig } = await import('../payments/config.js');
const { validateDob } = await import('../security.js');
const { buildUpiPaymentLink, renderQrSvg, normalizeIndianPhone } = await import('../payments/upi.js');
const { buildReceiptPdf, jpegInfo, formatRupees } = await import('../payments/pdf.js');
const { buildReceiptTemplatePayload, resolveWhatsAppConfig, receiptMessageText } = await import('../notifications/whatsapp.js');

const config = resolvePaymentConfig();

/* ------------------------------------------------------------------ */
/* Advance maths                                                       */
/* ------------------------------------------------------------------ */

test('percentage advance: 10%, 25% and custom values', () => {
  const total = 100_000; // ₹1,000
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 10 }), 10_000);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 25 }), 25_000);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 50 }), 50_000);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 100 }), 100_000);
  // Custom fractional percentage
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 12.5 }), 12_500);
});

test('fixed advance amount is charged exactly', () => {
  const total = 100_000; // ₹1,000
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'fixed', advanceFixedPaise: 20_000 }), 20_000);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'fixed', advanceFixedPaise: 10_000 }), 10_000);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'fixed', advanceFixedPaise: 50_000 }), 50_000);
});

test('advance never exceeds the booking total (fixed or percent)', () => {
  const total = 15_000; // ₹150
  // Fixed ₹500 on a ₹150 booking clamps to ₹150.
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'fixed', advanceFixedPaise: 50_000 }), total);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 100 }), total);
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: total, advanceType: 'percent', advancePercent: 150 }), total);
});

test('advance is zero for a zero total and stays positive otherwise', () => {
  assert.equal(computeConfiguredAdvancePaise({ totalPaise: 0, advanceType: 'percent', advancePercent: 25 }), 0);
  assert.ok(computeConfiguredAdvancePaise({ totalPaise: 100_000, advanceType: 'percent', advancePercent: 25 }) > 0);
});

/* ------------------------------------------------------------------ */
/* Settings validation                                                 */
/* ------------------------------------------------------------------ */

test('settings validation rejects non-positive or >100% advances', () => {
  const current = defaultSalonPaymentSettings(config);
  assert.throws(() => validateSettingsPatch({ advanceType: 'percent', advancePercent: 0 }, current), /greater than 0/);
  assert.throws(() => validateSettingsPatch({ advanceType: 'percent', advancePercent: 101 }, current), /at most 100/);
  assert.throws(() => validateSettingsPatch({ advanceType: 'fixed', advanceFixedPaise: 0 }, current), /at least ₹1/);
  assert.throws(() => validateSettingsPatch({ advanceType: 'bogus' }, current), /percent or fixed/);
});

test('settings validation accepts custom percent and fixed, and balance policy', () => {
  const current = defaultSalonPaymentSettings(config);
  const pct = validateSettingsPatch({ advanceType: 'percent', advancePercent: 33.33, balancePolicy: 'online' }, current);
  assert.equal(pct.advancePercent, 33.33);
  assert.equal(pct.balancePolicy, 'online');
  const fixed = validateSettingsPatch({ advanceType: 'fixed', advanceFixedRupees: 200 }, current);
  assert.equal(fixed.advanceFixedPaise, 20_000);
});

test('enabling manual UPI requires a valid UPI ID', () => {
  const current = defaultSalonPaymentSettings(config);
  assert.throws(() => validateSettingsPatch({ manualUpiEnabled: true }, current), /UPI ID/);
  assert.throws(() => validateSettingsPatch({ manualUpiEnabled: true, upiId: 'not-a-vpa' }, current), /valid UPI ID/);
  const ok = validateSettingsPatch({ manualUpiEnabled: true, upiId: 'salon@okhdfcbank' }, current);
  assert.equal(ok.manualUpiEnabled, true);
  assert.equal(ok.upiId, 'salon@okhdfcbank');
});

/* ------------------------------------------------------------------ */
/* Per-salon + per-service resolution (DB-backed)                      */
/* ------------------------------------------------------------------ */

function makeSalon() {
  const ownerId = newId();
  const salonId = newId();
  const ts = nowIso();
  db.prepare(
    `INSERT INTO users (id, email, name, role, status, email_verified, created_at, updated_at)
     VALUES (?, ?, 'Owner', 'salon_owner', 'active', 1, ?, ?)`
  ).run(ownerId, `owner-${ownerId.slice(0, 8)}@test.local`, ts, ts);
  db.prepare(
    `INSERT INTO salons (id, owner_id, name, slug, status, website_published, created_at, updated_at)
     VALUES (?, ?, 'Test Salon', ?, 'approved', 1, ?, ?)`
  ).run(salonId, ownerId, `salon-${salonId.slice(0, 8)}`, ts, ts);
  return salonId;
}

test('salon settings apply only to their own salon', () => {
  const salonA = makeSalon();
  const salonB = makeSalon();
  const current = defaultSalonPaymentSettings(config);
  saveSalonPaymentSettings(salonA, validateSettingsPatch({ advanceType: 'fixed', advanceFixedPaise: 20_000 }, current));

  const a = resolveAdvanceForBooking({ salonId: salonA, totalPaise: 100_000, config });
  const b = resolveAdvanceForBooking({ salonId: salonB, totalPaise: 100_000, config });
  assert.equal(a.advancePaise, 20_000); // fixed ₹200
  assert.equal(a.remainingPaise, 80_000);
  assert.equal(b.advancePaise, 25_000); // platform default 25%
  assert.equal(b.source, 'platform');
  assert.equal(a.source, 'salon');
});

test('per-service override beats the salon default', () => {
  const salon = makeSalon();
  const current = defaultSalonPaymentSettings(config);
  saveSalonPaymentSettings(salon, validateSettingsPatch({ advanceType: 'percent', advancePercent: 25 }, current));

  const service = { advanceMode: 'fixed', advanceFixedPaise: 50_000 };
  const r = resolveAdvanceForBooking({ salonId: salon, service, totalPaise: 100_000, config });
  assert.equal(r.advancePaise, 50_000);
  assert.equal(r.source, 'service');

  const none = resolveAdvanceForBooking({ salonId: salon, service: { advanceMode: 'none' }, totalPaise: 100_000, config });
  assert.equal(none.advancePaise, 0);
  assert.equal(none.paymentRequired, false);
});

test('disabling advance at salon level is a kill switch even with service overrides', () => {
  const salon = makeSalon();
  const current = defaultSalonPaymentSettings(config);
  saveSalonPaymentSettings(salon, validateSettingsPatch({ advanceEnabled: false }, current));
  const r = resolveAdvanceForBooking({
    salonId: salon,
    service: { advanceMode: 'fixed', advanceFixedPaise: 50_000 },
    totalPaise: 100_000,
    config,
  });
  assert.equal(r.advancePaise, 0);
  assert.equal(r.paymentRequired, false);
});

test('service advance field validation', () => {
  assert.throws(() => serviceAdvanceFields({ advanceMode: 'percent' }), /percentage/);
  assert.throws(() => serviceAdvanceFields({ advanceMode: 'fixed' }), /amount/);
  const ok = serviceAdvanceFields({ advanceMode: 'percent', advancePercent: 40 });
  assert.equal(ok.advance_mode, 'percent');
  assert.equal(ok.advance_percent, 40);
});

/* ------------------------------------------------------------------ */
/* DOB validation                                                      */
/* ------------------------------------------------------------------ */

test('DOB is required and must be a real, non-future date', () => {
  assert.throws(() => validateDob(undefined), /required/);
  assert.throws(() => validateDob(''), /required/);
  assert.throws(() => validateDob('2000-02-30'), /real calendar date/);
  assert.throws(() => validateDob('not-a-date'), /YYYY-MM-DD/);
  assert.throws(() => validateDob('1899-12-31'), /on or after 1900/);
  const future = new Date(Date.now() + 86_400_000 * 365).toISOString().slice(0, 10);
  assert.throws(() => validateDob(future), /future/);
  assert.equal(validateDob('1995-06-15'), '1995-06-15');
  assert.equal(validateDob('2000-02-29'), '2000-02-29'); // valid leap day
});

test('DOB is optional only when explicitly allowed', () => {
  assert.equal(validateDob('', { required: false }), null);
  assert.throws(() => validateDob('', { required: true }), /required/);
});

/* ------------------------------------------------------------------ */
/* UPI link + QR                                                       */
/* ------------------------------------------------------------------ */

test('UPI payment link carries the exact amount and booking reference', () => {
  const link = buildUpiPaymentLink({
    upiId: 'salon@okhdfcbank',
    displayName: 'Lumina Luxe',
    amountPaise: 25_000,
    bookingReference: 'SALON-ABC123',
  });
  assert.ok(link.startsWith('upi://pay?'));
  assert.ok(link.includes('pa=salon%40okhdfcbank'));
  assert.ok(link.includes('am=250.00'));
  assert.ok(link.includes('cu=INR'));
  assert.ok(link.includes('tr=SALON-ABC123'));
  assert.ok(link.includes('pn=Lumina%20Luxe'));
});

test('UPI QR renders a real scannable SVG matrix', () => {
  const svg = renderQrSvg('upi://pay?pa=salon@okhdfcbank&am=250.00&cu=INR');
  assert.ok(svg.startsWith('<svg'));
  assert.ok(svg.includes('<path'));
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
});

test('Indian phone normalisation for WhatsApp', () => {
  assert.equal(normalizeIndianPhone('98000 12345'), '919800012345');
  assert.equal(normalizeIndianPhone('+91 98000 12345'), '919800012345');
  assert.equal(normalizeIndianPhone('09800012345'), '919800012345');
  assert.equal(normalizeIndianPhone('12345'), '');
});

/* ------------------------------------------------------------------ */
/* Receipt PDF                                                         */
/* ------------------------------------------------------------------ */

test('receipt PDF is a valid PDF with the key figures', () => {
  const pdf = buildReceiptPdf({
    salonName: 'Lumina Luxe',
    salonAddress: '12 Civil Lines, Jaipur',
    salonPhone: '+91 98000 12345',
    receiptNumber: 'RCP-2026-ABCD1234',
    receiptId: 'receipt-id',
    issuedAt: '2026-11-04 10:00 UTC',
    bookingReference: 'SALON-ABC123',
    bookingStatusLabel: 'CONFIRMED',
    paymentStatusLabel: 'ADVANCE PAID',
    customerName: 'Priya Sharma',
    customerPhone: '+91 90000 11111',
    service: 'HydraFacial Glow Ritual',
    date: '2026-12-01',
    time: '12:00',
    totalPaise: 100_000,
    paidPaise: 25_000,
    remainingPaise: 75_000,
    methodLabel: 'UPI',
    transactionRef: 'MOCKTXN-123',
    currency: 'INR',
  });
  assert.ok(Buffer.isBuffer(pdf));
  assert.equal(pdf.subarray(0, 5).toString('latin1'), '%PDF-');
  const text = pdf.toString('latin1');
  assert.ok(text.includes('%%EOF'));
  assert.ok(text.includes('RCP-2026-ABCD1234'));
  assert.ok(text.includes('SALON-ABC123'));
  assert.ok(text.includes('Rs.')); // ₹ folded to WinAnsi-safe text
});

test('formatRupees uses Indian grouping', () => {
  assert.equal(formatRupees(100_000), 'Rs. 1,000.00');
  assert.equal(formatRupees(12_345_678), 'Rs. 1,23,456.78');
});

/* ------------------------------------------------------------------ */
/* WhatsApp template                                                   */
/* ------------------------------------------------------------------ */

test('WhatsApp receipt template contains the correct booking/payment details', () => {
  const cfg = { ...resolveWhatsAppConfig({ WHATSAPP_PROVIDER: 'meta_cloud', WHATSAPP_ACCESS_TOKEN: 'x', WHATSAPP_PHONE_NUMBER_ID: '1', APP_URL: 'https://example.com' }), appUrl: 'https://example.com' };
  const booking = {
    id: 'booking-1', full_name: 'Priya Sharma', phone: '9800012345', reference: 'SALON-ABC123',
    service: 'HydraFacial', date: '2026-12-01', time: '12:00', amount_paise: 100_000,
  };
  const salon = { name: 'Lumina Luxe', phone: '+91 98000 12345', address_line: '12 Civil Lines', city: 'Jaipur' };
  const receipt = { paid_paise: 25_000, remaining_paise: 75_000, method: 'UPI', transaction_ref: 'TXN-1', receipt_number: 'RCP-1', access_token: 'tok' };
  const payload = buildReceiptTemplatePayload({ booking, salon, receipt, config: cfg });
  assert.equal(payload.to, '919800012345');
  assert.equal(payload.type, 'template');
  const body = payload.template.components.find((c) => c.type === 'body').parameters.map((p) => p.text);
  assert.ok(body.includes('Priya Sharma'));
  assert.ok(body.includes('SALON-ABC123'));
  assert.ok(body.includes('₹1,000'));
  assert.ok(body.includes('₹250'));
  assert.ok(body.includes('₹750'));
  assert.ok(body.includes('TXN-1'));
  const button = payload.template.components.find((c) => c.type === 'button');
  assert.ok(button.parameters[0].text.includes('booking-1?token=tok'));

  const text = receiptMessageText({ booking, salon, receipt });
  assert.ok(text.includes('CONFIRMED'));
  assert.ok(text.includes('SALON-ABC123'));
});

test('WhatsApp is disabled by default and never claims to send', () => {
  const cfg = resolveWhatsAppConfig({});
  assert.equal(cfg.enabled, false);
  assert.equal(cfg.provider, 'disabled');
});

// Cleanup
test('cleanup temp data dir', () => {
  try { db.close(); } catch { /* ignore */ }
  fs.rmSync(dataDir, { recursive: true, force: true });
  assert.ok(true);
});
