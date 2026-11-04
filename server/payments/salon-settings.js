/**
 * Salon-owner-controlled booking & advance payment settings.
 *
 * Every salon can configure its own advance (percentage or fixed ₹ amount),
 * per-service overrides, the remaining-balance policy and which payment
 * methods its customers may use. All amounts are computed here on the server
 * from the salon's own configuration — a browser can never choose the advance.
 *
 * Salons without a settings row fall back to the platform defaults
 * (PAYMENT_ADVANCE_PERCENT / PAYMENT_REQUIRE_ADVANCE), so existing behaviour
 * is preserved until an owner saves their own settings.
 */

import { db, newId, nowIso, safeJson } from '../db.js';
import { HttpError, ValidationError, str, bool, isSafeImageUrl } from '../security.js';
import { MIN_ADVANCE_PAISE, resolvePaymentConfig } from './config.js';
import { isValidUpiVpa, toPaise } from './amounts.js';

export const ADVANCE_TYPES = ['percent', 'fixed'];
export const BALANCE_POLICIES = ['at_salon', 'online'];
export const DISABLED_POLICIES = ['pay_at_salon', 'block_booking'];
export const SERVICE_ADVANCE_MODES = ['inherit', 'percent', 'fixed', 'none'];

/** Customer-facing payment method keys understood by the checkout. */
export const PAYMENT_METHOD_KEYS = [
  'upi',
  'phonepe',
  'googlepay',
  'paytm',
  'other_upi',
  'card',
  'netbanking',
  'wallet',
];

export const UPI_METHOD_KEYS = ['upi', 'phonepe', 'googlepay', 'paytm', 'other_upi'];

export const PAYMENT_METHOD_LABELS = Object.freeze({
  upi: 'UPI',
  phonepe: 'PhonePe',
  googlepay: 'Google Pay',
  paytm: 'Paytm',
  other_upi: 'Other UPI apps',
  card: 'Debit / Credit Card',
  netbanking: 'Net Banking',
  wallet: 'Wallets',
});

const MAX_FIXED_PAISE = 100_000_000; // ₹10,00,000 ceiling for a fixed deposit

function defaultMethods() {
  const out = {};
  for (const key of PAYMENT_METHOD_KEYS) out[key] = true;
  return out;
}

/** Platform-derived defaults used until the owner saves their own settings. */
export function defaultSalonPaymentSettings(config = resolvePaymentConfig()) {
  return {
    advanceEnabled: config.advanceRequired,
    advanceType: 'percent',
    advancePercent: config.advancePercent,
    advanceFixedPaise: 0,
    balancePolicy: 'at_salon',
    disabledPolicy: 'pay_at_salon',
    gatewayEnabled: true,
    manualUpiEnabled: false,
    upiId: '',
    paymentDisplayName: '',
    upiQrUrl: '',
    methods: defaultMethods(),
    customized: false,
    updatedAt: null,
  };
}

export function getSalonPaymentSettingsRow(salonId) {
  if (!salonId) return null;
  return db.prepare('SELECT * FROM salon_payment_settings WHERE salon_id = ?').get(salonId) || null;
}

/** Effective settings for a salon (owner row merged over platform defaults). */
export function getSalonPaymentSettings(salonId, config = resolvePaymentConfig()) {
  const defaults = defaultSalonPaymentSettings(config);
  const row = getSalonPaymentSettingsRow(salonId);
  if (!row) return defaults;
  const methods = { ...defaultMethods() };
  const stored = safeJson(row.methods_json, {});
  for (const key of PAYMENT_METHOD_KEYS) {
    if (typeof stored[key] === 'boolean') methods[key] = stored[key];
  }
  return {
    advanceEnabled: !!row.advance_enabled,
    advanceType: row.advance_type,
    advancePercent: Number(row.advance_percent),
    advanceFixedPaise: Number(row.advance_fixed_paise),
    balancePolicy: row.balance_policy,
    disabledPolicy: row.disabled_policy,
    gatewayEnabled: !!row.gateway_enabled,
    manualUpiEnabled: !!row.manual_upi_enabled,
    upiId: row.upi_id || '',
    paymentDisplayName: row.payment_display_name || '',
    upiQrUrl: row.upi_qr_url || '',
    methods,
    customized: true,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Validation + persistence                                            */
/* ------------------------------------------------------------------ */

function validatePercent(value, field = 'Advance percentage') {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n)) throw new ValidationError(`${field} must be a number`);
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0 || rounded > 100) {
    throw new ValidationError(`${field} must be greater than 0 and at most 100`);
  }
  return rounded;
}

function validateFixedPaise(value, field = 'Advance amount') {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new ValidationError(`${field} must be a whole number of paise`);
  }
  if (n < 100) throw new ValidationError(`${field} must be at least ₹1`);
  if (n > MAX_FIXED_PAISE) throw new ValidationError(`${field} is too large`);
  return n;
}

/**
 * Validates an owner settings patch. Only known keys are accepted; the active
 * advance type must carry a valid value (> ₹0, percent ≤ 100). A fixed amount
 * larger than a booking total is clamped to the total at checkout time.
 */
export function validateSettingsPatch(body, current) {
  const b = body && typeof body === 'object' ? body : {};
  const out = { ...current };

  if (b.advanceEnabled !== undefined) out.advanceEnabled = bool(b.advanceEnabled, current.advanceEnabled);
  if (b.advanceType !== undefined) {
    const t = str(b.advanceType, { max: 10, field: 'Advance type' });
    if (!ADVANCE_TYPES.includes(t)) throw new ValidationError('Advance type must be percent or fixed');
    out.advanceType = t;
  }
  if (b.advancePercent !== undefined && b.advancePercent !== null && b.advancePercent !== '') {
    out.advancePercent = validatePercent(b.advancePercent);
  }
  if (b.advanceFixedPaise !== undefined && b.advanceFixedPaise !== null && b.advanceFixedPaise !== '') {
    out.advanceFixedPaise = validateFixedPaise(b.advanceFixedPaise);
  } else if (b.advanceFixedRupees !== undefined && b.advanceFixedRupees !== null && b.advanceFixedRupees !== '') {
    const rupees = Number(b.advanceFixedRupees);
    if (!Number.isFinite(rupees)) throw new ValidationError('Advance amount must be a number');
    out.advanceFixedPaise = validateFixedPaise(Math.round(rupees * 100));
  }
  if (b.balancePolicy !== undefined) {
    const p = str(b.balancePolicy, { max: 12, field: 'Balance policy' });
    if (!BALANCE_POLICIES.includes(p)) throw new ValidationError('Balance policy must be at_salon or online');
    out.balancePolicy = p;
  }
  if (b.disabledPolicy !== undefined) {
    const p = str(b.disabledPolicy, { max: 20, field: 'Disabled policy' });
    if (!DISABLED_POLICIES.includes(p)) throw new ValidationError('Disabled policy must be pay_at_salon or block_booking');
    out.disabledPolicy = p;
  }
  if (b.gatewayEnabled !== undefined) out.gatewayEnabled = bool(b.gatewayEnabled, current.gatewayEnabled);
  if (b.manualUpiEnabled !== undefined) out.manualUpiEnabled = bool(b.manualUpiEnabled, current.manualUpiEnabled);
  if (b.upiId !== undefined) {
    const vpa = str(b.upiId, { max: 100, field: 'UPI ID' }).toLowerCase();
    if (vpa && !isValidUpiVpa(vpa)) throw new ValidationError('Enter a valid UPI ID, for example name@okhdfcbank');
    out.upiId = vpa;
  }
  if (b.paymentDisplayName !== undefined) {
    out.paymentDisplayName = str(b.paymentDisplayName, { max: 120, field: 'Payment display name' });
  }
  if (b.upiQrUrl !== undefined) {
    const url = str(b.upiQrUrl, { max: 2_000_000, field: 'Payment QR code' });
    if (url && !isSafeImageUrl(url)) throw new ValidationError('Payment QR code must be an uploaded image or https URL');
    out.upiQrUrl = url;
  }
  if (b.methods !== undefined) {
    if (!b.methods || typeof b.methods !== 'object' || Array.isArray(b.methods)) {
      throw new ValidationError('Payment methods must be an object of toggles');
    }
    const methods = { ...out.methods };
    for (const [key, value] of Object.entries(b.methods)) {
      if (!PAYMENT_METHOD_KEYS.includes(key)) throw new ValidationError(`Unknown payment method: ${key}`);
      methods[key] = bool(value, methods[key]);
    }
    out.methods = methods;
  }

  // Cross-field rules: the configured advance must always be > ₹0.
  if (out.advanceEnabled) {
    if (out.advanceType === 'percent') {
      out.advancePercent = validatePercent(out.advancePercent);
    } else {
      out.advanceFixedPaise = validateFixedPaise(out.advanceFixedPaise);
    }
  }
  if (out.manualUpiEnabled && !out.upiId) {
    throw new ValidationError('Add your UPI ID before enabling direct UPI QR payments');
  }
  const anyMethod = PAYMENT_METHOD_KEYS.some((key) => out.methods[key]);
  if (!anyMethod) throw new ValidationError('Enable at least one payment method');

  return out;
}

export function saveSalonPaymentSettings(salonId, settings) {
  const ts = nowIso();
  db.prepare(
    `INSERT INTO salon_payment_settings
       (salon_id, advance_enabled, advance_type, advance_percent, advance_fixed_paise,
        balance_policy, disabled_policy, gateway_enabled, manual_upi_enabled,
        upi_id, payment_display_name, upi_qr_url, methods_json, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(salon_id) DO UPDATE SET
       advance_enabled = excluded.advance_enabled,
       advance_type = excluded.advance_type,
       advance_percent = excluded.advance_percent,
       advance_fixed_paise = excluded.advance_fixed_paise,
       balance_policy = excluded.balance_policy,
       disabled_policy = excluded.disabled_policy,
       gateway_enabled = excluded.gateway_enabled,
       manual_upi_enabled = excluded.manual_upi_enabled,
       upi_id = excluded.upi_id,
       payment_display_name = excluded.payment_display_name,
       upi_qr_url = excluded.upi_qr_url,
       methods_json = excluded.methods_json,
       updated_at = excluded.updated_at`
  ).run(
    salonId,
    settings.advanceEnabled ? 1 : 0,
    settings.advanceType,
    settings.advancePercent,
    settings.advanceFixedPaise,
    settings.balancePolicy,
    settings.disabledPolicy,
    settings.gatewayEnabled ? 1 : 0,
    settings.manualUpiEnabled ? 1 : 0,
    settings.upiId,
    settings.paymentDisplayName,
    settings.upiQrUrl,
    JSON.stringify(settings.methods),
    ts,
    ts
  );
  return getSalonPaymentSettings(salonId);
}

/* ------------------------------------------------------------------ */
/* Advance computation                                                 */
/* ------------------------------------------------------------------ */

/**
 * Advance in paise for a total, given a percentage or fixed amount.
 * The result is always > 0 (when configured) and never exceeds the total.
 */
export function computeConfiguredAdvancePaise({ totalPaise, advanceType, advancePercent, advanceFixedPaise }) {
  const total = toPaise(totalPaise);
  if (total <= 0) return 0;
  if (advanceType === 'fixed') {
    const fixed = toPaise(advanceFixedPaise);
    if (fixed <= 0) return 0;
    return Math.min(total, fixed);
  }
  const percent = Number(advancePercent);
  if (!Number.isFinite(percent) || percent <= 0) return 0;
  const raw = Math.round((total * Math.min(100, percent)) / 100);
  // Keep the platform ₹10 floor for percentage deposits, capped at the total.
  return Math.min(total, Math.max(Math.min(MIN_ADVANCE_PAISE, total), raw));
}

/**
 * Resolves the authoritative advance for a booking.
 *
 * `service` may be the live snapshot service (with advanceMode/advancePercent/
 * advanceFixedPaise) or null. Service overrides adjust the amount only while
 * the salon-level advance is enabled; the salon toggle is the kill switch.
 */
export function resolveAdvanceForBooking({ salonId, service = null, totalPaise, config = resolvePaymentConfig() }) {
  const settings = getSalonPaymentSettings(salonId, config);
  const total = toPaise(totalPaise);

  const base = {
    settings,
    totalPaise: total,
    advanceType: settings.advanceType,
    advancePercent: settings.advancePercent,
    advanceFixedPaise: settings.advanceFixedPaise,
    balancePolicy: settings.balancePolicy,
    disabledPolicy: settings.disabledPolicy,
    source: settings.customized ? 'salon' : 'platform',
  };

  if (!settings.advanceEnabled || total <= 0) {
    return { ...base, advancePaise: 0, remainingPaise: total, paymentRequired: false };
  }

  let type = settings.advanceType;
  let percent = settings.advancePercent;
  let fixed = settings.advanceFixedPaise;
  let source = base.source;

  const mode = service?.advanceMode || 'inherit';
  if (mode === 'none') {
    return { ...base, advancePaise: 0, remainingPaise: total, paymentRequired: false, source: 'service' };
  }
  if (mode === 'percent' && Number(service?.advancePercent) > 0) {
    type = 'percent';
    percent = Number(service.advancePercent);
    source = 'service';
  } else if (mode === 'fixed' && Number(service?.advanceFixedPaise) > 0) {
    type = 'fixed';
    fixed = Number(service.advanceFixedPaise);
    source = 'service';
  }

  const advancePaise = computeConfiguredAdvancePaise({
    totalPaise: total,
    advanceType: type,
    advancePercent: percent,
    advanceFixedPaise: fixed,
  });

  return {
    ...base,
    advanceType: type,
    advancePercent: percent,
    advanceFixedPaise: fixed,
    advancePaise,
    remainingPaise: Math.max(0, total - advancePaise),
    paymentRequired: advancePaise > 0,
    source,
  };
}

/* ------------------------------------------------------------------ */
/* Payment channels                                                    */
/* ------------------------------------------------------------------ */

/**
 * Which payment channels this salon can actually use right now.
 * - gateway: platform provider (Razorpay / mock) ready AND enabled by the owner
 * - manual:  owner enabled direct UPI QR payments and configured a UPI ID
 */
export function resolveSalonChannels(salonId, config = resolvePaymentConfig()) {
  const settings = getSalonPaymentSettings(salonId, config);
  const gateway = Boolean(config.available && settings.gatewayEnabled);
  const manual = Boolean(settings.manualUpiEnabled && settings.upiId && isValidUpiVpa(settings.upiId));
  return { settings, gateway, manual, any: gateway || manual };
}

/** Enabled method list with the channel that will fulfil each method. */
export function effectivePaymentMethods(salonId, config = resolvePaymentConfig()) {
  const { settings, gateway, manual } = resolveSalonChannels(salonId, config);
  const out = [];
  for (const key of PAYMENT_METHOD_KEYS) {
    if (!settings.methods[key]) continue;
    const isUpi = UPI_METHOD_KEYS.includes(key);
    if (gateway) {
      out.push({ id: key, label: PAYMENT_METHOD_LABELS[key], channel: config.mode });
    } else if (manual && isUpi) {
      out.push({ id: key, label: PAYMENT_METHOD_LABELS[key], channel: 'manual_upi' });
    }
  }
  return out;
}

/** Secret-free summary embedded in public booking/checkout payloads. */
export function publicSalonPaymentSummary(salonId, config = resolvePaymentConfig()) {
  const { settings, gateway, manual } = resolveSalonChannels(salonId, config);
  return {
    advanceEnabled: settings.advanceEnabled,
    advanceType: settings.advanceType,
    advancePercent: settings.advancePercent,
    advanceFixedPaise: settings.advanceFixedPaise,
    balancePolicy: settings.balancePolicy,
    disabledPolicy: settings.disabledPolicy,
    gateway: { enabled: settings.gatewayEnabled, available: gateway, mode: gateway ? config.mode : null },
    manualUpi: manual
      ? {
          enabled: true,
          upiId: settings.upiId,
          displayName: settings.paymentDisplayName,
          qrUrl: settings.upiQrUrl || '',
        }
      : { enabled: false, upiId: '', displayName: '', qrUrl: '' },
    methods: effectivePaymentMethods(salonId, config),
    holdMinutes: config.holdMinutes,
    currency: config.currency,
    testMode: config.mock,
  };
}

/** Owner-facing view (includes everything; no secrets live here). */
export function serializeOwnerSettings(salonId, config = resolvePaymentConfig()) {
  const settings = getSalonPaymentSettings(salonId, config);
  return {
    ...settings,
    methodLabels: PAYMENT_METHOD_LABELS,
    channels: (() => {
      const { gateway, manual } = resolveSalonChannels(salonId, config);
      return {
        gateway,
        manual,
        gatewayMode: config.mode,
        gatewayReason: config.available ? null : config.reason,
        testMode: config.mock,
      };
    })(),
  };
}

/* ------------------------------------------------------------------ */
/* Per-service advance overrides                                       */
/* ------------------------------------------------------------------ */

/** Validates the advance override fields on a service create/update payload. */
export function serviceAdvanceFields(body, { partial = false } = {}) {
  const out = {};
  const hasMode = body.advanceMode !== undefined;
  if (!partial || hasMode) {
    const mode = str(body.advanceMode ?? 'inherit', { max: 10, field: 'Advance mode' });
    if (!SERVICE_ADVANCE_MODES.includes(mode)) {
      throw new ValidationError('Advance mode must be inherit, percent, fixed or none');
    }
    out.advance_mode = mode;
  }
  if (body.advancePercent !== undefined) {
    if (body.advancePercent === null || body.advancePercent === '') {
      out.advance_percent = null;
    } else {
      out.advance_percent = validatePercent(body.advancePercent, 'Service advance percentage');
    }
  }
  if (body.advanceFixedPaise !== undefined) {
    if (body.advanceFixedPaise === null || body.advanceFixedPaise === '') {
      out.advance_fixed_paise = null;
    } else {
      out.advance_fixed_paise = validateFixedPaise(body.advanceFixedPaise, 'Service advance amount');
    }
  }
  const mode = out.advance_mode;
  if (mode === 'percent' && out.advance_percent === undefined && !partial) {
    throw new ValidationError('Set the advance percentage for this service');
  }
  if (mode === 'fixed' && out.advance_fixed_paise === undefined && !partial) {
    throw new ValidationError('Set the advance amount for this service');
  }
  return out;
}

export function assertBookingAllowedByPolicy(advance) {
  if (!advance.paymentRequired && advance.settings.advanceEnabled === false && advance.disabledPolicy === 'block_booking') {
    throw new HttpError(
      409,
      'This salon is not accepting bookings without an advance payment right now. Please contact the salon or book on WhatsApp.',
      'BOOKING_POLICY_BLOCKED'
    );
  }
}

export function newSettingsId() {
  return newId();
}
