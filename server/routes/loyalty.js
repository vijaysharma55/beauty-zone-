import { HttpError } from '../security.js';

const SUPABASE_URL = (process.env.SUPABASE_URL || 'https://botkjeikjzhnbxnowdkl.supabase.co').replace(/\/+$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_f2nHVHcAdrlosQbZwAAxnQ_vnHQuuv0';

export function normalizeLoyaltyPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  const normalized = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^\d{10}$/.test(normalized) ? normalized : null;
}

export function calculateLoyaltyPoints(billAmount, tier = 'silver') {
  const amount = Number(billAmount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const base = Math.max(100, Math.round(amount / 10));
  const multiplier = tier === 'platinum' ? 1.5 : tier === 'gold' ? 1.25 : 1;
  return Math.round(base * multiplier);
}

export function calculateLoyaltyTierFromLifetime(lifetimePoints) {
  const lifetime = Math.max(0, Number(lifetimePoints) || 0);
  if (lifetime >= 1500) return 'platinum';
  if (lifetime >= 500) return 'gold';
  return 'silver';
}

function bearerToken(authorization) {
  const match = String(authorization || '').match(/^Bearer\s+([^\s]+)$/i);
  if (!match) throw new HttpError(401, 'A valid Supabase sign-in session is required for this loyalty action.', 'LOYALTY_AUTH_REQUIRED');
  return match[1];
}

async function callLoyaltyRpc(functionName, params, authorization) {
  const token = bearerToken(authorization);
  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/' + functionName, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000),
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 200) }; }
  }
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? response.status : response.status >= 500 ? 503 : 400;
    const message = data?.message || data?.hint || data?.error_description || data?.error || 'Loyalty service rejected this request.';
    throw new HttpError(status, message, data?.code || 'LOYALTY_RPC_FAILED');
  }
  return data;
}

async function callServerAwardRpc(params) {
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serverKey) {
    throw new HttpError(
      503,
      'Server loyalty awards are not configured. Set SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) in the server environment.',
      'LOYALTY_SERVER_KEY_MISSING'
    );
  }
  const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/award_completed_loyalty_points', {
    method: 'POST',
    headers: {
      apikey: serverKey,
      Authorization: 'Bearer ' + serverKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(10000),
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 200) }; }
  }
  if (!response.ok) {
    const status = response.status === 401 || response.status === 403 ? response.status : response.status >= 500 ? 503 : 400;
    const message = data?.message || data?.hint || data?.error_description || data?.error || 'Loyalty award was rejected.';
    throw new HttpError(status, message, data?.code || 'LOYALTY_AWARD_FAILED');
  }
  return data;
}

export async function verifyCustomerLoyaltyVoucher(code, authorization) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || normalizedCode.length > 60) {
    throw new HttpError(400, 'Enter a valid rewards voucher code.', 'INVALID_VOUCHER');
  }
  const result = await callLoyaltyRpc('verify_customer_loyalty_voucher', {
    p_code: normalizedCode,
  }, authorization);
  if (!result?.valid || !result?.voucher) {
    throw new HttpError(400, 'This voucher could not be verified for your signed-in account.', 'INVALID_VOUCHER');
  }
  return result.voucher;
}

export async function consumeCustomerLoyaltyVoucher(code, externalBookingId, authorization) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || !externalBookingId) {
    throw new HttpError(400, 'Voucher code and booking reference are required.', 'INVALID_VOUCHER');
  }
  return callLoyaltyRpc('consume_customer_loyalty_voucher', {
    p_code: normalizedCode,
    p_external_booking_id: String(externalBookingId).slice(0, 180),
  }, authorization);
}

/**
 * Awards visit points only through the Supabase RPC after an owner marks a booking
 * completed. The booking's final rupee amount is used; estimated/default values
 * are never fabricated. The database enforces role, tenant, and idempotency.
 */
export async function creditLoyaltyPointsForCompletedBooking(booking, actorId) {
  if (!booking || !booking.id || !booking.phone) {
    return { awarded: false, reason: 'Booking is missing its id or customer mobile number.' };
  }
  const phone = normalizeLoyaltyPhone(booking.phone);
  if (!phone) return { awarded: false, reason: 'Customer mobile number is invalid.' };

  const billAmount = Number(booking.estimated_total);
  if (!Number.isFinite(billAmount) || billAmount <= 0) {
    return { awarded: false, reason: 'No eligible final bill amount was recorded.' };
  }

  if (!actorId) {
    throw new HttpError(409, 'This salon owner is not linked to a verified Supabase profile.', 'LOYALTY_OWNER_NOT_LINKED');
  }

  return callServerAwardRpc({
    p_actor_id: actorId,
    p_phone: phone,
    p_name: booking.full_name || '',
    p_external_booking_id: String(booking.id),
    p_service_title: booking.service || 'Salon Service',
    p_bill_amount: Math.round(billAmount),
  }, authorization);
}
