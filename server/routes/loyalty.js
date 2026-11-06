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
      // New sb_secret_* keys are opaque API keys, not JWTs. Legacy
      // service_role keys are JWTs and must also be sent as Bearer tokens.
      ...(serverKey.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + serverKey }),
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

export async function verifyCustomerLoyaltyVoucher(code, authorization, bookingContext) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || normalizedCode.length > 60) {
    throw new HttpError(400, 'Enter a valid rewards voucher code.', 'INVALID_VOUCHER');
  }
  if (!bookingContext || !bookingContext.phone || !bookingContext.serviceTitle) {
    throw new HttpError(400, 'Enter your booking mobile number and service before applying this voucher.', 'INVALID_VOUCHER_CONTEXT');
  }

  const result = await callLoyaltyRpc('validate_customer_loyalty_voucher', {
    p_code: normalizedCode,
    p_booking_phone: normalizeLoyaltyPhone(bookingContext.phone),
    p_service_title: String(bookingContext.serviceTitle).slice(0, 160),
    p_location_type: bookingContext.locationType,
    p_bill_amount: Math.max(0, Math.round(Number(bookingContext.billAmount) || 0)),
    p_distance_km: bookingContext.distanceKm !== null && bookingContext.distanceKm !== undefined
      && Number.isFinite(Number(bookingContext.distanceKm)) ? Number(bookingContext.distanceKm) : null,
  }, authorization);
  if (!result?.valid || !result?.voucher) {
    throw new HttpError(400, 'This voucher is not eligible for the selected booking.', 'INVALID_VOUCHER');
  }
  return result.voucher;
}

export async function consumeCustomerLoyaltyVoucher(code, externalBookingId, authorization, bookingContext) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || !externalBookingId || !bookingContext?.phone || !bookingContext?.serviceTitle) {
    throw new HttpError(400, 'Voucher code, booking reference and booking details are required.', 'INVALID_VOUCHER');
  }
  const params = {
    p_code: normalizedCode,
    p_external_booking_id: String(externalBookingId).slice(0, 180),
    p_booking_phone: normalizeLoyaltyPhone(bookingContext.phone),
    p_service_title: String(bookingContext.serviceTitle).slice(0, 160),
    p_location_type: bookingContext.locationType,
    p_bill_amount: Math.max(0, Math.round(Number(bookingContext.billAmount) || 0)),
    p_distance_km: bookingContext.distanceKm !== null && bookingContext.distanceKm !== undefined
      && Number.isFinite(Number(bookingContext.distanceKm)) ? Number(bookingContext.distanceKm) : null,
  };
  // The SQL RPC is idempotent for the same booking reference. Retry once on
  // transient failure/timeout to resolve the "committed but response lost" case.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callLoyaltyRpc('consume_customer_loyalty_voucher', params, authorization);
    } catch (error) {
      const transient = error?.status === 503 || error?.name === 'TimeoutError'
        || error?.name === 'AbortError' || error instanceof TypeError;
      if (!transient || attempt === 1) throw error;
    }
  }
  throw new HttpError(503, 'Voucher consumption could not be confirmed.', 'VOUCHER_CONSUMPTION_UNCONFIRMED');
}
/**
 * Awards visit points only through the Supabase RPC after an owner marks a booking
 * completed. The booking's final rupee amount is used; estimated/default values
 * are never fabricated. The database enforces role, tenant, and idempotency.
 */
export async function releaseCustomerLoyaltyVoucher(code, externalBookingId) {
  const serverKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serverKey) {
    throw new HttpError(503, 'Server loyalty awards are not configured.', 'LOYALTY_SERVER_KEY_MISSING');
  }
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || !externalBookingId) {
    throw new HttpError(400, 'Voucher code and booking reference are required.', 'INVALID_VOUCHER');
  }
  const params = {
    p_code: normalizedCode,
    p_external_booking_id: String(externalBookingId).slice(0, 180),
  };
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(SUPABASE_URL + '/rest/v1/rpc/release_customer_loyalty_voucher', {
        method: 'POST',
        headers: {
          apikey: serverKey,
          // New sb_secret_* keys are opaque API keys, not JWTs. Legacy
          // service_role keys are JWTs and must also be sent as Bearer tokens.
          ...(serverKey.startsWith('sb_secret_') ? {} : { Authorization: 'Bearer ' + serverKey }),
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
        throw new HttpError(status, data?.message || data?.hint || data?.error || 'Voucher release was rejected.', data?.code || 'VOUCHER_RELEASE_FAILED');
      }
      return data;
    } catch (error) {
      const transient = error?.status === 503 || error?.name === 'TimeoutError'
        || error?.name === 'AbortError' || error instanceof TypeError;
      if (!transient || attempt === 1) throw error;
    }
  }
  throw new HttpError(503, 'Voucher release could not be confirmed.', 'VOUCHER_RELEASE_UNCONFIRMED');
}

export async function creditLoyaltyPointsForCompletedBooking(booking, actorId) {
  if (!booking || !booking.id || !booking.phone) {
    return { awarded: false, reason: 'Booking is missing its id or customer mobile number.' };
  }
  const phone = normalizeLoyaltyPhone(booking.phone);
  if (!phone) return { awarded: false, reason: 'Customer mobile number is invalid.' };

  const billAmount = Number(booking.final_bill_amount);
  if (!Number.isSafeInteger(billAmount) || billAmount <= 0 || billAmount > 10000000) {
    return { awarded: false, reason: 'A valid final bill amount must be recorded before points can be awarded.' };
  }

  if (!actorId) {
    throw new HttpError(409, 'This salon owner is not linked to a verified Supabase profile.', 'LOYALTY_OWNER_NOT_LINKED');
  }

  const params = {
    p_actor_id: actorId,
    p_phone: phone,
    p_name: booking.full_name || '',
    p_external_booking_id: String(booking.id),
    p_service_title: booking.service || 'Salon Service',
    p_bill_amount: Math.round(billAmount),
  };
  // The RPC is idempotent by booking ID. Retrying handles a successful commit
  // whose network response was lost.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callServerAwardRpc(params);
    } catch (error) {
      const transient = error?.status === 503 || error?.name === 'TimeoutError'
        || error?.name === 'AbortError' || error instanceof TypeError;
      if (!transient || attempt === 1) throw error;
    }
  }
  throw new HttpError(503, 'Points award could not be confirmed.', 'LOYALTY_AWARD_UNCONFIRMED');
}
