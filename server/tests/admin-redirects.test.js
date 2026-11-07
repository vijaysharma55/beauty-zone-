/** Regression coverage for the post-login redirect and route guards. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { homeForRole, homeForUser, homeForAuthUser, postLoginDestination } from '../../src/lib/authRoutes.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('a super admin always lands on /admin, an owner on their dashboard', () => {
  assert.equal(homeForRole('super_admin'), '/admin');
  assert.equal(homeForRole('super_admin', false), '/admin');
  assert.equal(homeForRole('salon_owner'), '/dashboard');
  assert.equal(homeForRole('salon_owner', false), '/dashboard/onboarding');
  assert.equal(homeForAuthUser({ role: 'super_admin' }), '/admin');
  assert.equal(homeForUser({ user: { role: 'super_admin' }, salon: null }), '/admin');
  assert.equal(homeForUser({ user: { role: 'salon_owner' }, salon: null }), '/dashboard/onboarding');
  assert.equal(homeForUser(null), '/');
});

test('a pre-login /admin deep link is preserved for a super admin', () => {
  assert.equal(postLoginDestination('/admin/users?status=active', 'super_admin'), '/admin/users?status=active');
  assert.equal(postLoginDestination('/admin', 'super_admin'), '/admin');
  assert.equal(postLoginDestination(undefined, 'super_admin'), '/admin');
  assert.equal(postLoginDestination('/dashboard/services', 'super_admin'), '/admin');
});

test('a salon owner can never inherit an admin destination', () => {
  assert.equal(postLoginDestination('/admin/users', 'salon_owner'), '/dashboard');
  assert.equal(postLoginDestination('/admin/users', 'salon_owner', false), '/dashboard/onboarding');
  assert.equal(postLoginDestination('/dashboard/bookings', 'salon_owner'), '/dashboard/bookings');
  assert.equal(postLoginDestination(undefined, 'salon_owner'), '/dashboard');
});

test('open redirects and auth pages are never used as post-login targets', () => {
  assert.equal(postLoginDestination('//evil.example', 'super_admin'), '/admin');
  assert.equal(postLoginDestination('https://evil.example', 'super_admin'), '/admin');
  assert.equal(postLoginDestination('/login', 'super_admin'), '/admin');
  assert.equal(postLoginDestination('/verify-email?x=1', 'salon_owner'), '/dashboard');
  assert.equal(postLoginDestination('/admin\\evil', 'super_admin'), '/admin');
});

test('vercel.json explicitly rewrites login and admin deep links to the SPA', () => {
  const config = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const sources = config.rewrites.map((rule) => rule.source);
  assert.ok(sources.includes('/login'));
  assert.ok(sources.includes('/admin'));
  assert.ok(sources.includes('/admin/(.*)'));
  assert.ok(config.rewrites.find((rule) => rule.source === '/login').destination === '/spa.html');
  // The old negative-lookahead catch-all was unreliable in Vercel's router;
  // /api/(.*) must stay ahead of the generic SPA fallback.
  assert.ok(sources.indexOf('/api/(.*)') < sources.indexOf('/(.*)'));
  assert.ok(!sources.some((source) => source.includes('(?!')));
});
