/**
 * Unit tests for the Supabase store helpers (pure: no network, no database).
 * Run with: npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { toRemote, toLocal, toInet } from '../store/rowMap.js';
import { sb } from '../store/supabaseAdmin.js';
import { backendIsSupabase } from '../store/config.js';

test('salon: booleans and *_json columns convert to Postgres types', () => {
  const remote = toRemote('salons', {
    id: 'a', website_published: 1, suspended: 0, onboarding_completed: 1,
    gallery_json: '["x.jpg"]', theme_json: '{"c":1}', timings_json: '[]',
  });
  assert.equal(remote.website_published, true);
  assert.equal(remote.suspended, false);
  assert.deepEqual(remote.gallery, ['x.jpg']);
  assert.deepEqual(remote.theme, { c: 1 });
  assert.equal('gallery_json' in remote, false);
});

test('salon: invalid or null JSON falls back to a non-null empty value', () => {
  const remote = toRemote('salons', { gallery_json: 'oops', theme_json: null, timings_json: undefined });
  assert.deepEqual(remote.gallery, []);
  assert.deepEqual(remote.theme, {});
  assert.deepEqual(remote.timings, []);
});

test('salon: round trip returns the SQLite shape', () => {
  const local = toLocal('salons', { id: 'a', website_published: true, suspended: false, gallery: ['x'], theme: {}, timings: [] });
  assert.equal(local.website_published, 1);
  assert.equal(local.suspended, 0);
  assert.equal(local.gallery_json, '["x"]');
  assert.equal('gallery' in local, false);
});

test('staff specialties and booking_enabled', () => {
  const remote = toRemote('staff', { active: 1, booking_enabled: 0, specialties_json: '["bridal"]' });
  assert.deepEqual(remote.specialties, ['bridal']);
  assert.equal(remote.booking_enabled, false);
  assert.equal(toLocal('staff', { active: true, booking_enabled: false, specialties: ['a'] }).specialties_json, '["a"]');
});

test('bookings: date/time are written to both remote columns and read back', () => {
  const remote = toRemote('bookings', { date: '2026-12-01', time: '10:00', bridal_trial: 1 });
  assert.equal(remote.booking_date, '2026-12-01');
  assert.equal(remote.date, '2026-12-01');
  assert.equal(remote.booking_time, '10:00');
  assert.equal(remote.bridal_trial, true);
  const local = toLocal('bookings', { booking_date: '2026-12-02', date: '2026-12-01', booking_time: '11:00', time: '10:00', bridal_trial: false });
  assert.equal(local.date, '2026-12-02');
  assert.equal(local.time, '11:00');
  assert.equal('booking_date' in local, false);
});

test('loyalty transaction type is written to both columns', () => {
  const remote = toRemote('loyalty_transactions', { type: 'earn' });
  assert.equal(remote.transaction_type, 'earn');
  assert.equal(remote.type, 'earn');
  assert.equal(toLocal('loyalty_transactions', { transaction_type: 'redeem', type: null }).type, 'redeem');
});

test('audit log: meta becomes jsonb, ip must be a valid inet or null', () => {
  const remote = toRemote('audit_logs', { meta: '{"a":1}', ip: '::ffff:10.0.0.1' });
  assert.deepEqual(remote.metadata, { a: 1 });
  assert.deepEqual(remote.meta, { a: 1 });
  assert.equal(remote.ip, '10.0.0.1');
  assert.equal(toRemote('audit_logs', { meta: null, ip: 'unknown' }).ip, null);
  assert.equal(toRemote('audit_logs', { meta: null }).metadata, null);
});

test('toInet accepts ipv4/ipv6 and rejects junk', () => {
  assert.equal(toInet('203.0.113.5'), '203.0.113.5');
  assert.equal(toInet('2001:db8::1'), '2001:db8::1');
  assert.equal(toInet('not-an-ip'), null);
  assert.equal(toInet(undefined), null);
});

test('platform_settings value is jsonb remotely and text locally', () => {
  assert.equal(toRemote('platform_settings', { key: 'trialDays', value: '14' }).value, 14);
  assert.equal(toLocal('platform_settings', { key: 'trialDays', value: 14 }).value, '14');
});

test('backend flag requires both selection and configuration', () => {
  const saved = { ...process.env };
  try {
    delete process.env.DATA_BACKEND; process.env.SUPABASE_URL = 'https://x.supabase.co'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
    assert.equal(backendIsSupabase(), false);
    process.env.DATA_BACKEND = 'supabase';
    assert.equal(backendIsSupabase(), true);
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    assert.equal(backendIsSupabase(), false);
  } finally {
    process.env = saved;
  }
});

test('client builds PostgREST queries and surfaces errors without leaking the key', async () => {
  const saved = { ...process.env };
  const realFetch = globalThis.fetch;
  process.env.SUPABASE_URL = 'https://x.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'secret-key';
  let seen;
  globalThis.fetch = async (url, init) => {
    seen = { url, init };
    return new Response(JSON.stringify([{ id: 1 }]), { status: 200 });
  };
  try {
    const rows = await sb.select('services', { filters: { salon_id: 'abc', active: true }, order: 'sort_order.asc' });
    assert.deepEqual(rows, [{ id: 1 }]);
    assert.match(seen.url, /\/rest\/v1\/services\?salon_id=eq\.abc&active=eq\.true&order=sort_order\.asc$/);
    globalThis.fetch = async () => new Response(JSON.stringify({ message: 'boom' }), { status: 400 });
    await assert.rejects(() => sb.insert('services', [{}]), (e) => e.status === 400 && !String(e.message).includes('secret-key'));
  } finally {
    globalThis.fetch = realFetch;
    process.env = saved;
  }
});
