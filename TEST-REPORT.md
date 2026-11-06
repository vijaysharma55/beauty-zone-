# BeautyZone — Test Report

Date: 2026-11-06  
Branch: audit/beautyzone-production-hardening  
PR: https://github.com/vijaysharma55/beauty-zone-/pull/27

## Automated checks

Latest verified full checkpoint run: GitHub Actions run 42208595939 on commit 729d15f30da81b093883fe1b36a1dd1faf315446.

| Check | Result |
|---|---|
| Install dependencies | Passed |
| TypeScript (tsc --noEmit) | Passed |
| Node test suite | 135 passed, 0 failed |
| Vite production build | Passed |
| Prerender | Passed |
| GitHub Actions verify job | Success |

The 135-test suite includes existing unit/API/payment/sitemap/rewards tests and the new production-mode auth security tests.

## New production auth regression coverage

The new test boots a temporary production-mode API instance using an isolated SQLite data directory and a mocked Supabase Auth/Profile endpoint. It verifies:
- Default seeded admin credentials are rejected.
- Default seeded owner credentials are rejected.
- Synthetic Jaipur seed owner addresses are rejected.
- A local SQLite super_admin role cannot elevate a Supabase salon_owner profile.
- Disabled Supabase profiles are denied.
- Unverified email identities are denied.

No production DB or real provider was used by these test cases.

## Live HTTP smoke checks

| Check | Result |
|---|---|
| Homepage | HTTP 200 |
| API health | HTTP 200 |
| Public salon feed | HTTP 200 |
| Paginated sitemap feed | HTTP 200 |
| Tenant resolver | HTTP 200 |
| robots.txt / sitemap.xml | HTTP 200 |
| Unknown page route | HTTP 404 |
| Unknown API route | HTTP 404 |
| Sample public image | HTTP 200 |
| Payment config endpoint | HTTP 200 with payment available=false |

## Direct route smoke test

A follow-up request against production and the PR preview showed HTTP 404 for `/login`, `/register`, `/salons`, `/dashboard`, `/my-appointments` and `/salon/lumina-luxe`; `/` and `/spa.html` returned 200. The route fallback therefore remains a P1 issue. This test was HTTP-level; in-app client navigation was not verified.

## Supabase checks

- Supabase migrations list reviewed.
- RLS enabled on application tables.
- Security Advisor returned zero lints.
- Connected Supabase core tables and auth.users are empty at audit time, except the six seeded loyalty_reward_offers rows.
- Customer appointment history migration is present in GitHub but absent from applied migration list.

## Failures observed and fixed during the audit branch

- Duplicate auth file sections caused TypeScript redeclaration errors after an intermediate GitHub file update. The auth module was restored from the main source and the patch reapplied once; current file has one copy of each limiter/route and CI passed.
- An App route-regex edit caused invalid-character TypeScript errors; fixed.
- A dynamically created robots meta element was initially typed as generic HTMLElement; changed to HTMLMetaElement and verified by passing TypeScript.
- Intermediate failures remain in earlier commit check runs, but the current head run completed successfully. Do not confuse historical intermediate failures with the current head result.

## Not executed / limitations

- No Playwright/browser automation, Lighthouse, axe, Chrome coverage, screen-reader test or responsive screenshot test was available.
- No live customer OTP was sent.
- No live Razorpay transaction or webhook was created.
- No live SMTP/WhatsApp notification was sent.
- No SQLite-to-Postgres data migration or production backfill was attempted.
- No end-to-end production booking was created or changed.

These limitations are intentional: no fake provider responses, production account changes or destructive data operations were used to make tests pass.