/** Shared RBAC vocabulary, post-login redirects and loop protection. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  APPLICATION_ROLES, ADMIN_ROLES, APPROVAL_ROLES, STAFF_ROLES,
  normalizeRole, isAdminRole, isSuperAdminRole, isOwnerRole, isCustomerRole,
  canAccessAdminConsole, canReviewSalonWebsites, canAccessOwnerDashboard,
  canEditCatalog, roleHome, allowedRoutePrefixes,
} from '../../src/lib/roles.js';
import {
  homeForRole, homeForUser, homeForAuthUser, postLoginDestination,
} from '../../src/lib/authRoutes.js';
import {
  evaluateRedirect, noteRedirect, resetRedirectHistory, getRedirectHistory,
} from '../../src/lib/redirectGuard.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

test('the four application roles are the only accepted vocabulary', () => {
  assert.deepEqual([...APPLICATION_ROLES], ['super_admin', 'admin', 'salon_owner', 'customer']);
  assert.deepEqual([...ADMIN_ROLES], ['super_admin', 'admin']);
  assert.deepEqual([...STAFF_ROLES], ['super_admin', 'admin', 'salon_owner']);
  for (const role of APPLICATION_ROLES) assert.equal(normalizeRole(role), role);
});

test('legacy role spellings normalize; unknown values degrade to customer', () => {
  assert.equal(normalizeRole('super-admin'), 'super_admin');
  assert.equal(normalizeRole('SUPERADMIN'), 'super_admin');
  assert.equal(normalizeRole('administrator'), 'admin');
  assert.equal(normalizeRole('Owner'), 'salon_owner');
  assert.equal(normalizeRole('client'), 'customer');
  assert.equal(normalizeRole('root-of-all-evil'), 'customer');
  assert.equal(normalizeRole(null), 'customer');
  assert.equal(normalizeRole(undefined), 'customer');
});

test('only a super admin holds approval/publishing authority', () => {
  assert.deepEqual([...APPROVAL_ROLES], ['super_admin']);
  assert.equal(canReviewSalonWebsites('super_admin'), true);
  assert.equal(canReviewSalonWebsites('admin'), false, 'operational admins cannot approve salons');
  assert.equal(canReviewSalonWebsites('salon_owner'), false, 'owners can never self-approve');
  assert.equal(canReviewSalonWebsites('customer'), false);
  assert.equal(canReviewSalonWebsites(null), false);
  assert.equal(canReviewSalonWebsites('root-of-all-evil'), false);
  // Console access stays wider than approval authority.
  assert.equal(canAccessAdminConsole('admin'), true);
  assert.equal(canReviewSalonWebsites('admin'), false);
});

test('role helpers never grant admin from a customer or unknown role', () => {
  assert.ok(isSuperAdminRole('super_admin'));
  assert.equal(isSuperAdminRole('admin'), false);
  assert.ok(isAdminRole('admin') && isAdminRole('super_admin'));
  assert.equal(isAdminRole('customer'), false);
  assert.ok(isOwnerRole('salon_owner'));
  assert.ok(isCustomerRole('customer'));
  assert.ok(canAccessAdminConsole('admin'));
  assert.equal(canAccessAdminConsole('salon_owner'), false);
  assert.ok(canAccessOwnerDashboard('salon_owner'));
  assert.equal(canAccessOwnerDashboard('customer'), false);
  assert.ok(canEditCatalog('admin'));
  assert.equal(canEditCatalog('customer'), false);
});

test('every role has a safe, distinct home', () => {
  assert.equal(roleHome('super_admin'), '/admin');
  assert.equal(roleHome('admin'), '/admin');
  assert.equal(roleHome('salon_owner'), '/dashboard');
  assert.equal(roleHome('salon_owner', false), '/dashboard/onboarding');
  assert.equal(roleHome('customer'), '/my-appointments');
  assert.equal(homeForRole('admin'), '/admin');
  assert.equal(homeForUser({ user: { role: 'customer' }, salon: null }), '/my-appointments');
  assert.equal(homeForAuthUser({ role: 'salon_owner' }, false), '/dashboard/onboarding');
});

test('operational admins keep /admin deep links and land on /admin otherwise', () => {
  assert.equal(postLoginDestination('/admin/payments', 'admin'), '/admin/payments');
  assert.equal(postLoginDestination(undefined, 'admin'), '/admin');
  assert.equal(postLoginDestination('/dashboard/services', 'admin'), '/admin');
  assert.equal(allowedRoutePrefixes('admin').includes('/admin'), true);
});

test('customers are routed to their own home and cannot inherit admin links', () => {
  assert.equal(postLoginDestination('/admin/users', 'customer'), '/my-appointments');
  assert.equal(postLoginDestination('/dashboard', 'customer'), '/my-appointments');
  assert.equal(postLoginDestination('/salon/lumina-luxe', 'customer'), '/salon/lumina-luxe');
  assert.equal(postLoginDestination('/my-appointments', 'customer'), '/my-appointments');
});

test('salon owners stay on the dashboard and never inherit /admin', () => {
  assert.equal(postLoginDestination('/admin/users', 'salon_owner'), '/dashboard');
  assert.equal(postLoginDestination('/dashboard/bookings', 'salon_owner'), '/dashboard/bookings');
  assert.equal(postLoginDestination(undefined, 'salon_owner', false), '/dashboard/onboarding');
});

test('open redirects and auth pages are never used as post-login targets', () => {
  assert.equal(postLoginDestination('//evil.example', 'super_admin'), '/admin');
  assert.equal(postLoginDestination('https://evil.example', 'admin'), '/admin');
  assert.equal(postLoginDestination('/login', 'customer'), '/my-appointments');
  assert.equal(postLoginDestination('/admin\\evil', 'super_admin'), '/admin');
});

test('redirect guard blocks same-path and repeated redirects', () => {
  const now = 1_000;
  let history = [];
  let result = evaluateRedirect(history, '/dashboard', '/dashboard', now);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'SAME_PATH');
  history = result.history;
  result = evaluateRedirect(history, '/admin/users', '/login', now + 10);
  assert.equal(result.blocked, false);
  history = result.history;
  result = evaluateRedirect(history, '/admin/users', '/login', now + 20);
  assert.equal(result.blocked, false);
  history = result.history;
  result = evaluateRedirect(history, '/admin/users', '/login', now + 30);
  assert.equal(result.blocked, true);
  assert.equal(result.reason, 'REPEATED_REDIRECT');
});

test('redirect guard expires old events and can be reset', () => {
  resetRedirectHistory();
  assert.equal(noteRedirect('/a', '/b').blocked, false);
  assert.equal(noteRedirect('/a', '/b').blocked, false);
  assert.equal(noteRedirect('/a', '/b').blocked, true, 'third identical redirect must be blocked');
  resetRedirectHistory();
  assert.deepEqual(getRedirectHistory(), []);
  const expired = [{ from: '/x', to: '/y', at: 1 }];
  const result = evaluateRedirect(expired, '/m', '/n', 999_999);
  assert.equal(result.blocked, false);
  assert.equal(result.history.length, 1);
});

test('vercel.json routes every client path group to an HTML shell', () => {
  const config = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
  const sources = config.rewrites.map((rule) => rule.source);
  assert.ok(sources.includes('/api/(.*)'));
  assert.ok(sources.includes('/login'));
  assert.ok(sources.includes('/admin'));
  assert.ok(sources.includes('/dashboard'));
  assert.ok(sources.includes('/my-appointments'));
  assert.equal(config.cleanUrls, false);
  // The catch-all must exclude /api, /assets and any path with a file
  // extension, so a missing hashed chunk returns a real 404 rather than HTML.
  assert.equal(sources[0], '/api/(.*)');
  assert.ok(sources[sources.length - 1].includes('[^.]*'));

  const matches = (source, requestPath) => new RegExp(`^${source}$`).test(requestPath);
  const rewriteFor = (requestPath) => config.rewrites.find((rule) => matches(rule.source, requestPath));
  for (const route of [
    '/admin', '/admin/users', '/dashboard', '/dashboard/services',
    '/salon/lumina-luxe', '/salon/pearl-spa', '/my-appointments',
    '/receipt/abc123', '/login', '/unknown-page',
  ]) {
    const rule = rewriteFor(route);
    assert.ok(rule, `${route} matches no rewrite and would return HTTP 404`);
    assert.ok(rule.destination.endsWith('.html'), `${route} must reach an HTML shell`);
  }
  assert.equal(rewriteFor('/api/admin/users').destination, '/api');
  const noCache = config.headers.filter((rule) =>
    rule.headers.some((header) => header.key === 'Cache-Control' && header.value.includes('no-cache'))
  ).map((rule) => rule.source);
  assert.ok(noCache.includes('/spa.html'));
  assert.ok(noCache.includes('/index.html'));
});
