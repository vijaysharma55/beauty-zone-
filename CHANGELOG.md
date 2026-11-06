# BeautyZone — Audit Changelog

## PR 1 — Vercel deep-link routing fix (2026-11-06)

Fixes the P1 deployment blocker recorded in AUDIT-REPORT.md, GAP-ANALYSIS.md, BUG-FIX-REPORT.md and
TEST-REPORT.md: direct requests to `/login`, `/register`, `/salons`, `/salon/lumina-luxe`,
`/dashboard` and `/my-appointments` returned HTTP 404 in production and preview.

- **Root cause**: the catch-all rewrite pointed at the extensionless destinations `/spa` and
  `/index`. No such files exist in the build output (`dist/spa.html` and `dist/index.html` do), so
  the rewrite resolved to nothing and the request fell through to Vercel's 404. `/` and `/spa.html`
  kept returning 200 because they are served by the filesystem phase before rewrites run.
- `vercel.json` rewrite destinations now name real emitted files (`/index.html`, `/spa.html`).
- `cleanUrls` is disabled; it exposed the shells only at extensionless aliases and was the reason the
  previous destinations looked valid.
- The SPA catch-all excludes `/api/`, so unknown API paths keep returning the Express JSON 404
  instead of being rewritten into an HTML shell.
- Added `server/tests/vercel-routing.test.js` (wired into `npm test`): asserts every React Router
  route resolves to an HTML shell, that no rewrite destination is extensionless and that the build
  emits both shells.
- Added `scripts/verify-routes.sh` (`npm run verify:routes <url>`) for post-deployment checks.

---

Date: 2026-11-06  
Working branch: audit/beautyzone-production-hardening  
Base: main at 1e7348f858edab617fcd5954d34a40b5fb50c63d  
Review: PR #27 (draft, not merged)

## Changes on this branch

### Authentication and authorization
- Production/Vercel login rejects default/configured demo admin and owner identities plus generated synthetic salon-owner seed identities.
- Demo user auto-provisioning and demo password bypass are limited to non-production environments.
- Supabase profile role is now the only authorization source when bridging a Supabase session to the legacy Express session.
- Supabase bridge checks email verification, profile active status and identity/profile email equality.
- Added production-mode auth regression tests with isolated temporary SQLite and a mock Supabase identity/profile endpoint.

### SEO and accessibility
- Corrected homepage Open Graph and Twitter metadata to Beauty Zone Jaipur.
- Removed viewport restrictions that blocked user zoom.
- Sitemap now contains only deliberately indexable public routes and public salon detail URLs.
- Added route-level noindex handling for login, registration, password recovery, email verification, customer appointments, owner dashboard, admin and unknown routes.
- Public homepage, salon directory and valid salon detail routes get route-specific canonical and social URL metadata.

### Verification
- TypeScript passed.
- Automated tests: 135 passed, 0 failed.
- Vite build passed.
- Prerender passed.

## Architectural notes

No production business records were migrated, reset or deleted. No production Supabase schema was altered by this audit branch. The earlier Beauty Rewards PR migration already applied on the connected Supabase project remains as documented in the prior reward delivery; customer appointment history migration is not yet applied.

## Deployment notes

- PR #27 is a draft review checkpoint and must be reviewed before merge.
- No production deployment was triggered by this branch.
- Vercel preview deployment/CI may build automatically for PR; production domain remains on main.
- Current production Razorpay credentials and server-only Supabase secret are not configured.
- Production email delivery provider is not wired into the legacy mailer.
- Core transactional data remains in local SQLite under Vercel /tmp; do not treat production as migrated to Supabase.
- Legacy SQLite data export, backup and reconciliation are required before any cutover.

## Remaining blockers

See AUDIT-REPORT.md, GAP-ANALYSIS.md, BUG-FIX-REPORT.md, SECURITY-REPORT.md, PERFORMANCE-REPORT.md and TEST-REPORT.md.