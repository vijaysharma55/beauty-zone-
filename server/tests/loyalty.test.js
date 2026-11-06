import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeLoyaltyPhone,
  calculateLoyaltyPoints,
  calculateLoyaltyTierFromLifetime,
  verifyCustomerLoyaltyVoucher,
  consumeCustomerLoyaltyVoucher,
  creditLoyaltyPointsForCompletedBooking,
} from '../routes/loyalty.js';

test('normalizes Indian mobile numbers without accepting partial or malformed numbers', () => {
  assert.equal(normalizeLoyaltyPhone('9829011223'), '9829011223');
  assert.equal(normalizeLoyaltyPhone('+91 98290-11223'), '9829011223');
  assert.equal(normalizeLoyaltyPhone('0091 9829011223'), null);
  assert.equal(normalizeLoyaltyPhone('98290112'), null);
  assert.equal(normalizeLoyaltyPhone('not a number'), null);
});

test('calculates points using the minimum award and member multiplier', () => {
  assert.equal(calculateLoyaltyPoints(5800, 'silver'), 580);
  assert.equal(calculateLoyaltyPoints(5800, 'gold'), 725);
  assert.equal(calculateLoyaltyPoints(5800, 'platinum'), 870);
  assert.equal(calculateLoyaltyPoints(500, 'silver'), 100);
  assert.equal(calculateLoyaltyPoints(0, 'silver'), 0);
  assert.equal(calculateLoyaltyPoints(-100, 'gold'), 0);
  assert.equal(calculateLoyaltyPoints(Number.NaN, 'platinum'), 0);
});

test('tier is derived from lifetime points and does not fall after redemption', () => {
  assert.equal(calculateLoyaltyTierFromLifetime(499), 'silver');
  assert.equal(calculateLoyaltyTierFromLifetime(500), 'gold');
  assert.equal(calculateLoyaltyTierFromLifetime(1499), 'gold');
  assert.equal(calculateLoyaltyTierFromLifetime(1500), 'platinum');
  assert.equal(calculateLoyaltyTierFromLifetime(0), 'silver');
});

test('voucher verification requires a Supabase bearer session before making a request', async () => {
  const originalFetch = globalThis.fetch;
  let requested = false;
  globalThis.fetch = async () => {
    requested = true;
    return new Response(JSON.stringify({
      valid: true,
      voucher: { code: 'VIP-500-1223-ABCD', title: 'Voucher', discountAmount: 500 },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    await assert.rejects(
      verifyCustomerLoyaltyVoucher('VIP-500-1223-ABCD', ''),
      /Supabase sign-in session/
    );
    assert.equal(requested, false);

    const voucher = await verifyCustomerLoyaltyVoucher('vip-500-1223-abcd', 'Bearer customer-jwt');
    assert.equal(voucher.code, 'VIP-500-1223-ABCD');
    assert.equal(requested, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('completed-booking awards use the server secret and pass final bill and actor identity', async () => {
  const originalFetch = globalThis.fetch;
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SECRET_KEY = 'server-only-test-secret';
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  let captured = null;
  globalThis.fetch = async (_url, options) => {
    captured = options;
    return new Response(JSON.stringify({
      awarded: true, pointsEarned: 580, totalPoints: 680, lifetimePoints: 680, tier: 'gold',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  try {
    const result = await creditLoyaltyPointsForCompletedBooking({
      id: 'booking-123',
      phone: '+91 98290 11223',
      full_name: 'Test Customer',
      service: 'Hair Spa',
      estimated_total: 5800,
    }, '00000000-0000-4000-8000-000000000001');
    assert.equal(result.pointsEarned, 580);
    assert.equal(captured.headers.apikey, 'server-only-test-secret');
    assert.equal(captured.headers.Authorization, 'Bearer server-only-test-secret');
    const body = JSON.parse(captured.body);
    assert.equal(body.p_actor_id, '00000000-0000-4000-8000-000000000001');
    assert.equal(body.p_phone, '9829011223');
    assert.equal(body.p_bill_amount, 5800);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalSecret === undefined) delete process.env.SUPABASE_SECRET_KEY;
    else process.env.SUPABASE_SECRET_KEY = originalSecret;
    if (originalLegacy === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalLegacy;
  }
});

test('missing server secret fails closed for completed-booking awards', async () => {
  const originalSecret = process.env.SUPABASE_SECRET_KEY;
  const originalLegacy = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    await assert.rejects(
      creditLoyaltyPointsForCompletedBooking({
        id: 'booking-123', phone: '9829011223', estimated_total: 1000,
      }, '00000000-0000-4000-8000-000000000001'),
      /SUPABASE_SECRET_KEY/
    );
  } finally {
    if (originalSecret !== undefined) process.env.SUPABASE_SECRET_KEY = originalSecret;
    if (originalLegacy !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = originalLegacy;
  }
});

test('voucher consumption sends booking ownership and eligibility context to Postgres', async () => {
  const originalFetch = globalThis.fetch;
  let captured = null;
  globalThis.fetch = async (_url, options) => {
    captured = options;
    return new Response(JSON.stringify({ success: true, discountAmount: 500 }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };
  try {
    const result = await consumeCustomerLoyaltyVoucher(
      'vip-500-1223-abcd',
      'salon-1:booking-1',
      'Bearer customer-jwt',
      {
        phone: '+91 98290 11223',
        serviceTitle: 'Hair Spa',
        locationType: 'salon',
        billAmount: 2500,
      }
    );
    assert.equal(result.discountAmount, 500);
    const body = JSON.parse(captured.body);
    assert.equal(body.p_code, 'VIP-500-1223-ABCD');
    assert.equal(body.p_external_booking_id, 'salon-1:booking-1');
    assert.equal(body.p_booking_phone, '9829011223');
    assert.equal(body.p_service_title, 'Hair Spa');
    assert.equal(body.p_location_type, 'salon');
    assert.equal(body.p_bill_amount, 2500);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('migration protects balance writes, award RPC and all six catalogue costs', async () => {
  const migration = await readFile(
    new URL('../../supabase/migrations/20261106_beautyzone_secure_customer_rewards.sql', import.meta.url),
    'utf8'
  );
  assert.match(migration, /phone_confirmed_at is not null/i);
  assert.match(migration, /revoke insert, update, delete on table public\.loyalty_accounts/i);
  assert.match(migration, /grant execute on function public\.award_completed_loyalty_points\(uuid,text,text,text,text,bigint\) to service_role/i);
  assert.doesNotMatch(migration, /grant execute on function public\.award_completed_loyalty_points[^;]*to authenticated/i);
  for (const [id, points] of [['rew-1',500],['rew-2',750],['rew-3',1000],['rew-4',650],['rew-5',1500],['rew-6',400]]) {
    assert.match(migration, new RegExp("'" + id + "'[^\\n]*," + points + ","));
  }
  assert.match(migration, /redeem_request_id uuid/i);
  assert.match(migration, /minimum_bill_amount bigint/i);
  assert.match(migration, /eligible_service_keyword text/i);
  assert.match(migration, /eligible_location_type text/i);
  assert.match(migration, /validate_customer_loyalty_voucher/i);
  assert.match(migration, /p_booking_phone text/i);
  assert.match(migration, /This reward requires a minimum eligible bill/i);
  assert.match(migration, /This voucher can only be used for an eligible/i);
  assert.match(migration, /This voucher is valid only for an eligible doorstep home booking/i);
  assert.match(migration, /revoke all on function private\.redeem_customer_loyalty_reward/i);
  assert.match(migration, /loyalty_vouchers_redeem_request_uidx/i);
  assert.match(migration, /source_booking_id\) where source_booking_id is not null and transaction_type = 'earn'/i);
});
