import { Router } from 'express';
import {
  db,
  findSalonBySlug,
  getServicesForSalon,
  getStaffForSalon,
  serializeSalon,
  serializeService,
  serializeStaff,
} from '../db.js';
import { rateLimit } from '../security.js';

export const publicRouter = Router();

const slugLimiter = rateLimit({ windowMs: 60_000, max: 60, key: 'slug-check' });

/** Published salons only. Unpublished salons are indistinguishable from
 *  non-existent ones for anonymous visitors, so drafts never leak. */
function findPublishedSalon(slug) {
  const salon = findSalonBySlug(slug);
  if (!salon || !salon.website_published) return null;
  return salon;
}

publicRouter.get(
  '/salons',
  rateLimit({ windowMs: 60_000, max: 120, key: 'public-list' }),
  (req, res) => {
    const rows = db
      .prepare(
        `SELECT s.*, (SELECT COUNT(*) FROM services sv WHERE sv.salon_id = s.id AND sv.active = 1) AS service_count
         FROM salons s
         WHERE s.website_published = 1
         ORDER BY s.published_at DESC
         LIMIT 60`
      )
      .all();
    res.json({
      salons: rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        tagline: row.tagline,
        city: row.city,
        state: row.state,
        logoUrl: row.logo_url,
        coverImage: row.cover_image,
        serviceCount: row.service_count,
        url: `/salon/${row.slug}`,
      })),
    });
  }
);

publicRouter.get(
  '/salons/:slug',
  rateLimit({ windowMs: 60_000, max: 120, key: 'public-site' }),
  (req, res) => {
    const salon = findPublishedSalon(req.params.slug);
    if (!salon) return res.status(404).json({ error: 'This salon website is not available.' });
    return res.json({
      salon: serializeSalon(salon, { publicView: true }),
      services: getServicesForSalon(salon.id, { onlyActive: true }).map(serializeService),
      staff: getStaffForSalon(salon.id, { onlyActive: true }).map(serializeStaff),
    });
  }
);

publicRouter.get(
  '/slug-available',
  slugLimiter,
  (req, res) => {
    const raw = String(req.query.slug || '')
      .toLowerCase()
      .trim();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$/.test(raw)) {
      return res.json({ available: false, reason: 'Use 3–60 letters, numbers or hyphens.' });
    }
    if (raw.includes('--')) {
      return res.json({ available: false, reason: 'Avoid consecutive hyphens.' });
    }
    const taken = findSalonBySlug(raw);
    return res.json({ available: !taken, reason: taken ? 'Already taken' : null });
  }
);
