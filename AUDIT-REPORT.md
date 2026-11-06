# BeautyZone — Complete Technical Autopsy

**Audit date:** 2026-11-06  
**Production URL:** https://beauty-zone-pearl.vercel.app/  
**Repository:** https://github.com/vijaysharma55/beauty-zone-  
**Audit baseline:** `main` at `1e7348f858edab617fcd5954d34a40b5fb50c63d`  
**Working branch:** `audit/beautyzone-production-hardening`  
**Review PR:** #27 (draft; not merged)

> The request calls the product StudioFlow. The repository, README, deployment and source branding identify it as **BeautyZone**, a white-label salon SaaS. This audit preserves the current product identity; it does not rename or rebrand the project.

## Executive assessment

The repository contains a substantial React/TypeScript salon website and dashboard, Express API, SQLite data model, Supabase Auth/RLS integration, booking/payment workflows, salon directory and customer appointment history.

The project is **not production-ready as a transactional multi-tenant SaaS on Vercel**. The most important issue is architectural: core records and sessions are stored in a SQLite database under Vercel's ephemeral `/tmp` filesystem, while parts of the customer/content/rewards experience read from Supabase PostgreSQL. Those stores are not a single source of truth. Fixing the authentication bypass does not solve the missing persistence layer.

The initial P0 authentication findings have been fixed on this audit branch and covered by production-mode regression tests. SEO and mobile zoom fixes are also included. The current branch must pass its latest CI run and be reviewed/merged before those fixes reach production.

## Repository inventory

The recursive GitHub tree contains approximately 257 entries across:
- React 19, TypeScript, Vite and React Router frontend (`src/`).
- Express API and serverless entry point (`api/index.js`, `server/`).
- SQLite schema, migrations and seed/backfill code (`server/db.js`, `server/migrations.js`).
- Supabase migrations and client/server REST helpers (`supabase/migrations/`, `src/lib/supabase.ts`, `server/supabase-store.js`).
- Payment, receipt, Razorpay, manual UPI and WhatsApp modules.
- API/unit tests under `server/tests/`.
- Vercel config, sitemap generation, prerender scripts and workflow verification.
- Brand images and static assets under `public/` and `src/assets/`.

The application is not a single-database Supabase application. The README and `docs/SUPABASE_RLS.md` describe SQLite as the older transactional store and Supabase as an incremental bridge for Auth and selected content/features.

## Architecture observed

| Layer | Current implementation | Assessment |
|---|---|---|
| Frontend | React 19, TypeScript, Vite, React Router | Substantial implementation; UI interactions not exhaustively browser-tested in this audit. |
| API | Express, mounted by `api/index.js` for Vercel | Works on live smoke tests. |
| Core persistence | `node:sqlite` / `DatabaseSync` | Uses `/tmp/beautyzone-data` on Vercel; ephemeral and not shared. |
| Authentication | Supabase Auth bridge plus local SQLite HttpOnly sessions | Profile-based RBAC now enforced on audit branch; local session storage remains non-durable. |
| Content | Supabase `site_sections` plus localStorage/SQLite fallbacks | Multiple data paths; requires a defined source of truth. |
| Booking | Express routes insert into SQLite | Customer history reads Supabase; end-to-end split-store defect. |
| Loyalty | Supabase PostgreSQL RPCs and RLS (migration already applied in prior PR) | Six offers seeded; no live accounts/transactions/vouchers. |
| Payments | Razorpay, manual UPI and mock/test support | Live production payment endpoint reports Razorpay unavailable due missing credentials. |
| Email | Local JSON outbox/logging in `server/mailer.js` | No real provider is wired in this mailer. Supabase Auth email delivery must be verified separately. |
| Deployment | Vercel serverless | Incompatible with local SQLite as the durable system of record. |

## Severity register

| ID | Severity | Finding | State on audit branch |
|---|---|---|---|
| A-01 | P0 | Default demo/seed identities could authenticate in production, including a seeded super-admin. | Fixed in branch; CI/regression verification required. |
| A-02 | P0 | Supabase session bridge could inherit a local SQLite `super_admin` role even when Supabase profile role was `salon_owner`. | Fixed in branch; profile is now sole role authority. |
| A-03 | P0/P1 | Core data and sessions use ephemeral Vercel `/tmp` SQLite. | Unresolved architecture blocker; no destructive migration attempted. |
| A-04 | P1 | Customer booking history reads Supabase, while public booking creation writes SQLite. | Unresolved; a safe transactional bridge/migration is required. |
| A-05 | P1 | Production payment config returns `available:false`; Razorpay credentials are absent. | External configuration required. |
| A-06 | P1 | Production Vercel environment lacks `SUPABASE_SECRET_KEY`; preview variables from an older branch are not production configuration. | External configuration required. |
| A-07 | P1 | Rate limits use a process-local in-memory Map. | Unresolved; needs shared storage or managed rate-limit service. |
| A-08 | P1 | Legacy mailer persists JSON locally and returns `delivered:false`. | Unresolved; configure a real provider and durable delivery queue. |
| A-09 | P1 | Password-reset email includes the raw reset token; the legacy mailer logs full message text. | Raw reset tokens can appear in application logs; redact and stop logging message bodies before enabling production reset delivery. |
| A-09 | P1/P2 | CSP exists but allows broad HTTPS sources, `unsafe-inline` and `unsafe-eval`. | Hardening/review required; no untested strict policy enforced. |
| A-10 | P2 | Homepage OG title/description described Lumina Luxe instead of Beauty Zone. | Fixed in branch. |
| A-11 | P2 | Viewport disabled user zoom. | Fixed in branch. |
| A-12 | P2 | Sitemap included login/register/password recovery/email verification routes. | Fixed in branch; sitemap test added. |
| A-13 | P2 | Non-home SPA paths inherited homepage canonical metadata. | Route-specific canonical/noindex policy added in branch; verify in browser/crawler. |
| A-14 | P2 | Six large images were preloaded by homepage SSR. | Measured; optimization not yet implemented because attribution to component/priority needs browser tracing. |
| A-15 | P2 | No committed npm lockfile; CI uses `npm install --no-audit --no-fund`. | Unresolved dependency reproducibility/supply-chain improvement. |
| A-16 | P2 | TypeScript config does not enable strict mode; no ESLint, Playwright, axe or Lighthouse workflow was found. | Unresolved QA/tooling gap. |

Additional route probe (2026-11-06): direct HTTP requests to `/login`, `/register`, `/salons`, `/dashboard`, `/my-appointments` and `/salon/lumina-luxe` returned HTTP 404 on both production and the latest Vercel PR preview. The root `/` and the emitted `/spa.html` return HTTP 200. Although `vercel.json` declares a catch-all rewrite to `/spa.html`, the deployed route behavior does not follow that expectation. Client-side in-app navigation was not browser-tested. Treat hard refresh/deep-link routing as a P1 deployment blocker and retest after a route rewrite correction.

Additional route probe (2026-11-06): direct HTTP requests to `/login`, `/register`, `/salons`, `/dashboard`, `/my-appointments` and `/salon/lumina-luxe` returned HTTP 404 on both production and the latest Vercel PR preview. The root `/` and emitted `/spa.html` return HTTP 200. Although `vercel.json` declares a catch-all rewrite to `/spa.html`, the deployed route behavior does not follow that expectation. Client-side in-app navigation was not browser-tested. Treat hard refresh/deep-link routing as a P1 deployment blocker and retest after a route rewrite correction.

## Production smoke tests

Observed against the live domain on 2026-11-06:

| URL/check | Result |
|---|---|
| `/` | HTTP 200; server-rendered homepage |
| `/api/health` | HTTP 200 |
| `/api/public/salons` | HTTP 200; returns seeded salon directory data |
| `/api/public/sitemap-salons` | HTTP 200 |
| `/api/public/tenant` | HTTP 200 |
| `/robots.txt` | HTTP 200 |
| `/sitemap.xml` | HTTP 200 |
| Unknown frontend URL | HTTP 404 |
| Unknown API URL | HTTP 404 JSON |
| Hero image | HTTP 200 |
| `/api/public/payments/config` | HTTP 200; `available:false`, Razorpay keys missing |

Security response headers observed: CSP, Permissions-Policy, Referrer-Policy, HSTS, and X-Content-Type-Options. CSP is present, not missing; the issue is its permissiveness.

## Supabase and data verification

Connected project: `beauty-zone-jaipur` (`botkjeikjzhnbxnowdkl`), region eu-central-1.

Read-only counts showed zero rows in `auth.users`, `profiles`, `salons`, `services`, `staff`, `bookings`, `site_sections`, `subscriptions` and the loyalty account/transaction/voucher tables. The six loyalty offers exist. The Supabase Security Advisor returned zero lints at the time of review.

The applied migration list does not include `20261106_beautyzone_customer_appointment_history`, although that file is in the repository. The existing `docs/SUPABASE_RLS.md` correctly warns that SQLite-to-Postgres migration and route cutover are not complete.

## Scope and limitations

This was a repository/source inspection, live HTTP/API smoke test and database metadata/count review. No production login was attempted with default credentials; no production booking/payment was created; no production data was changed. A real browser session with Playwright, Lighthouse, axe, device emulation and end-user click-by-click testing was not available in the connected tool session. Therefore LCP/FCP/CLS/INP, contrast ratios, keyboard navigation, screen-reader behavior and actual mobile clipping are **not claimed as measured**.

See `GAP-ANALYSIS.md`, `BUG-FIX-REPORT.md`, `SECURITY-REPORT.md`, `PERFORMANCE-REPORT.md`, `TEST-REPORT.md` and `CHANGELOG.md` for details.
