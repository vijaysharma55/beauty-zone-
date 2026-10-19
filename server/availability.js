/**
 * Appointment slot generation.
 *
 * Pure, dependency-free logic shared by the public API and the unit tests.
 * Slots are derived from a salon's weekly opening hours (stored per approved
 * snapshot), the requested date, an optional service duration and a lead time.
 *
 * Everything is defensive: malformed dates, missing timings, closed days and
 * impossible durations all resolve to a well-formed (possibly empty) result
 * instead of throwing, so the booking UI always has something to render.
 */

const DAY_IDS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const DEFAULT_SLOT_MINUTES = 30;
export const DEFAULT_LEAD_MINUTES = 60;
export const MAX_SLOTS = 48;

/** Parse "HH:MM" → minutes since midnight. Returns null when invalid. */
export function toMinutes(value) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) return null;
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
}

/** Format minutes since midnight → "HH:MM". Clamps outside 0..1439. */
export function fromMinutes(total) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(total)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "14:30" → "02:30 PM" (12-hour display used by the booking UI). */
export function format12h(value) {
  const mins = toMinutes(value);
  if (mins === null) return value;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

/**
 * Resolve the weekday id for a YYYY-MM-DD string without timezone drift.
 * The date is anchored at UTC noon so it never rolls over.
 */
export function weekdayForDate(dateStr) {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return DAY_IDS[date.getUTCDay()];
}

/** Normalises a timings array (from DB JSON) into a day → entry map. */
export function indexTimings(timings) {
  const map = new Map();
  if (!Array.isArray(timings)) return map;
  for (const entry of timings) {
    if (!entry || typeof entry !== 'object') continue;
    const day = String(entry.day || '').toLowerCase();
    if (!DAY_IDS.includes(day) || map.has(day)) continue;
    const open = toMinutes(entry.open) === null ? 600 : toMinutes(entry.open);
    const close = toMinutes(entry.close) === null ? 1200 : toMinutes(entry.close);
    map.set(day, {
      day,
      open: fromMinutes(open),
      close: fromMinutes(close),
      closed: Boolean(entry.closed) || close <= open,
    });
  }
  return map;
}

/**
 * Generate booking slots for one date.
 *
 * @param {object} options
 * @param {string} options.date           YYYY-MM-DD (required)
 * @param {Array}  options.timings        weekly opening hours (optional)
 * @param {number} [options.durationMinutes] service length; last start is close - duration
 * @param {number} [options.slotMinutes]  grid size (default 30)
 * @param {number} [options.leadMinutes]  minimum notice for today (default 60)
 * @param {Date}   [options.now]          injectable clock for tests
 * @param {string} [options.timeZoneOffsetMinutes] local offset used for "today" comparison
 */
export function generateSlots({
  date,
  timings = [],
  durationMinutes = 60,
  slotMinutes = DEFAULT_SLOT_MINUTES,
  leadMinutes = DEFAULT_LEAD_MINUTES,
  now = new Date(),
  timeZoneOffsetMinutes = 0,
} = {}) {
  const day = weekdayForDate(date);
  if (!day) {
    return { date, day: null, slots: [], closed: false, reason: 'invalid_date' };
  }

  const byDay = indexTimings(timings);
  const entry = byDay.get(day);
  if (!entry) {
    return { date, day, slots: [], closed: false, reason: 'no_hours' };
  }
  if (entry.closed) {
    return { date, day, slots: [], closed: true, reason: 'closed' };
  }

  const open = toMinutes(entry.open);
  const close = toMinutes(entry.close);
  if (open === null || close === null || close <= open) {
    return { date, day, slots: [], closed: true, reason: 'invalid_hours' };
  }

  const grid = Number.isFinite(slotMinutes) && slotMinutes >= 5 ? Math.round(slotMinutes) : DEFAULT_SLOT_MINUTES;
  const window = close - open;
  const requested = Number.isFinite(durationMinutes) && durationMinutes > 0 ? Math.round(durationMinutes) : 60;
  // A service longer than the day's window is truncated to fit rather than
  // blocking booking entirely — the caller is told via `truncated`.
  const duration = Math.min(requested, window);
  const truncated = requested > window;

  // A booking must finish before closing time.
  const lastStart = close - duration;
  if (lastStart < open) {
    return { date, day, slots: [], closed: false, reason: 'service_too_long', open: entry.open, close: entry.close };
  }

  // "Now" expressed in the salon's local time so today's past slots can be hidden.
  const nowLocal = new Date(now.getTime() + (Number(timeZoneOffsetMinutes) || 0) * 60_000);
  const todayStr = `${nowLocal.getUTCFullYear()}-${String(nowLocal.getUTCMonth() + 1).padStart(2, '0')}-${String(
    nowLocal.getUTCDate()
  ).padStart(2, '0')}`;
  const isToday = date === todayStr;
  const nowMinutes = nowLocal.getUTCHours() * 60 + nowLocal.getUTCMinutes();
  const earliest = isToday ? nowMinutes + (Number.isFinite(leadMinutes) ? leadMinutes : DEFAULT_LEAD_MINUTES) : 0;

  const slots = [];
  for (let start = open; start <= lastStart && slots.length < MAX_SLOTS; start += grid) {
    if (start < earliest) continue;
    slots.push({
      value: fromMinutes(start),
      label: format12h(fromMinutes(start)),
      start: fromMinutes(start),
      end: fromMinutes(start + duration),
      available: true,
    });
  }

  return {
    date,
    day,
    open: entry.open,
    close: entry.close,
    closed: false,
    truncated,
    requestedDuration: requested,
    effectiveDuration: duration,
    slots,
    reason: slots.length === 0 ? (isToday ? 'no_slots_left_today' : 'fully_booked') : null,
  };
}

/** Fallback grid used when no salon timings are known (marketing showcase site). */
export const FALLBACK_TIMINGS = [
  { day: 'mon', open: '10:00', close: '20:00', closed: false },
  { day: 'tue', open: '10:00', close: '20:00', closed: false },
  { day: 'wed', open: '10:00', close: '20:00', closed: false },
  { day: 'thu', open: '10:00', close: '20:00', closed: false },
  { day: 'fri', open: '10:00', close: '21:00', closed: false },
  { day: 'sat', open: '09:00', close: '21:00', closed: false },
  { day: 'sun', open: '11:00', close: '18:00', closed: false },
];
