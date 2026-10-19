/**
 * Public appointment requests.
 *
 * POST /api/public/bookings            — visitor books on /salon/:slug
 * GET  /api/salon/../bookings          — owner reads their own (see salon.js)
 *
 * The endpoint is intentionally forgiving in shape but strict in validation:
 * every field is length-capped and type-checked, the salon must be live, and a
 * failure never leaves the visitor stuck — the client falls back to WhatsApp.
 */

import { Router } from 'express';
import { db, newId, nowIso, audit } from '../db.js';
import { str, int, bool, ValidationError, HttpError, rateLimit, sanitizeText } from '../security.js';
import { asyncHandler } from '../middleware.js';
import { findLiveSalon } from './public.js';
import { sendMail } from '../mailer.js';
import { generateSlots } from '../availability.js';

export const bookingsRouter = Router();

const createLimiter = rateLimit({ windowMs: 60_000, max: 20, key: 'booking-create' });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME12_RE = /^(0?\d|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

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

  const estimatedTotal = b.estimatedTotal === undefined || b.estimatedTotal === null
    ? 0
    : int(b.estimatedTotal, { min: 0, max: 100_000_000, field: 'Estimated total' });
  const advancePaid = b.advancePaid === undefined || b.advancePaid === null
    ? 0
    : int(b.advancePaid, { min: 0, max: 100_000_000, field: 'Advance paid' });

  return {
    slug,
    fullName,
    phone,
    service,
    category: str(b.serviceCategory, { max: 40, field: 'Category' }),
    stylist: str(b.stylist, { max: 120, field: 'Specialist' }),
    date,
    time,
    locationType,
    branch: str(b.branch, { max: 160, field: 'Branch' }),
    address: locationType === 'home' ? sanitizeText(str(b.address, { max: 300, field: 'Address' }), 300) : '',
    locality: str(b.locality, { max: 120, field: 'Locality' }),
    distanceKm: b.distanceKm === undefined || b.distanceKm === null || b.distanceKm === ''
      ? null
      : Number(b.distanceKm),
    bridalTrial: bool(b.bridalTrial, false) ? 1 : 0,
    notes: sanitizeText(str(b.notes, { max: 1000, field: 'Notes' }), 1000),
    promoCode: str(b.promoCode, { max: 60, field: 'Voucher code' }) || null,
    estimatedTotal,
    advancePaid,
    advanceRef: str(b.advanceRef, { max: 60, field: 'Payment reference' }) || null,
    reference: str(b.reference, { max: 40, field: 'Booking reference' }) || null,
  };
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
         WHERE salon_id = ? AND date = ? AND time = ? AND status NOT IN ('cancelled','declined')`
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

export function serializeBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    salonId: row.salon_id,
    reference: row.reference,
    fullName: row.full_name,
    phone: row.phone,
    service: row.service,
    category: row.category,
    stylist: row.stylist,
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
    estimatedTotal: row.estimated_total,
    advancePaid: row.advance_paid,
    advanceRef: row.advance_ref,
    status: row.status,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/* ------------------------------------------------------------------ */
/* Public create                                                       */
/* ------------------------------------------------------------------ */

bookingsRouter.post('/bookings', createLimiter, asyncHandler(async (req, res) => {
  const data = parsePayload(req.body);

  // Tenant resolution: explicit slug wins, then the subdomain the request came in on.
  const candidateSlug = data.slug || (req.tenantSalon ? req.tenantSalon.slug : '');
  let salon = null;
  if (candidateSlug) {
    try {
      salon = findLiveSalon(candidateSlug);
    } catch (err) {
      console.error('[bookings] salon lookup failed', err.message);
      salon = null;
    }
    if (!salon) {
      throw new HttpError(404, 'This salon is not accepting online bookings right now.');
    }
  }

  // Sanity-check that the requested time falls inside the salon's opening hours.
  if (salon) {
    try {
      const { getLiveContent } = await import('../workflow.js');
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

  const reference = data.reference || makeReference(salon ? 'SALON' : 'HOME');
  const ts = nowIso();
  const id = newId();

  const conflicts = salon ? conflictingCount(salon.id, data.date, data.time) : 0;

  db.prepare(
    `INSERT INTO bookings
       (id, salon_id, reference, full_name, phone, service, category, stylist, date, time,
        location_type, branch, address, locality, distance_km, bridal_trial, notes, promo_code,
        estimated_total, advance_paid, advance_ref, status, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'requested', 'public', ?, ?)`
  ).run(
    id,
    salon ? salon.id : null,
    reference,
    data.fullName,
    data.phone,
    data.service,
    data.category,
    data.stylist,
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
    data.estimatedTotal,
    data.advancePaid,
    data.advanceRef,
    ts,
    ts
  );

  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);

  audit(req, 'booking.created', 'booking', id, {
    salonId: salon?.id || null,
    date: data.date,
    time: data.time,
  });

  // Notify the owner (best-effort: mail failure must not fail the booking).
  if (salon) {
    try {
      const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(salon.owner_id);
      if (owner?.email) {
        await sendMail({
          to: owner.email,
          subject: `New booking ${reference} — ${salon.name}`,
          tag: 'booking-created',
          text: [
            `New appointment request for ${salon.name}.`,
            ``,
            `Reference : ${reference}`,
            `Client    : ${data.fullName} (${data.phone})`,
            `Service   : ${data.service}`,
            `When      : ${data.date} at ${data.time}`,
            `Mode      : ${data.locationType === 'home' ? `Home visit — ${data.address || data.locality || ''}` : `Salon — ${data.branch || ''}`}`,
            data.notes ? `Notes     : ${data.notes}` : null,
            data.promoCode ? `Voucher   : ${data.promoCode}` : null,
            ``,
            `Sign in to your dashboard to confirm or reschedule.`,
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
    warning:
      conflicts >= 2
        ? 'This slot is in high demand — we will call you to confirm or offer the nearest alternative.'
        : null,
  });
}));

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

/** Confirms / declines / completes / cancels one booking (tenant-scoped). */
ownerBookingsRouter.patch('/:bookingId', (req, res) => {
  const salon = req.salon;
  if (!salon) return res.status(409).json({ error: 'Complete salon onboarding first.' });
  const row = db.prepare('SELECT * FROM bookings WHERE id = ?').get(req.params.bookingId);
  if (!row || row.salon_id !== salon.id) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  const status = str(req.body?.status, { max: 20, field: 'Status', required: true });
  const allowed = ['requested', 'confirmed', 'declined', 'completed', 'cancelled'];
  if (!allowed.includes(status)) throw new ValidationError('Invalid booking status');

  db.prepare('UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?').run(status, nowIso(), row.id);
  audit(req, 'booking.status_changed', 'booking', row.id, { from: row.status, to: status });
  return res.json({ booking: serializeBooking(db.prepare('SELECT * FROM bookings WHERE id = ?').get(row.id)) });
});

export default bookingsRouter;
