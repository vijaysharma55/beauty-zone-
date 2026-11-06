import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { listLiveSalonSlugs } from '../sitemap.js';
import { createSitemap, fetchSalonSlugs, getSalonSlugs } from '../../scripts/sitemap.mjs';

test('only public, approved salon profiles are included in the generated sitemap', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'sitemap-test-'));
  const file = path.join(dir, 'test.db');
  const db = new DatabaseSync(file);
  try {
    db.exec(`CREATE TABLE salons (id TEXT PRIMARY KEY, slug TEXT, website_published INTEGER, suspended INTEGER, status TEXT);
             CREATE TABLE salon_versions (salon_id TEXT, status TEXT);`);
    const salon = db.prepare('INSERT INTO salons VALUES (?, ?, ?, ?, ?)');
    const version = db.prepare('INSERT INTO salon_versions VALUES (?, ?)');
    for (let i = 0; i < 105; i++) {
      salon.run(`id${i}`, `studio-${String(i).padStart(3, '0')}`, 1, 0, i === 1 ? 'pending' : 'approved');
      version.run(`id${i}`, 'approved');
    }
    for (const [id, published, suspended, status, approved] of [
      ['draft', 0, 0, 'approved', true], ['suspended', 1, 1, 'approved', true],
      ['rejected', 1, 0, 'rejected', true], ['changes', 1, 0, 'changes_requested', true],
      ['unapproved', 1, 0, 'pending', false],
    ]) {
      salon.run(id, id, published, suspended, status);
      if (approved) version.run(id, 'approved');
    }
    version.run('id0', 'approved'); // Multiple approved snapshots must not duplicate a URL.
    const slugs = listLiveSalonSlugs(db);
    assert.equal(slugs.length, 105);
    assert.equal(listLiveSalonSlugs(db, { limit: 10, offset: 100 }).length, 5);
    assert.deepEqual(await getSalonSlugs('https://example.com', { DATABASE_PATH: file }), slugs);
    const xml = createSitemap('https://example.com', {
      home: '/',
      login: '/login',
      register: '/register',
      forgotPassword: '/forgot-password',
      resetPassword: '/reset-password',
      verifyEmail: '/verify-email',
      salons: '/salons',
    }, slugs);
    assert.equal((xml.match(/<loc>/g) || []).length, 107);
    for (const privateRoute of ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']) {
      assert.doesNotMatch(xml, new RegExp(privateRoute.replaceAll('/', '\\/')));
    }
    assert.match(xml, /<loc>https:\/\/example.com\/salon\/studio-104<\/loc>/);
    assert.doesNotMatch(xml, /\/salon\/(draft|suspended|rejected|changes|unapproved)</);
    assert.equal((xml.match(/\/salon\/studio-000</g) || []).length, 1);
  } finally { db.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('fetches every paginated API page and rejects incomplete feeds', async () => {
  const slugs = Array.from({ length: 205 }, (_, i) => `salon-${i}`);
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const offset = Number(url.searchParams.get('offset'));
    res.setHeader('Content-Type', 'application/json');
    if (url.pathname === '/bad') return res.end(JSON.stringify({ slugs: ['one'], nextOffset: offset }));
    res.end(JSON.stringify({ slugs: slugs.slice(offset, offset + 100), nextOffset: offset + 100 < slugs.length ? offset + 100 : null }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    assert.deepEqual(await fetchSalonSlugs(`${base}/feed`), slugs);
    await assert.rejects(fetchSalonSlugs(`${base}/bad`), /Invalid sitemap pagination/);
    assert.equal((await getSalonSlugs('https://example.com', { SITEMAP_SALONS_API_URL: `${base}/feed` })).length, 205);
    assert.match(createSitemap('https://example.com', { home: '/' }, ['salon & spa']), /salon%20%26%20spa/);
  } finally { server.close(); }
});

test('first Vercel deployment uses the old directory only if it is not capped', async () => {
  let full = false;
  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/public/sitemap-salons')) { res.statusCode = 404; return res.end(); }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ salons: Array.from({ length: full ? 60 : 2 }, (_, i) => ({ slug: `legacy-${i}` })) }));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const origin = `http://127.0.0.1:${server.address().port}`;
    assert.deepEqual(await getSalonSlugs(origin, { VERCEL: '1' }), ['legacy-0', 'legacy-1']);
    full = true;
    await assert.rejects(getSalonSlugs(origin, { VERCEL: '1' }), /may be truncated/);
  } finally { server.close(); }
});
