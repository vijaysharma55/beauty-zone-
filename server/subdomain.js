/**
 * Subdomain + tenant resolution middleware for Vercel / production.
 *
 * Supported host patterns (all gracefully fall back to path-based routing):
 *   - slug.beautyzone.app        → tenant = slug
 *   - slug.beautyzone.vercel.app → tenant = slug (Vercel preview)
 *   - beautyzone.app             → no tenant (marketing site)
 *   - localhost / custom domain  → no tenant (or resolved via ?slug override)
 *
 * Tenant resolution:
 *   1. Extract subdomain slug from Host header (ignoring port).
 *   2. Look up salon slug in DB via findSalonBySlug.
 *   3. If found and live (published + approved), attach req.tenantSalon.
 *   4. If invalid/unassigned, attach req.tenantLookup = { slug, found: false }.
 *   5. Never crash: always call next() even on DB errors.
 *
 * Production notes:
 * - Vercel forwards Host correctly; we trust that header on Vercel.
 * - Wildcard DNS (*.beautyzone.app → Vercel) must be configured in the Vercel dashboard.
 * - Path-based /salon/:slug always works regardless of subdomain state.
 * - CSP frame-ancestors allows embedding the salon site in the preview iframe.
 */

import { findSalonBySlug } from './db.js';
import { hasLiveApproval } from './workflow.js';

// Domains that indicate "this is NOT a subdomain tenant but the root platform"
// Entries are checked as suffixes after stripping port.
const ROOT_DOMAINS = [
  'beautyzone.app',
  'beautyzone.vercel.app',
  'vercel.app',
  'localhost',
  '127.0.0.1',
];

// Reserved first labels that must NOT be treated as tenant slugs.
// These are platform routes that also appear as first path segment.
const RESERVED_SUBDOMAINS = new Set([
  'www',
  'api',
  'admin',
  'app',
  'dashboard',
  'login',
  'register',
  'auth',
  'assets',
  'static',
  'cdn',
  'mail',
  'staging',
  'preview',
]);

/**
 * Extract candidate tenant slug from Host header.
 * Returns null if host is root domain / IP / reserved.
 */
export function extractSubdomainSlug(hostHeader) {
  if (!hostHeader || typeof hostHeader !== 'string') return null;
  // Strip port
  const host = hostHeader.split(':')[0].toLowerCase().trim();
  if (!host) return null;

  // IP addresses are never tenants
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) || host === 'localhost') return null;
  if (host === '127.0.0.1' || host === '::1') return null;

  // No dot → no subdomain possible
  if (!host.includes('.')) return null;

  // On vercel preview, host is like beautyzone-xxx-username.vercel.app — treat as root
  // Only extract subdomain when host has multiple labels AND is on a known root suffix
  // Strategy: take first label, and check if the remainder is or ends with a known root
  const parts = host.split('.');
  if (parts.length < 3) return null; // need at least slug.root.tld

  const candidate = parts[0];
  if (!candidate || candidate.length < 2) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(candidate)) return null;
  if (RESERVED_SUBDOMAINS.has(candidate)) return null;

  // Verify that the suffix (remaining domain) is a known root domain
  const suffix = parts.slice(1).join('.');
  // Check preview infra domains — treat as platform root, no tenant
  if (suffix.endsWith('e2b.app')) return null;
  if (suffix.endsWith('onrender.com')) return null;
  if (suffix.endsWith('netlify.app')) return null;
  if (suffix.endsWith('run.app')) return null;
  if (suffix.endsWith('aistudio.google')) return null;
  if (suffix.endsWith('googleusercontent.com')) return null;
  if (suffix.endsWith('cloudshell.dev')) return null;
  if (suffix === 'vercel.app' || suffix === 'pages.dev' || suffix === 'github.io') return null;

  // Allow wildcard root pattern: any *.vercel.app → treat first label as tenant only if platform domain matches
  // For custom domains, allow any 3+ label host to be a subdomain of its parent
  // But only if the top 2 labels look like a real domain (not an IP)
  const isKnownRoot = ROOT_DOMAINS.some((root) => suffix === root || suffix.endsWith('.' + root));
  // For live production we also allow “custom-domain → tenant” (white-label)
  // So if host has exactly 3 parts we treat it as subdomain regardless (e.g., salon.example.com)
  // except for preview infra domains handled above
  if (!isKnownRoot && parts.length !== 3) return null;

  return candidate;
}

export function subdomainMiddleware(req, _res, next) {
  req.tenantSlug = null;
  req.tenantSalon = null;
  req.tenantLookup = null;
  try {
    const host = req.get('host') || req.headers.host || '';
    const slug = extractSubdomainSlug(host);
    if (!slug) return next();

    req.tenantSlug = slug;

    // Verify salon exists and is live; attach outcome for downstream use
    try {
      const salon = findSalonBySlug(slug);
      if (!salon) {
        req.tenantLookup = { slug, found: false, reason: 'not_found' };
        return next();
      }
      if (!salon.website_published) {
        req.tenantLookup = { slug, found: false, reason: 'not_published' };
        return next();
      }
      if (!hasLiveApproval(salon)) {
        req.tenantLookup = { slug, found: false, reason: 'not_approved' };
        return next();
      }
      // Found and live — attach full salon row
      req.tenantSalon = salon;
      req.tenantLookup = { slug, found: true, salonId: salon.id };
    } catch (dbErr) {
      // Never crash SSR on DB errors — just mark as unresolved
      console.error('[tenant] DB lookup failed for', slug, dbErr.message);
      req.tenantLookup = { slug, found: false, reason: 'lookup_error' };
    }
  } catch (err) {
    console.error('[tenant] subdomain middleware error', err.message);
  }
  return next();
}

/**
 * Helper for the /api/public/tenant route and client-side subdomain hint.
 */
export function tenantInfoFromReq(req) {
  if (req.tenantSalon) {
    return {
      mode: 'subdomain',
      slug: req.tenantSlug,
      salonId: req.tenantSalon.id,
      salonName: req.tenantSalon.name,
      found: true,
    };
  }
  if (req.tenantSlug) {
    return {
      mode: 'subdomain',
      slug: req.tenantSlug,
      found: false,
      reason: req.tenantLookup?.reason || 'unknown',
    };
  }
  return { mode: 'path', slug: null, found: false };
}
