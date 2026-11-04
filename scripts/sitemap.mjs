import { existsSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { listLiveSalonSlugs } from '../server/sitemap.js';

function validateSlugs(slugs) {
  if (!Array.isArray(slugs) || slugs.some(slug => typeof slug !== 'string' || !slug || slug === '.' || slug === '..' || slug.includes('/'))) {
    throw new Error('Invalid salon slug list from sitemap source');
  }
  return slugs;
}

async function fetchJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Sitemap source returned HTTP ${response.status}`);
  return response.json();
}

export async function fetchSalonSlugs(feedUrl) {
  const slugs = [];
  let offset = 0;
  while (true) {
    const url = new URL(feedUrl);
    url.searchParams.set('offset', String(offset));
    const page = await fetchJson(url);
    slugs.push(...validateSlugs(page.slugs));
    if (page.nextOffset === null) return slugs;
    if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset <= offset || !page.slugs.length) {
      throw new Error('Invalid sitemap pagination response');
    }
    offset = page.nextOffset;
  }
}

// For the first deployment, the existing directory endpoint is available but
// capped at 60. Refuse to guess if its response could have been truncated.
async function fetchLegacyDirectory(origin) {
  const page = await fetchJson(new URL('/api/public/salons', origin));
  if (!Array.isArray(page.salons) || page.salons.length >= 60) {
    throw new Error('The legacy salon directory may be truncated; deploy the paginated sitemap feed before using it as a source.');
  }
  return validateSlugs(page.salons.map(salon => salon.slug));
}

export async function getSalonSlugs(origin, env = process.env) {
  if (env.SITEMAP_SALONS_API_URL) return fetchSalonSlugs(env.SITEMAP_SALONS_API_URL);

  // Explicit SQLite configuration takes precedence, and is never silently
  // created or seeded during a build. The server uses these same settings.
  const explicitDb = env.DATABASE_PATH || (env.DATA_DIR && path.join(env.DATA_DIR, 'beautyzone.db'));
  if (explicitDb || !env.VERCEL) {
    const dbPath = explicitDb || path.resolve('data/beautyzone.db');
    if (!existsSync(dbPath)) {
      if (explicitDb) throw new Error(`Sitemap database not found: ${dbPath}`);
      console.warn('[sitemap] No local salon database found; dynamic profiles are omitted. Configure a sitemap source for deployment.');
      return [];
    }
    const db = new DatabaseSync(dbPath, { readOnly: true });
    try { return validateSlugs(listLiveSalonSlugs(db)); }
    finally { db.close(); }
  }

  // Vercel's SQLite file is ephemeral and is not the live server's database at
  // build time. Read the live API instead of creating an empty local database.
  try {
    return await fetchSalonSlugs(new URL('/api/public/sitemap-salons', origin));
  } catch (error) {
    // A not-yet-deployed feed normally returns 404 (or the SPA HTML shell).
    // Do not hide network failures or invalid paginated data.
    if (!/HTTP 404|Unexpected token|is not valid JSON/.test(String(error.message))) throw error;
    console.warn('[sitemap] Paginated feed not yet deployed; checking the legacy directory.');
    return fetchLegacyDirectory(origin);
  }
}

const xmlEscape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

export function createSitemap(origin, publicPaths, slugs) {
  const paths = new Set(Object.values(publicPaths));
  if (!paths.has('/')) throw new Error('Homepage route missing from sitemap');
  for (const slug of validateSlugs(slugs)) paths.add(`/salon/${encodeURIComponent(slug)}`);
  const urls = [...paths].sort().map(route => `  <url><loc>${xmlEscape(origin + route)}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
