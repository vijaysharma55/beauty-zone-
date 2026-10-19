import { Router } from 'express';
import { db, findSalonBySlug, serializeSalon } from '../db.js';
import { getLiveContent, hasLiveApproval } from '../workflow.js';
import { rateLimit } from '../security.js';

export const publicRouter = Router();

const slugLimiter = rateLimit({ windowMs: 60_000, max: 60, key: 'slug-check' });

/**
 * Public websites are served from the latest **approved** snapshot.
 *
 * A salon is only reachable when it is published, approved and not suspended.
 * Pending, rejected and draft salons are indistinguishable from non-existent
 * ones, so unpublished work can never leak to visitors.
 */
export function findLiveSalon(slug) {
  const salon = findSalonBySlug(slug);
  if (!salon) return null;
  if (!salon.website_published) return null;
  if (!hasLiveApproval(salon)) return null;
  return salon;
}

function livePayload(salon) {
  const live = getLiveContent(salon);
  if (!live) return null;
  const base = serializeSalon(salon, { publicView: true });
  const content = live.salon || {};
  // Whitelist of public fields: review notes, suspension reasons and other
  // moderation metadata are never exposed to anonymous visitors.
  const merged = {
    id: salon.id,
    slug: salon.slug,
    name: content.name || base.name,
    tagline: content.tagline ?? base.tagline,
    description: content.description ?? base.description,
    logoUrl: content.logoUrl ?? base.logoUrl,
    coverImage: content.coverImage ?? base.coverImage,
    gallery: Array.isArray(content.gallery) ? content.gallery : base.gallery,
    phone: content.phone ?? base.phone,
    email: content.email ?? base.email,
    whatsapp: content.whatsapp ?? base.whatsapp,
    addressLine: content.addressLine ?? base.addressLine,
    city: content.city ?? base.city,
    state: content.state ?? base.state,
    postalCode: content.postalCode ?? base.postalCode,
    country: content.country ?? base.country,
    mapUrl: content.mapUrl ?? base.mapUrl,
    instagram: content.instagram ?? base.instagram,
    facebook: content.facebook ?? base.facebook,
    heroTitle: content.heroTitle ?? base.heroTitle,
    heroSubtitle: content.heroSubtitle ?? base.heroSubtitle,
    theme: content.theme && typeof content.theme === 'object' ? content.theme : base.theme,
    templateId: content.templateId || base.templateId,
    timings: Array.isArray(content.timings) ? content.timings : [],
    ownerName: content.ownerName || '',
    published: true,
    publishedAt: salon.published_at,
    approvedAt: salon.approved_at,
    websiteVersion: live.version?.version ?? null,
    updatedAt: live.version?.reviewedAt || salon.updated_at,
  };
  const services = (live.services || [])
    .filter((service) => service.active)
    .map((service) => ({
      id: service.id,
      salonId: salon.id,
      name: service.name,
      category: service.category,
      description: service.description,
      pricePaise: service.pricePaise,
      price: service.pricePaise / 100,
      durationMinutes: service.durationMinutes,
      active: true,
      sortOrder: service.sortOrder,
    }));
  const staff = (live.staff || [])
    .filter((member) => member.active)
    .map((member) => ({
      id: member.id,
      salonId: salon.id,
      name: member.name,
      roleTitle: member.roleTitle,
      bio: member.bio,
      photoUrl: member.photoUrl,
      specialties: Array.isArray(member.specialties) ? member.specialties : [],
      active: true,
      sortOrder: member.sortOrder,
    }));
  return { salon: merged, services, staff };
}

publicRouter.get(
  '/salons',
  rateLimit({ windowMs: 60_000, max: 120, key: 'public-list' }),
  (req, res) => {
    const rows = db
      .prepare(
        `SELECT s.* FROM salons s
         WHERE s.website_published = 1 AND s.suspended = 0
           AND s.status NOT IN ('rejected', 'changes_requested')
           AND EXISTS (SELECT 1 FROM salon_versions v WHERE v.salon_id = s.id AND v.status = 'approved')
         ORDER BY s.published_at DESC
         LIMIT 60`
      )
      .all();
    res.json({
      salons: rows.map((row) => {
        const base = serializeSalon(row, { publicView: true });
        let services = 0;
        try {
          const live = getLiveContent(row);
          services = (live?.services || []).filter((s) => s.active).length;
        } catch {
          services = 0;
        }
        return {
          id: row.id,
          name: base.name,
          slug: row.slug,
          tagline: base.tagline,
          city: base.city,
          state: base.state,
          logoUrl: base.logoUrl,
          coverImage: base.coverImage,
          templateId: base.templateId,
          serviceCount: services,
          url: `/salon/${row.slug}`,
        };
      }),
    });
  }
);

publicRouter.get(
  '/salons/:slug',
  rateLimit({ windowMs: 60_000, max: 120, key: 'public-site' }),
  (req, res) => {
    const salon = findLiveSalon(req.params.slug);
    if (!salon) return res.status(404).json({ error: 'This salon website is not available.' });
    const payload = livePayload(salon);
    if (!payload) return res.status(404).json({ error: 'This salon website is not available.' });
    return res.json(payload);
  }
);

/** Public "is this address free?" check used during onboarding. */
publicRouter.get('/slug-available', slugLimiter, (req, res) => {
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
  return res.json({
    available: !taken,
    reason: taken ? 'Already taken' : null,
    url: `/salon/${raw}`,
    suggestedSubdomain: `${raw}.beautyzone.app`,
  });
});

/** Approved-template catalogue for the customizer (no auth needed to read). */
publicRouter.get('/templates', (req, res) => {
  res.json({
    templates: [
      { id: 'luxe', name: 'Luxe Gold', description: 'Rich navy + gold editorial layout with image-led hero.', premium: false },
      { id: 'minimal', name: 'Minimal Ivory', description: 'Airy, typography-first layout for modern studios.', premium: false },
      { id: 'noir', name: 'Noir Studio', description: 'High-contrast dark hero with bold service cards.', premium: true },
      { id: 'blush', name: 'Blush Atelier', description: 'Soft rose palette with a gentle, romantic feel.', premium: false },
    ],
  });
});

/** Lightweight usage by tests / ops checks: never exposes draft content. */
export function isSalonLive(row) {
  if (!row) return false;
  return !!row.website_published && row.status === 'approved' && !row.suspended;
}
