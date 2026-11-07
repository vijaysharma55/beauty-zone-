import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const config = JSON.parse(readFileSync(path.join(ROOT, 'vercel.json'), 'utf8'));
const DIST = path.join(ROOT, 'dist');

// Every client-side route React Router owns. A direct request (hard refresh,
// bookmark, shared link) for any of these must reach an HTML shell, not a 404.
const DEEP_LINKS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/salons',
  '/salon/lumina-luxe',
  '/nexora-salonos',
  '/my-appointments',
  '/dashboard',
  '/dashboard/onboarding',
  '/dashboard/website',
  '/dashboard/services',
  '/dashboard/staff',
  '/dashboard/approval',
  '/dashboard/preview',
  '/dashboard/bookings',
  '/dashboard/analytics',
  '/dashboard/billing',
  '/dashboard/account',
  '/admin',
  '/admin/users',
  '/admin/approvals',
  '/admin/salons',
  '/admin/subscriptions',
  '/admin/settings',
  '/unknown-page',
];

// Static files Vercel serves from the build output before rewrites are applied.
const STATIC_FILES = ['/favicon.png', '/robots.txt', '/sitemap.xml', '/index.html', '/spa.html'];

/** Vercel compiles each `source` to a regex anchored at both ends. */
function matches(source, requestPath) {
  return new RegExp(`^${source}$`).test(requestPath);
}

/** First matching rewrite wins; rewrites run only after the filesystem check. */
function rewriteFor(requestPath) {
  return config.rewrites.find((rule) => matches(rule.source, requestPath)) || null;
}

test('vercel.json declares an explicit, file-backed SPA fallback', () => {
  assert.equal(config.outputDirectory, 'dist');
  // cleanUrls rewrote `/spa.html` to the extensionless `/spa`, so the catch-all
  // destination resolved to nothing and every deep link fell through to a 404.
  assert.equal(config.cleanUrls, false);
  for (const rule of config.rewrites) {
    if (rule.destination.startsWith('/api')) continue;
    assert.ok(
      rule.destination.endsWith('.html'),
      `rewrite destination "${rule.destination}" must name a real file emitted into dist/`
    );
  }
});

test('the site root serves the prerendered homepage shell', () => {
  assert.equal(rewriteFor('/').destination, '/index.html');
});

test('every client-side route falls back to the SPA shell instead of 404', () => {
  for (const route of DEEP_LINKS) {
    const rule = rewriteFor(route);
    assert.ok(rule, `${route} matches no rewrite and would return HTTP 404`);
    assert.equal(rule.destination, '/spa.html', `${route} must fall back to the SPA shell`);
  }
});

test('API requests reach the Express function and keep their own 404 handling', () => {
  for (const route of ['/api/health', '/api/public/salons', '/api/auth/session', '/api/uploads/x.png']) {
    assert.equal(rewriteFor(route).destination, '/api', `${route} must be handled by api/index.js`);
  }
  // The SPA catch-all must never swallow an unknown API path into HTML.
  assert.notEqual(rewriteFor('/api/does-not-exist').destination, '/spa.html');
});

test('static assets are not shadowed by the SPA catch-all', () => {
  for (const asset of ['/assets/index-abc123.js', '/images/hero.jpg', ...STATIC_FILES]) {
    const rule = rewriteFor(asset);
    // Rewrites run after the filesystem check, so a real file always wins; the
    // rule below only applies to assets that are genuinely missing.
    assert.ok(rule === null || rule.destination.endsWith('.html'));
  }
  const assetHeaders = config.headers.find((entry) => entry.source === '/assets/(.*)');
  assert.ok(assetHeaders, 'hashed asset caching headers must survive the routing fix');
});

test('the build emits both HTML shells the rewrites point at', { skip: !existsSync(DIST) && 'dist/ not built' }, () => {
  for (const rule of config.rewrites) {
    if (!rule.destination.endsWith('.html')) continue;
    assert.ok(
      existsSync(path.join(DIST, rule.destination)),
      `dist${rule.destination} is missing; "npm run build" must emit it`
    );
  }
});

test('the prerender step keeps writing the plain SPA shell', () => {
  const prerender = readFileSync(path.join(ROOT, 'scripts/prerender.mjs'), 'utf8');
  assert.match(prerender, /dist\/spa\.html/);
});
