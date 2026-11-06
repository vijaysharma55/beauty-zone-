# BeautyZone — Bug Fix Report

Date: 2026-11-06  
Working branch: audit/beautyzone-production-hardening  
PR: https://github.com/vijaysharma55/beauty-zone-/pull/27

## Confirmed bugs and changes

| ID | Root cause | Fix in branch | Files |
|---|---|---|---|
| B-01 | Production login treated seeded demo admin/owner credentials as a special successful password path and could recreate missing demo users. | Production/Vercel blocks seeded and synthetic demo identities before DB lookup; demo auto-provision is non-production only. | server/routes/auth.js |
| B-02 | Supabase session bridge could preserve local SQLite super_admin when Supabase profile role was salon_owner. | Supabase public.profiles.role is now the sole role source. | server/routes/auth.js |
| B-03 | Supabase bridge did not reject disabled profiles or mismatched profile email. | Requires active profile and exact normalized email identity match; requires verified email for salon dashboard session. | server/routes/auth.js |
| B-04 | Homepage OG metadata named Lumina Luxe while the page title/schema named Beauty Zone. | OG and Twitter titles/descriptions aligned to Beauty Zone Jaipur. | index.html |
| B-05 | Viewport disabled pinch zoom and browser text scaling. | Removed maximum-scale=1 and user-scalable=0. | index.html |
| B-06 | Sitemap included login, registration, password recovery and verification routes. | Sitemap generation now emits homepage, salon directory and public salon detail pages only. | scripts/sitemap.mjs |
| B-07 | Client-side navigation did not explicitly noindex private and utility pages or set route-specific canonical values. | Added route indexing policy for auth, customer account, dashboard/admin and unknown routes; public routes get route-specific canonical and OG URL. | src/App.tsx |
| B-08 | Production auth protections lacked regression coverage for seeded identities and Supabase/local role mismatch. | Added isolated production-mode auth integration suite using temporary SQLite and mock Supabase endpoints. | server/tests/security-production.test.js, package.json |
| B-09 | Sitemap had no test that auth routes stayed excluded. | Added explicit assertions for auth route exclusion. | server/tests/sitemap.test.js |

7. **Vercel deep-link fallback**: despite a `/(.*) -> /spa.html` rewrite in `vercel.json`, direct requests for known React routes return HTTP 404 in production and preview. Fix and verify the deployment routing before relying on refresh/bookmarks.

## Root-cause defects identified but not safely repaired

1. **Ephemeral SQLite**: Vercel sets DATA_DIR to /tmp/beautyzone-data. SQLite holds users, sessions, salons, services, staff, bookings, payments and related rows. A serverless filesystem is not a shared durable transactional database. A safe fix requires a migration/cutover plan and data reconciliation, not a code-only switch.
2. **Split booking history**: booking creation inserts in SQLite; customer appointment history selects Supabase public.bookings. This makes new bookings absent from the customer history data source.
3. **Payment unavailability**: production endpoint reports Razorpay mode but RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are missing. No fake payment provider was added.
4. **Email outbox**: legacy mailer saves JSON locally and returns delivered=false. No real SMTP/transactional-email provider is configured in this route.
5. **Distributed rate limiting**: limiter uses an in-process Map and cannot coordinate across Vercel instances.
6. **CSP breadth**: a policy exists but includes unsafe-inline, unsafe-eval and broad HTTPS sources. Strict CSP was not enabled without browser validation.

## Validation

Latest successful GitHub Actions run on audit branch before/including audit report commit:
- TypeScript: passed.
- Tests: 135 passed, 0 failed.
- Vite production build: passed.
- Prerender: passed.

The latest code head must be rechecked against Actions after any subsequent commit. No production database rows were modified by this audit branch.