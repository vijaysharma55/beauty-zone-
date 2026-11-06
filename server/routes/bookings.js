/**
 * Public appointment requests.
 *
 * POST /api/public/bookings                     — visitor books on /salon/:slug
 * GET  /api/public/bookings/:id                 — public status (no PII)
 * GET  /api/public/bookings/:id/confirmation    — calendar/notification payload, gated on payment
 * GET  /api/salon/bookings                      — owner reads their own (see salon.js)
 *
 * Payment protection
 * ------------------
 * A public booking is created as `pending_payment` whenever an advance is due.
 * The server — not the browser — decides the amount (from the salon's published
 * service price) and the advance (configured percentage). Only a verified
 * payment (see server/payments) can move a booking to `confirmed`; a client can
 * never submit `advancePaid`, `advanceRef` or a status and have it trusted.
 *
 * The endpoint is intentionally forgiving in shape but strict in validation:
 * every field is length-capped and type-checked, the salon must be live, and a
 * failure never leaves the visitor stuck — the client falls back to WhatsApp.
 */

import { Router } from 'express';
import { db, newId, nowIso, audit, findSalonById, findSalonByOwner, findSalonBySlug } from '../db.js';
import { str, int, bool, ValidationError, HttpError, rateLimit, sanitizeText } from '../security.js';
import { asyncHandler } from '../middleware.js';
import { findLiveSalon } from './public.js';
import { sendMail } from '../mailer.js';
import { generateSlots } from '../availability.js';
import { creditLoyaltyPointsForCompletedBooking, verifyCustomerLoyaltyVoucher, consumeCustomerLoyaltyVoucher } from './loyalty.js';
import { getLiveContent, hasLiveApproval } from '../workflow.js';
import { resolvePaymentConfig } from '../payments/config.js';
import { toPaise } from '../payments/amounts.js';
import {
  assertBookingAllowedByPolicy,
  publicSalonPaymentSummary,
  resolveAdvanceForBooking,
  resolveSalonChannels,
} from '../payments/salon-settings.js';
import {
  expireStaleBookingHolds,
  latestPaymentForBooking,
  serializePayment,
} from '../payments/service.js';
import { receiptsForBooking, serializeReceipt } from '../payments/receipts.js';
import { notificationsForBooking, serializeWhatsAppNotification } from '../notifications/whatsapp.js';

export const bookingsRouter = Router();

const createLimiter = rateLimit({ windowMs: 60_000, max: 20, key: 'booking-create' });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME12_RE = /^(0?\d|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

export const BOOKING_STATUSES = [
  'requested',
  'pending_payment',
  'payment_verification_pending',
  'payment_failed',
  'advance_paid',
  'confirmed',
  'declined',
  'completed',
  'cancelled',
  'expired',
];
const CONFIRMED_STATUSES = ['confirmed', 'advance_paid', 'completed'];
export const isConfirmedStatus = (status) => CONFIRMED_STATUSES.includes(status);

/** Accepts both "14:30" and "02:30 PM", normalises to 24-hour "HH:MM". */
function normaliseTime(value) {
  const raw = String(value || '').trim();
  if (!raw) throw new ValidationError('Please choose a time slot.');
  if (TIME_RE.test(raw)) return raw;
  const m = raw.match(TIME12_RE);
  if (!m) throw new ValidationError('Please choose a valid time slot.');
  let [h, rest] = m[0].toUpperCase().split(':');
  const minutes = rest.slice(0, 2);
  const suffix = rest.slice(-2);
  let hour = Number(h);
  if (suffix === 'PM' && hour !== 12) hour += 12;
  if (suffix === 'AM' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minutes}`;
}

function requestAmountPaise(body) {
  const explicitPaise = body.amountPaise ?? body.estimatedTotalPaise;
  if (explicitPaise !== undefined && explicitPaise !== null && explicitPaise !== '') {
    return int(explicitPaise, { min: 0, max: 10_000_000_000, field: 'Amount' });
  }
  // Legacy field: `estimatedTotal` is expressed in rupees by the storefront.
  if (body.estimatedTotal !== undefined && body.estimatedTotal !== null && body.estimatedTotal !== '') {
    const rupees = int(body.estimatedTotal, { min: 0, max: 100_000_000, field: 'Estimated total' });
    return Math.round(rupees * 100);
  }
  return 0;
}

function parsePayload(body) {
  const b = body && typeof body === 'object' ? body : {};
  const slug = str(b.slug, { max: 60, field: 'Salon' });
  const fullName = str(b.fullName, { min: 2, max: 120, field: 'Name', required: true });
  const phoneRaw = str(b.phone, { min: 6, max: 40, field: 'Phone', required: true });
  const phone = phoneRaw.replace(/[^\d+\-\s()]/g, '');
  if (phone.replace(/\D/g, '').length < 8) {
    throw new ValidationError('Phone must contain at least 8 digits.');
  }
  const service = str(b.service, { min: 2, max: 160, field: 'Service', required: true });
  const date = str(b.date, { max: 10, field: 'Date', required: true });
  if (!DATE_RE.test(date)) throw new ValidationError('Please choose a valid date.');

  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  if (date < todayStr) throw new ValidationError('Please choose today or a future date.');

  const time = normaliseTime(b.time);
  const locationType = str(b.locationType, { max: 10, field: 'Location type' }) || 'salon';
  if (locationType !== 'salon' && locationType !== 'home') {
    throw new ValidationError('Location type must be salon or home.');
  }

  const stylistId = str(b.stylistId, { max: 80, field: 'Specialist id' });
  if (b.isDemo === true || /^demo[-_:]/i.test(stylistId)) {
    throw new HttpError(
      400,
      'Demo staff profiles are for preview only and cannot be booked.',
      'DEMO_STAFF_NOT_BOOKABLE'
    );
  }

  return {
    slug,
    salonId: str(b.salonId, { max: 80, field: 'Salon id' }),
    fullName,
    phone,
    service,
    category: str(b.serviceCategory, { max: 40, field: 'Category' }),
    stylist: str(b.stylist, { max: 120, field: 'Specialist' }),
    stylistId,
    date,
    time,
    locationType,
    branch: str(b.branch, { max: 160, field: 'Branch' }),
    address: locationType === 'home' ? sanitizeText(str(b.address, { max: 300, field: 'Address' }), 300) : '',
    locality: str(b.locality, { max: 120, field: 'Locality' }),
    distanceKm:
      b.distanceKm === undefined || b.distanceKm === null || b.distanceKm === ''
        ? null
        : Number(b.distanceKm),
    bridalTrial: bool(b.bridalTrial, false) ? 1 : 0,
    notes: sanitizeText(str(b.notes, { max: 1000, field: 'Notes' }), 1000),
    promoCode: str(b.promoCode, { max: 60, field: 'Voucher code' }) || null,
    amountPaise: requestAmountPaise(b),
    reference: str(b.reference, { max: 40, field: 'Booking reference' }) || null,
  };
}

/**
 * Resolves a preferred specialist id against the salon's roster.
 *
 * - Rejects cross-tenant staff ids so one salon's staff can never be booked on
 *   another salon's website.
 * - Rejects inactive or online-booking-disabled staff rows.
 * - Unknown non-database strings (e.g. legacy free-text catalogue ids) return
 *   null so the booking keeps the free-text name without mis-assigning.
 */
function resolveBookableStaff(salonId, staffId) {
  if (!salonId || !staffId) return null;
  const anyStaffRow = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  if (!anyStaffRow) return null;
  if (anyStaffRow.salon_id !== salonId) {
    throw new HttpError(
      400,
      'Selected specialist does not belong to this salon.',
      'INVALID_SALON_STAFF'
    );
  }
  if (!anyStaffRow.active || (anyStaffRow.booking_enabled !== undefined && anyStaffRow.booking_enabled !== null && !anyStaffRow.booking_enabled)) {
    throw new HttpError(
      409,
      'This specialist is not currently accepting online bookings.',
      'STAFF_NOT_BOOKABLE'
    );
  }
  // Owner-managed availability: only 'available' specialists can be booked online.
  if (anyStaffRow.availability_status && anyStaffRow.availability_status !== 'available') {
    throw new HttpError(
      409,
      anyStaffRow.availability_status === 'on_leave'
        ? 'This specialist is currently on leave.'
        : 'This specialist is currently busy and not taking online bookings.',
      'STAFF_NOT_BOOKABLE'
    );
  }
  return anyStaffRow;
}

/**
 * Best-effort double-booking guard. Counts existing non-cancelled requests for
 * the same salon/date/time; soft warning above a threshold (configurable).
 */
function conflictingCount(salonId, date, time) {
  try {
    const row = db
      .prepare(
        `SELECT COUNT(*) AS n FROM bookings
         WHERE salon_id = ? AND date = ? AND time = ? AND status NOT IN ('cancelled','declined','expired')`
      )
      .get(salonId, date, time);
    return row?.n ?? 0;
  } catch (err) {
    console.error('[bookings] conflict check failed', err.message);
    return 0;
  }
}

function makeReference(prefix) {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const rand = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `${prefix}-${stamp}${rand}`;
}

function uniqueReference(preferred, salonId) {
  const base = String(preferred || '').trim();
  if (base) {
    const clash = db.prepare('SELECT 1 FROM bookings WHERE reference = ?').get(base);
    if (!clash) return base;
  }
  for (let i = 0; i < 5; i += 1) {
    const candidate = makeReference(salonId ? 'SALON' : 'HOME');
    if (!db.prepare('SELECT 1 FROM bookings WHERE reference = ?').get(candidate)) return candidate;
  }
  return makeReference('BK');
}

/** Authoritative service, read from the salon's approved public snapshot. */
function resolveLiveService(salon, serviceName) {
  if (!salon) return null;
  try {
    const live = getLiveContent(salon);
    const services = Array.isArray(live?.services) ? live.services : [];
    const wanted = String(serviceName || '').trim().toLowerCase();
    return (
      services.find(
        (s) => s && String(s.name || '').trim().toLowerCase() === wanted && s.active !== false
      ) || null
    );
  } catch (err) {
    console.error('[bookings] service lookup failed', err.message);
    return null;
  }
}

function resolveServicePricePaise(salon, serviceName) {
  const price = Number(resolveLiveService(salon, serviceName)?.pricePaise);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null;
}

/** Payment summary attached to every booking response. */
export function bookingPaymentSummary(row, config = resolvePaymentConfig()) {
  const totalPaise = toPaise(row?.amount_paise ?? Math.round(Number(row?.estimated_total || 0) * 100));
  const advancePaise = toPaise(row?.advance_paise ?? Math.round(Number(row?.advance_paid || 0) * 100));
  const salonSummary = row?.salon_id ? publicSalonPaymentSummary(row.salon_id, config) : null;
  return {
    required: advancePaise > 0 && ['pending', 'failed', 'cancelled'].includes(row?.payment_status),
    status: row?.payment_status || 'not_required',
    mode: config.mode,
    available: row?.salon_id ? resolveSalonChannels(row.salon_id, config).any : config.available,
    currency: config.currency,
    advancePercent: salonSummary ? salonSummary.advancePercent : config.advancePercent,
    advanceType: salonSummary ? salonSummary.advanceType : 'percent',
    advanceFixedPaise: salonSummary ? salonSummary.advanceFixedPaise : 0,
    balancePolicy: row?.balance_policy || salonSummary?.balancePolicy || 'at_salon',
    holdMinutes: config.holdMinutes,
    totalPaise,
    amountPaise: totalPaise,
    advancePaise,
    remainingPaise: Math.max(0, totalPaise - advancePaise),
    advancePaidPaise: ['advance_paid', 'paid'].includes(row?.payment_status) ? advancePaise : 0,
    verificationPending: row?.payment_status === 'verification_pending',
    methods: salonSummary?.methods || [],
    manualUpi: salonSummary?.manualUpi || { enabled: false },
    testMode: config.mock,
  };
}

export function serializeBooking(row) {
  if (!row) return null;
  const totalPaise = toPaise(row.amount_paise ?? Math.round(Number(row.estimated_total || 0) * 100));
  const advancePaise = toPaise(row.advance_paise ?? Math.round(Number(row.advance_paid || 0) * 100));
  const confirmed = isConfirmedStatus(row.status);
  return {
    id: row.id,
    salonId: row.salon_id,
    reference: row.reference,
    fullName: row.full_name,
    phone: row.phone,
    service: row.service,
    category: row.category,
    stylist: row.stylist,
    stylistId: row.stylist_id || '',
    date: row.date,
    time: row.time,
    locationType: row.location_type,
    branch: row.branch,
    address: row.address,
    locality: row.locality,
    distanceKm: row.distance_km,
    bridalTrial: !!row.bridal_trial,
    notes: row.notes,
    promoCode: row.promo_code,
    estimatedTotal: Math.round(totalPaise / 100),
    amountPaise: totalPaise,
    advancePaise,
    /** Rupees actually received so far — never the amount still due. */
    advancePaid: ['advance_paid', 'paid'].includes(row.payment_status)
      ? Math.round(advancePaise / 100)
      : Number(row.advance_paid || 0),
    remainingPaise: Math.max(0, totalPaise - advancePaise),
    advanceRef: row.advance_ref,
    paymentStatus: row.payment_status || 'not_required',
    paymentRequired: !confirmed && ['pending', 'failed', 'cancelled'].includes(row.payment_status) && advancePaise > 0,
    balancePolicy: row.balance_policy || 'at_salon',
    paymentMethod: row.payment_method || '',
    verificationPending: row.payment_status === 'verification_pending',
    status: row.status,
    confirmed,
    calendarEnabled: confirmed,
    notificationsEnabled: confirmed,
    confirmedAt: row.confirmed_at || null,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Public status view — no name, phone or address are ever exposed. */
export function publicBookingStatus(row) {
  if (!row) return null;
  const totalPaise = toPaise(row.amount_paise ?? Math.round(Number(row.estimated_total || 0) * 100));
  const advancePaise = toPaise(row.advance_paise ?? Math.round(Number(row.advance_paid || 0) * 100));
  const confirmed = isConfirmedStatus(row.status);
  return {
    id: row.id,
    reference: row.reference,
    service: row.service,
    date: row.date,
    time: row.time,
    locationType: row.location_type,
    status: row.status,
    paymentStatus: row.payment_status || 'not_required',
    amountPaise: totalPaise,
    advancePaise,
    remainingPaise: Math.max(0, totalPaise - advancePaise),
    confirmed,
    calendarEnabled: confirmed,
    notificationsEnabled: confirmed,
    confirmedAt: row.confirmed_at || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calendarDetails(row, salon) {
  const [hh, mm] = String(row.time || '00:00').split(':').map(Number);
  const startDate = String(row.date).replace(/-/g, '');
  const startTime = `${String(hh).padStart(2, '0')}${String(mm).padStart(2, '0')}00`;
  const endMinutes = hh * 60 + mm + 60;
  const endHH = String(Math.floor(endMinutes / 60) % 24).padStart(2, '0');
  const endMM = String(endMinutes % 60).padStart(2, '0');
  const endTime = `${endHH}${endMM}00`;
  const title = `${row.service} — ${salon?.name || 'Appointment'}`;
  const location =
    row.location_type === 'home' ? row.address || row.locality || '' : row.branch || salon?.city || '';
  const details = [
    `Booking reference: ${row.reference}`,
    `Service: ${row.service}`,
    `Salon: ${salon?.name || ''}`,
    salon?.phone ? `Phone: ${salon.phone}` : null,
  ]
    .filter(Boolean)
    .join('\\n');
  const googleUrl =
    'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(title)}` +
    `&dates=${startDate}T${startTime}/${startDate}T${endTime}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(location)}`;
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BeautyZone//Booking//EN',
    'BEGIN:VEVENT',
    `UID:${row.id}@beautyzone`,
    `DTSTART:${startDate}T${startTime}`,
    `DTEND:${startDate}T${endTime}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${details.replace(/\\n/g, '\\\\n')}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const whatsappRaw = (salon?.whatsapp || salon?.phone || '').replace(/[^\\d]/g, '');
  const whatsappUrl = whatsappRaw
    ? `https://wa.me/${whatsappRaw}?text=${encodeURIComponent(
        `Hello ${salon?.name || ''}, my booking ${row.reference} is confirmed for ${row.service} on ${row.date} at ${row.time}.`
      )}`
    : '';
  return { title, location, googleUrl, ics, whatsappUrl };
}

/* ------------------------------------------------------------------ */
/* Public create                                                       */
/* ------------------------------------------------------------------ */

bookingsRouter.post(
  '/bookings',
  createLimiter,
  asyncHandler(async (req, res) => {
    const data = parsePayload(req.body);
    const payConfig = resolvePaymentConfig();
    expireStaleBookingHolds(payConfig);

    // Tenant resolution: explicit slug or salonId wins, then the subdomain the request came in on.
    const candidateSlug = data.slug || (req.tenantSalon ? req.tenantSalon.slug : '');
    let salon = null;
    if (candidateSlug || data.salonId) {
      const salonRow = candidateSlug ? findSalonBySlug(candidateSlug) : findSalonById(data.salonId);
      if (!salonRow) {
        throw new HttpError(404, 'This salon is not accepting online bookings right now.', 'SALON_NOT_FOUND');
      }
      if (!salonRow.website_published || !hasLiveApproval(salonRow)) {
        throw new HttpError(
          403,
          'Online booking is disabled because this salon website is not published yet.',
          'WEBSITE_NOT_PUBLISHED'
        );
      }
      salon = salonRow;
    } else if (req.user?.role === 'salon_owner') {
      const ownSalon = findSalonByOwner(req.user.id);
      if (ownSalon && (!ownSalon.website_published || !hasLiveApproval(ownSalon))) {
        throw new HttpError(
          403,
          'Online booking is disabled because your salon website is not published yet.',
          'WEBSITE_NOT_PUBLISHED'
        );
      }
      if (ownSalon) salon = ownSalon;
    } else {
      const flagship = findSalonBySlug('lumina-luxe');
      if (flagship && (!flagship.website_published || !hasLiveApproval(flagship))) {
        throw new HttpError(
          403,
          'Online booking is disabled because this salon website is not published yet.',
          'WEBSITE_NOT_PUBLISHED'
        );
      }
    }

    // Preferred specialist: verify the id against the salon roster and keep the
    // canonical staff name so the owner dashboard always shows a real person.
    if (data.stylistId) {
      const staffRow = resolveBookableStaff(salon ? salon.id : null, data.stylistId);
      if (staffRow) {
        if (!data.stylist) data.stylist = staffRow.name;
        data.stylistId = staffRow.id;
      } else if (salon) {
        // Unknown / unavailable staff id on a real salon: keep the typed name.
        data.stylistId = '';
      }
    }

    // Sanity-check that the requested time falls inside the salon's opening hours.
    if (salon) {
      try {
        const live = getLiveContent(salon);
        const timings = Array.isArray(live?.salon?.timings) ? live.salon.timings : [];
        const result = generateSlots({ date: data.date, timings, durationMinutes: 30, leadMinutes: 0 });
        if (result.closed) {
          throw new HttpError(409, 'Sorry, we are closed on the selected day. Please choose another date.');
        }
        if (result.slots.length > 0 && !result.slots.some((s) => s.value === data.time)) {
          throw new HttpError(409, 'That time is outside our opening hours. Please choose another slot.');
        }
      } catch (err) {
        if (err instanceof HttpError) throw err;
        console.error('[bookings] hours validation skipped', err.message);
      }
    }

    // The amount is derived server-side from the salon's published price. A
    // client-supplied estimate is only used when no published price exists.
    const publishedPrice = resolveServicePricePaise(salon, data.service);
    let amountPaise = publishedPrice ?? data.amountPaise;
    const voucherBaseAmountPaise = amountPaise;

    const reference = uniqueReference(data.reference, salon);
    const ts = nowIso();
    const id = newId();

    let voucherApplied = null;
    if (data.promoCode) {
      const voucher = await verifyCustomerLoyaltyVoucher(data.promoCode, req.get('authorization'), {
        phone: data.phone,
        serviceTitle: data.service,
        locationType: data.locationType,
        billAmount: Math.round(voucherBaseAmountPaise / 100),
      });
      const discountAmount = Number(voucher.discountAmount);
      if (!Number.isSafeInteger(discountAmount) || discountAmount < 0) {
        throw new HttpError(400, 'Verified voucher has an invalid discount value.', 'INVALID_VOUCHER');
      }
      const discountPaise = Math.max(0, Math.round(discountAmount * 100));
      amountPaise = Math.max(0, amountPaise - discountPaise);
      voucherApplied = voucher;
    }

    // The advance is resolved from the salon owner's settings (percentage or
    // fixed amount, with optional per-service overrides) — never the client.
    const liveService = salon ? resolveLiveService(salon, data.service) : null;
    const advance = resolveAdvanceForBooking({
      salonId: salon?.id || null,
      service: liveService,
      totalPaise: amountPaise,
      config: payConfig,
    });
    assertBookingAllowedByPolicy(advance);

    const breakdown = {
      totalPaise: amountPaise,
      advancePaise: advance.advancePaise,
      remainingPaise: advance.remainingPaise,
      paymentRequired: advance.paymentRequired,
    };

    const channels = salon ? resolveSalonChannels(salon.id, payConfig) : { any: payConfig.available };
    if (breakdown.paymentRequired && !channels.any) {
      // Fail closed: a required advance is never silently bypassed.
      throw new HttpError(
        503,
        payConfig.reason ||
          'This salon requires an advance payment but has no payment channel configured yet. Please book on WhatsApp.',
        'PAYMENT_UNAVAILABLE'
      );
    }

    const status = breakdown.paymentRequired ? 'pending_payment' : 'requested';
    const paymentStatus = breakdown.paymentRequired ? 'pending' : 'not_required';

    const conflicts = salon ? conflictingCount(salon.id, data.date, data.time) : 0;

    db.prepare(
      `INSERT INTO bookings
         (id, salon_id, reference, full_name, phone, service, category, stylist, stylist_id, date, time,
          location_type, branch, address, locality, distance_km, bridal_trial, notes, promo_code,
          estimated_total, advance_paid, advance_ref, amount_paise, advance_paise, payment_status,
          balance_policy, confirmed_at, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?, ?, ?, NULL, ?, 'public', ?, ?)`
    ).run(
      id,
      salon ? salon.id : null,
      reference,
      data.fullName,
      data.phone,
      data.service,
      data.category,
      data.stylist,
      data.stylistId,
      data.date,
      data.time,
      data.locationType,
      data.branch,
      data.address,
      data.locality,
      Number.isFinite(data.distanceKm) ? data.distanceKm : null,
      data.bridalTrial,
      data.notes,
      data.promoCode,
      Math.round(amountPaise / 100),
      amountPaise,
      breakdown.advancePaise,
      paymentStatus,
      advance.balancePolicy || 'at_salon',
      status,
      ts,
      ts
    );

    if (voucherApplied) {
      try {
        await consumeCustomerLoyaltyVoucher(
          voucherApplied.code,
          `${salon?.id || 'public'}:${id}`,
          req.get('authorization'),
          {
            phone: data.phone,
            serviceTitle: data.service,
            locationType: data.locationType,
            billAmount: Math.round(voucherBaseAmountPaise / 100),
          }
        );
      } catch (error) {
        // Do not leave an active appointment carrying a voucher discount that
        // was not atomically consumed by the authoritative Supabase ledger.
        db.prepare('DELETE FROM bookings WHERE id = ?').run(id);
        throw error;
      }
    }

    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

    audit(req, 'booking.created', 'booking', id, {
      salonId: salon?.id || null,
      date: data.date,
      time: data.time,
      status,
      amountPaise,
      advancePaise: breakdown.advancePaise,
      paymentMode: payConfig.mode,
    });

    // Notify the owner (best-effort: mail failure must not fail the booking).
    if (salon) {
      try {
        const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(salon.owner_id);
        if (owner?.email) {
          await sendMail({
            to: owner.email,
            subject: `${breakdown.paymentRequired ? 'Awaiting payment — ' : 'New booking '}${reference} — ${salon.name}`,
            tag: 'booking-created',
            text: [
              breakdown.paymentRequired
                ? `A new appointment is waiting for the advance payment to clear.`
                : `New appointment request for ${salon.name}.`,
              ``,
              `Reference : ${reference}`,
              `Client    : ${data.fullName} (${data.phone})`,
              `Service   : ${data.service}`,
              `When      : ${data.date} at ${data.time}`,
              `Total     : ₹${(amountPaise / 100).toFixed(2)}`,
              breakdown.paymentRequired
                ? `Advance   : ₹${(breakdown.advancePaise / 100).toFixed(2)} (${payConfig.mode} payment)`
                : null,
              `Mode      : ${data.locationType === 'home' ? `Home visit — ${data.address || data.locality || ''}` : `Salon — ${data.branch || ''}`}`,
              data.notes ? `Notes     : ${data.notes}` : null,
              data.promoCode ? `Voucher   : ${data.promoCode}` : null,
              ``,
              breakdown.paymentRequired
                ? `The slot is held until the advance is paid and verified.`
                : `Sign in to your dashboard to confirm or reschedule.`,
            ]
              .filter(Boolean)
              .join('\n'),
          });
        }
      } catch (err) {
        console.error('[bookings] owner notification failed', err.message);
      }
    }

    return res.status(201).json({
      booking: serializeBooking(row),
      salon: salon ? { name: salon.name, slug: salon.slug, phone: salon.phone } : null,
      payment: {
        ...bookingPaymentSummary(row, payConfig),
        required: breakdown.paymentRequired,
        advancePaise: breakdown.advancePaise,
        remainingPaise: breakdown.remainingPaise,
        totalPaise: breakdown.totalPaise,
        advanceType: advance.advanceType,
        advancePercent: advance.advancePercent,
        advanceFixedPaise: advance.advanceFixedPaise,
        balancePolicy: advance.balancePolicy,
        message: breakdown.paymentRequired
          ? `Pay ₹${(breakdown.advancePaise / 100).toFixed(2)} now to confirm this appointment. The remaining ₹${(breakdown.remainingPaise / 100).toFixed(2)} is ${advance.balancePolicy === 'online' ? 'payable online before your visit' : 'payable at the salon'}.`
          : 'No advance is required. The salon will confirm your request.',
      },
      confirmation: {
        confirmed: false,
        calendarEnabled: false,
        notificationsEnabled: false,
        message: 'Calendar downloads and confirmation notifications unlock after your payment is verified.',
      },
      warning:
        conflicts >= 2
          ? 'This slot is in high demand — we will call you to confirm or offer the nearest alternative.'
          : null,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Public booking status + gated confirmation payload                  */
/* ------------------------------------------------------------------ */

bookingsRouter.get(
  '/bookings/:bookingId',
  asyncHandler(async (req, res) => {
    const bookingId = str(req.params.bookingId, { max: 80, field: 'Booking' });
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!row) return res.status(404).json({ error: 'Booking not found.', code: 'BOOKING_NOT_FOUND' });
    expireStaleBookingHolds();
    const fresh = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    return res.json({
      booking: publicBookingStatus(fresh),
      payment: serializePayment(latestPaymentForBooking(bookingId)),
    });
  })
);

/**
 * Confirmation payload (calendar links + notification message).
 *
 * Deliberately unavailable before a verified payment: this is the server-side
 * gate behind the disabled calendar buttons in the UI.
 */
bookingsRouter.get(
  '/bookings/:bookingId/confirmation',
  asyncHandler(async (req, res) => {
    const bookingId = str(req.params.bookingId, { max: 80, field: 'Booking' });
    const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(bookingId);
    if (!row) return res.status(404).json({ error: 'Booking not found.', code: 'BOOKING_NOT_FOUND' });

    if (!isConfirmedStatus(row.status)) {
      return res.status(409).json({
        error: 'This booking is not confirmed yet. Calendar downloads and confirmation notifications unlock once the advance payment is verified.',
        code: 'PAYMENT_REQUIRED',
        booking: publicBookingStatus(row),
      });
    }

    const salon = row.salon_id ? db.prepare('SELECT * FROM salons WHERE id = ?').get(row.salon_id) : null;
    const calendar = calendarDetails(row, salon);
    const receipts = receiptsForBooking(row.id).map((r) => serializeReceipt(r, { accessToken: r.access_token }));
    const latestWhatsApp = notificationsForBooking(row.id)[0] || null;
    return res.json({
      confirmed: true,
      booking: publicBookingStatus(row),
      salon: salon
        ? { name: salon.name, slug: salon.slug, phone: salon.phone, city: salon.city, addressLine: salon.address_line }
        : null,
      calendar,
      receipts,
      whatsapp: latestWhatsApp
        ? { status: latestWhatsApp.status, updatedAt: latestWhatsApp.updated_at }
        : null,
      message: `Your appointment for ${row.service} on ${row.date} at ${row.time} is confirmed.`,
    });
  })
);

/**
 * Join waitlist for a fully booked slot.
 *
 * POST /api/public/waitlist
 */
bookingsRouter.post(
  '/waitlist',
  createLimiter,
  asyncHandler(async (req, res) => {
    const b = req.body || {};
    const rawStylistId = str(b.stylistId ?? b.preferredStylistId, { max: 80, field: 'Stylist ID' }) || '';
    if (b.isDemo === true || /^demo[-_:]/i.test(rawStylistId)) {
      throw new HttpError(
        400,
        'Demo staff profiles are for preview only and cannot be booked.',
        'DEMO_STAFF_NOT_BOOKABLE'
      );
    }

    const slug = str(b.slug, { max: 60, field: 'Salon' });
    const rawSalonId = str(b.salonId, { max: 80, field: 'Salon ID' });
    let salon = null;
    if (slug) {
      const salonRow = findSalonBySlug(slug);
      if (!salonRow) {
        throw new HttpError(404, 'Salon not found.', 'SALON_NOT_FOUND');
      }
      if (!salonRow.website_published || !hasLiveApproval(salonRow)) {
        throw new HttpError(
          403,
          'Waitlist booking is disabled until this salon website is published.',
          'WEBSITE_NOT_PUBLISHED'
        );
      }
      salon = salonRow;
    } else if (rawSalonId) {
      const salonRow = db.prepare('SELECT * FROM salons WHERE id = ?').get(rawSalonId);
      if (!salonRow) {
        throw new HttpError(404, 'Salon not found.', 'SALON_NOT_FOUND');
      }
      if (!salonRow.website_published || !hasLiveApproval(salonRow)) {
        throw new HttpError(
          403,
          'Waitlist booking is disabled until this salon website is published.',
          'WEBSITE_NOT_PUBLISHED'
        );
      }
      salon = salonRow;
    } else if (req.tenantSalon) {
      if (!req.tenantSalon.website_published || !hasLiveApproval(req.tenantSalon)) {
        throw new HttpError(
          403,
          'Waitlist booking is disabled until this salon website is published.',
          'WEBSITE_NOT_PUBLISHED'
        );
      }
      salon = req.tenantSalon;
    }

    const fullName = str(b.fullName ?? b.name, { min: 2, max: 120, field: 'Name', required: true });
    const phoneRaw = str(b.phone, { min: 6, max: 40, field: 'Phone', required: true });
    const phone = phoneRaw.replace(/[^\d+\-\s()]/g, '');
    if (phone.replace(/\D/g, '').length < 8) {
      throw new ValidationError('Phone must contain at least 8 digits.');
    }
    const email = str(b.email, { max: 120, field: 'Email' }) || null;
    const service = str(b.service, { min: 2, max: 160, field: 'Service', required: true });
    const date = str(b.date ?? b.preferredDate, { max: 10, field: 'Date', required: true });
    const time = normaliseTime(b.time || '11:00 AM');

    const id = newId();
    const ts = nowIso();

    db.prepare(
      `INSERT INTO waitlist (id, salon_id, full_name, phone, email, service, date, time, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    ).run(id, salon ? salon.id : null, fullName, phone, email, service, date, time, ts, ts);

    return res.status(201).json({
      message: 'You have been added to the waitlist. We will notify you if an opening becomes available!',
      id,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Owner-facing read/update (mounted under /api/salon)                 */
/* ------------------------------------------------------------------ */

export const ownerBookingsRouter = Router();

/** Lists bookings for the authenticated owner's own salon only. */
ownerBookingsRouter.get('/', (req, res) => {
  const salon = req.salon;
  if (!salon) return res.status(409).json({ error: 'Complete salon onboarding first.' });
  const status = str(req.query.status, { max: 20, field: 'Status' }) || '';
  const where = status ? 'WHERE salon_id = ? AND status = ?' : 'WHERE salon_id = ?';
  const params = status ? [salon.id, status] : [salon.id];
  const rows = db
    .prepare(`SELECT * FROM bookings ${where} ORDER BY date DESC, time DESC LIMIT 200`)
    .all(...params);
  res.json({ bookings: rows.map(serializeBooking) });
});

/**
 * Confirms / declines / completes / cancels one booking (tenant-scoped).
 *
 * An unpaid booking can never be confirmed here: the advance must have been
 * verified by the payment service first. Owners may still decline or cancel.
 */
ownerBookingsRouter.patch('/:bookingId', asyncHandler(async (req, res) => {
  const salon = req.salon;
  if (!salon) return res.status(409).json({ error: 'Complete salon onboarding first.' });
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId);
  if (!row || row.salon_id !== salon.id) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const status = str(req.body?.status, { max: 20, field: 'Status', required: true });
  if (!BOOKING_STATUSES.includes(status) || status === 'expired') {
    throw new ValidationError('Invalid booking status');
  }

  const isConfirmation = ['confirmed', 'advance_paid', 'completed'].includes(status);
  const paymentVerified = ['advance_paid', 'paid', 'not_required'].includes(row.payment_status);
  if (isConfirmation && !paymentVerified) {
    throw new HttpError(
      409,
      'This booking cannot be confirmed until the advance payment is verified.',
      'PAYMENT_REQUIRED'
    );
  }

  try {
    if (isConfirmation && row.advance_paise > 0 && !row.confirmed_at) {
      db.prepare('UPDATE bookings SET status = ?, confirmed_at = ?, updated_at = ? WHERE id = ?').run(
        status,
        nowIso(),
        nowIso(),
        row.id
      );
    } else {
      db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), row.id);
    }
  } catch (err) {
    if (isConfirmation && /UNIQUE|constraint/i.test(err.message || '')) {
      throw new HttpError(409, 'Another confirmed booking already owns this date and time.', 'SLOT_TAKEN');
    }
    throw err;
  }
  audit(req, 'booking.status_changed', 'booking', row.id, { from: row.status, to: status });

  let loyaltyReward = null;
  if (status === 'completed') {
    const updatedRow = db.prepare('SELECT * FROM bookings WHERE id = ?').get(row.id);
    try {
      loyaltyReward = await creditLoyaltyPointsForCompletedBooking(updatedRow, req.user?.supabase_uid);
    } catch (error) {
      // Completion is an operational salon action. Keep it completed, but make
      // the failed points award visible and retryable; the RPC is idempotent.
      console.error('[loyalty] Supabase award failed for booking', row.id, error.message);
      loyaltyReward = { awarded: false, retryable: true, message: error.message || 'Points award could not be confirmed.' };
    }
  }

  return res.json({
    booking: serializeBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(row.id)),
    loyaltyReward,
  });
}));

export default bookingsRouter;
