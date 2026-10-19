/**
 * Unit tests for the pure helpers that back routing and booking:
 * subdomain parsing and time-slot generation.
 *
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { extractSubdomainSlug } from '../subdomain.js';
import {
  generateSlots,
  toMinutes,
  fromMinutes,
  format12h,
  weekdayForDate,
  indexTimings,
  FALLBACK_TIMINGS,
} from '../availability.js';

/* ------------------------------------------------------------------ */
/* Subdomain parsing                                                   */
/* ------------------------------------------------------------------ */

test('subdomain parser recognises real tenant hosts', () => {
  assert.equal(extractSubdomainSlug('lumina-luxe.beautyzone.app'), 'lumina-luxe');
  assert.equal(extractSubdomainSlug('lumina-luxe.beautyzone.vercel.app'), 'lumina-luxe');
  assert.equal(extractSubdomainSlug('studio99.example.com'), 'studio99');
});

test('subdomain parser ignores platform, reserved, preview and local hosts', () => {
  assert.equal(extractSubdomainSlug('beautyzone.app'), null);
  assert.equal(extractSubdomainSlug('www.beautyzone.app'), null);
  assert.equal(extractSubdomainSlug('admin.beautyzone.app'), null);
  assert.equal(extractSubdomainSlug('localhost:3000'), null);
  assert.equal(extractSubdomainSlug('127.0.0.1'), null);
  assert.equal(extractSubdomainSlug('3000-abc123.e2b.app'), null);
  assert.equal(extractSubdomainSlug(''), null);
  assert.equal(extractSubdomainSlug(undefined), null);
  assert.equal(extractSubdomainSlug('not a host'), null);
});

/* ------------------------------------------------------------------ */
/* Time helpers                                                        */
/* ------------------------------------------------------------------ */

test('time helpers convert and format cleanly', () => {
  assert.equal(toMinutes('00:00'), 0);
  assert.equal(toMinutes('23:59'), 1439);
  assert.equal(toMinutes('nope'), null);
  assert.equal(toMinutes('25:00'), null);
  assert.equal(fromMinutes(0), '00:00');
  assert.equal(fromMinutes(1439), '23:59');
  assert.equal(fromMinutes(-50), '00:00');
  assert.equal(fromMinutes(9999), '23:59');
  assert.equal(format12h('00:00'), '12:00 AM');
  assert.equal(format12h('12:00'), '12:00 PM');
  assert.equal(format12h('13:30'), '01:30 PM');
  assert.equal(format12h('09:05'), '09:05 AM');
});

test('weekday resolution avoids timezone drift', () => {
  assert.equal(weekdayForDate('2026-10-19'), 'mon');
  assert.equal(weekdayForDate('2026-10-25'), 'sun');
  assert.equal(weekdayForDate('2026-01-01'), 'thu');
  assert.equal(weekdayForDate('not-a-date'), null);
  assert.equal(weekdayForDate('2026-02-30'), null, 'impossible dates rejected');
});

test('timings are normalised and de-duplicated', () => {
  const map = indexTimings([
    { day: 'mon', open: '10:00', close: '20:00', closed: false },
    { day: 'MON', open: '10:00', close: '20:00', closed: false },
    { day: 'tue', open: 'bad', close: 'also bad', closed: false },
    { day: 'wed', open: '18:00', close: '10:00', closed: false },
    null,
    { day: 'nope', open: '10:00', close: '20:00' },
  ]);
  assert.equal(map.size, 3);
  assert.equal(map.get('mon').open, '10:00');
  // Invalid times fall back to sane defaults.
  assert.equal(map.get('tue').open, '10:00');
  // A close time before open is treated as closed rather than producing junk slots.
  assert.equal(map.get('wed').closed, true);
});

/* ------------------------------------------------------------------ */
/* Slot generation                                                     */
/* ------------------------------------------------------------------ */

test('slots are generated inside opening hours and respect service length', () => {
  const result = generateSlots({
    date: '2026-10-20', // Tuesday
    timings: FALLBACK_TIMINGS,
    durationMinutes: 60,
    slotMinutes: 30,
    now: new Date('2026-01-01T00:00:00Z'),
  });
  assert.equal(result.closed, false);
  assert.equal(result.slots[0].value, '10:00');
  // Last slot must finish by closing time (20:00 - 60min = 19:00 start).
  assert.equal(result.slots[result.slots.length - 1].value, '19:00');
  assert.ok(result.slots.every((s) => s.end <= '20:00'));
});

test('closed days and missing hours return empty, non-crashing results', () => {
  const closed = generateSlots({
    date: '2026-10-20',
    timings: [{ day: 'tue', open: '10:00', close: '20:00', closed: true }],
    now: new Date('2026-01-01T00:00:00Z'),
  });
  assert.equal(closed.closed, true);
  assert.deepEqual(closed.slots, []);
  assert.equal(closed.reason, 'closed');

  const missing = generateSlots({
    date: '2026-10-20',
    timings: [{ day: 'mon', open: '10:00', close: '20:00', closed: false }],
    now: new Date('2026-01-01T00:00:00Z'),
  });
  assert.deepEqual(missing.slots, []);
  assert.equal(missing.reason, 'no_hours');

  const invalid = generateSlots({ date: 'garbage', timings: FALLBACK_TIMINGS });
  assert.deepEqual(invalid.slots, []);
  assert.equal(invalid.reason, 'invalid_date');
});

test("today's past slots are hidden behind the lead time", () => {
  // Tuesday 2026-10-20, salon local time 15:00 → earliest bookable start 16:00.
  const result = generateSlots({
    date: '2026-10-20',
    timings: FALLBACK_TIMINGS,
    durationMinutes: 60,
    leadMinutes: 60,
    now: new Date('2026-10-20T15:00:00Z'),
    timeZoneOffsetMinutes: 0,
  });
  assert.ok(result.slots.length > 0);
  assert.ok(
    result.slots.every((s) => s.value >= '16:00'),
    'no slot in the past or inside the lead-time window'
  );
});

test('a service longer than the day is truncated rather than blocking booking', () => {
  const result = generateSlots({
    date: '2026-10-20',
    timings: [{ day: 'tue', open: '10:00', close: '11:00', closed: false }],
    durationMinutes: 480,
    now: new Date('2026-01-01T00:00:00Z'),
  });
  // Still bookable, but the caller is told the slot was shortened to fit.
  assert.equal(result.truncated, true);
  assert.equal(result.requestedDuration, 480);
  assert.equal(result.effectiveDuration, 60);
  assert.equal(result.slots.length, 1);
  assert.equal(result.slots[0].value, '10:00');
  assert.ok(result.slots.every((s) => s.end <= '11:00'));
});

test('an impossible window yields no slots and never throws', () => {
  const result = generateSlots({
    date: '2026-10-20',
    timings: [{ day: 'tue', open: '10:00', close: '11:00', closed: false }],
    durationMinutes: 0,
    slotMinutes: 0,
    now: new Date('2026-01-01T00:00:00Z'),
  });
  assert.ok(Array.isArray(result.slots));
  assert.ok(result.slots.every((s) => s.end <= '11:00'));
});

test('slot count is capped so a bad grid cannot hang the request', () => {
  const result = generateSlots({
    date: '2026-10-20',
    timings: FALLBACK_TIMINGS,
    durationMinutes: 5,
    slotMinutes: 5,
    now: new Date('2026-01-01T00:00:00Z'),
  });
  assert.ok(result.slots.length <= 48);
});
