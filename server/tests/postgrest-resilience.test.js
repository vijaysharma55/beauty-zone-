/**
 * PostgREST schema resilience: missing optional columns must degrade to a
 * smaller select with safe defaults, never a 409/500.
 */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import {
  isSchemaMismatch, selectWithFallback, withSelect, SCHEMA_ERROR_CODES,
} from '../postgrest.js';
import { isSchemaColumnError, withSchemaFallback } from '../../src/lib/postgrestFallback.js';

let mock;
let mockPort;
let store;

const IDENTITY = {
  id: '30000000-0000-4000-8000-000000000001',
  email: 'ops.admin@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email' },
  user_metadata: { name: 'Ops Admin' },
};

before(async () => {
  mock = createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${mockPort}`);
    const select = url.searchParams.get('select') || '';
    res.setHeader('Content-Type', 'application/json');

    if (url.pathname === '/auth/v1/user') {
      res.writeHead(200); res.end(JSON.stringify(IDENTITY)); return;
    }
    if (url.pathname === '/rest/v1/profiles') {
      // Simulate a deployed project that predates `email_verified`.
      if (select.includes('email_verified')) {
        res.writeHead(400);
        res.end(JSON.stringify({ code: '42703', message: 'column profiles.email_verified does not exist' }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify([{ id: IDENTITY.id, email: IDENTITY.email, name: 'Ops Admin', role: 'admin', status: 'active', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }]));
      return;
    }
    if (url.pathname === '/rest/v1/services') {
      // Simulate a deployed project that predates `image_url`.
      if (select.includes('image_url') && select !== '*') {
        res.writeHead(400);
        res.end(JSON.stringify({ code: '42703', message: 'column services.image_url does not exist' }));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify([{
        id: 'svc-1', salon_id: 'salon-1', name: 'Bridal Makeup', category: 'bridal',
        description: 'Full luxury protocol', price_paise: 2499900,
        duration_minutes: 180, active: true, sort_order: 1,
        created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
      }]));
      return;
    }
    res.writeHead(404); res.end(JSON.stringify({ message: 'Unknown endpoint' }));
  });
  await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve));
  mockPort = mock.address().port;
  process.env.SUPABASE_URL = `http://127.0.0.1:${mockPort}`;
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  store = await import(`../supabase-store.js?schema=${Date.now()}`);
});

after(async () => {
  if (mock) await new Promise((resolve) => mock.close(() => resolve()));
});

test('schema errors are recognised by code and message, not by status alone', () => {
  assert.ok(SCHEMA_ERROR_CODES.has('42703'));
  assert.equal(isSchemaMismatch({ status: 400, code: '42703' }), true);
  assert.equal(isSchemaMismatch({ status: 400, message: 'column profiles.status does not exist' }), true);
  assert.equal(isSchemaMismatch({ status: 404, code: 'PGRST205' }), true);
  assert.equal(isSchemaMismatch({ status: 401, message: 'Unauthorized' }), false);
  assert.equal(isSchemaMismatch({ status: 500, message: 'Internal error' }), false);
  assert.equal(isSchemaColumnError({ status: 400, code: '42703' }), true);
  assert.equal(isSchemaColumnError({ status: 403, message: 'permission denied' }), false);
});

test('selectWithFallback retries with a smaller select and applies defaults', async () => {
  const seen = [];
  const result = await selectWithFallback(
    [
      { select: 'id,email,status,email_verified', defaults: { email_verified: false } },
      { select: 'id,email,status', defaults: { email_verified: false, status: 'active' } },
    ],
    async (select) => {
      seen.push(select);
      if (select.includes('email_verified')) {
        const error = new Error('column does not exist');
        error.status = 400; error.code = '42703';
        throw error;
      }
      return [{ id: 'x', email: 'a@b.com', status: 'active' }];
    }
  );
  assert.deepEqual(seen, ['id,email,status,email_verified', 'id,email,status']);
  assert.equal(result.degraded, true);
  assert.equal(result.rows[0].email_verified, false);
});

test('selectWithFallback propagates non-schema errors immediately', async () => {
  let attempts = 0;
  await assert.rejects(
    selectWithFallback([{ select: 'a' }, { select: 'b' }], async () => {
      attempts += 1;
      const error = new Error('JWT expired');
      error.status = 401;
      throw error;
    }),
    /JWT expired/
  );
  assert.equal(attempts, 1);
});

test('selectWithFallback returns a well-formed empty result when the table is absent', async () => {
  const result = await selectWithFallback([{ select: 'id,name' }], async () => {
    const error = new Error('relation public.new_table does not exist');
    error.status = 404; error.code = '42P01';
    throw error;
  }, { label: 'missing-table', onDegrade: () => {} });
  assert.deepEqual(result.rows, []);
  assert.equal(result.degraded, true);
  assert.equal(result.select, null);
});

test('client-side withSchemaFallback degrades then succeeds', async () => {
  const result = await withSchemaFallback(['full', 'reduced', 'minimal'], async (variant) => {
    if (variant !== 'minimal') {
      const error = new Error('could not find the column in the schema cache');
      error.status = 400; error.code = 'PGRST204';
      throw error;
    }
    return [{ id: 1 }];
  });
  assert.equal(result.variant, 'minimal');
  assert.equal(result.degraded, true);
  assert.deepEqual(result.value, [{ id: 1 }]);
});

test('withSelect encodes an explicit select list onto an existing query', () => {
  assert.equal(
    withSelect('/rest/v1/profiles?id=eq.1&limit=1', 'id,email,name'),
    '/rest/v1/profiles?id=eq.1&limit=1&select=id%2Cemail%2Cname'
  );
});

test('getSupabaseContext works on a schema missing email_verified', async () => {
  const req = { get: () => 'Bearer verified-test-token' };
  const ctx = await store.getSupabaseContext(req);
  assert.equal(ctx.role, 'admin');
  assert.equal(ctx.profile.status, 'active');
  assert.equal(ctx.profile.email_verified, false, 'safe default applied');
  assert.equal(ctx.emailVerified, true);
});

test('getServices works on a schema missing image_url / sort_order', async () => {
  const services = await store.getServices({ token: 'verified-test-token' }, 'salon-1');
  assert.equal(services.length, 1);
  assert.equal(services[0].name, 'Bridal Makeup');
  assert.equal(services[0].price, 24999);
  assert.equal(services[0].imageUrl, '', 'safe default applied');
  assert.equal(services[0].active, true);
});
