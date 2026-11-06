# BeautyZone — Gap Analysis

Date: 2026-11-06  
Audit baseline: main at 1e7348f858edab617fcd5954d34a40b5fb50c63d  
Working branch: audit/beautyzone-production-hardening

The repository implements a substantial salon website and owner/admin dashboard. The main production gap is not a missing UI screen: it is the split persistence architecture. Core Express routes use SQLite while customer history, selected content and rewards use Supabase PostgreSQL.

| Deep links / route fallback | Vercel declares rewrite to `spa.html` | Direct requests to `/login`, `/register`, `/salons`, `/dashboard`, `/my-appointments` and `/salon/lumina-luxe` return HTTP 404 in production and PR preview. | P1 |
## 1. Essential to existing functionality

| Module | Present implementation | Missing / incomplete | Priority |
|---|---|---|---|
| Customer discovery | Salon directory, public salon pages, service catalogue | Directory data source is not the same persistent source as the Supabase customer portal. | P1 |
| Customer account | Supabase phone OTP for rewards and appointment history | Customer identity is not yet consistently mapped to all live transactional booking records. | P1 |
| Appointment history | Customer UI reads Supabase public.bookings with customer_id RLS | Public booking route writes SQLite. History cannot reliably show those new appointments. | P1 |
| Salon onboarding | Owner registration, onboarding, trial subscription and editor UI | Records are in ephemeral SQLite on Vercel. | P0 |
| Salon profile | Owner API, content editor, publishing/approval workflow | Owner data and public content can diverge between SQLite and Supabase site_sections. | P1 |
| Services catalogue | Owner CRUD and public catalogue | SQLite persistence is instance-local on Vercel. | P1 |
| Staff management | Staff CRUD and availability UI | Same persistence and cross-instance limitation. | P1 |
| Booking management | Create, confirm, decline, cancel, complete and owner dashboard | SQLite booking ledger is not shared/durable; customer history is a separate Supabase query. | P0/P1 |
| Payments | Razorpay, manual UPI and mock flows | Production Razorpay configuration is unavailable; no live payment smoke test is possible. | P1 |
| Customer loyalty | Supabase PostgreSQL accounts, transactions, vouchers and six offers | Requires server-only secret for awards/release; real OTP/award smoke test not performed. | P1 |
| Reports/analytics | Analytics page and admin overview | Underlying transactional source is SQLite and should be reconciled before treating reports as authoritative. | P1 |
| Notifications | WhatsApp Cloud API integration and notification ledger | Provider can be disabled; no production delivery confirmation observed. | P2 |
| Email | Verification/reset email generation | Legacy mailer writes a local outbox and reports delivered=false. | P1 |

## 2. Required for production readiness

1. Move core transactional tables to a durable shared database. The existing Supabase schema is a plausible target, but it must be completed route-by-route rather than enabled by a flag.
2. Build a deterministic SQLite export/import tool. Preserve IDs where possible, map foreign keys, normalize phone numbers, reconcile record counts and financial totals, capture rejects, and support safe repeat runs.
3. Choose a cutover strategy. Until all routes use one authoritative database, document which store owns each entity and how cross-store writes are reconciled.
4. Replace SQLite sessions with a shared session store or verify Supabase access tokens per request and use profile/RLS authorization consistently.
5. Replace process-local in-memory rate limits with a shared atomic limiter.
6. Configure production Razorpay credentials and webhook signing secret, then test both success and failure/duplicate webhook flows using provider test mode before live mode.
7. Configure real transactional email delivery. Do not expose reset tokens or verification URLs as a production fallback.
8. Set the production Supabase secret key only in the server environment and run a real phone OTP → reward redemption → booking → completion → points-award smoke test.
9. Apply and verify the customer appointment-history migration only as part of the chosen database cutover plan; the existing production Supabase bookings table is empty.
10. Add durable backups, restore drills, provider failure alerts, request IDs and operational runbooks.

## 3. Useful improvements

| Improvement | Reason |
|---|---|
| Route-level titles, descriptions, OG images and schema | Improves public salon discovery and sharing. |
| Responsive image variants (AVIF/WebP) | Reduces mobile image transfer and decode work. |
| Lazy-load offscreen media and third-party embeds | Reduces initial network contention. |
| Lighthouse CI and field Web Vitals | Establishes measurable performance regressions. |
| axe and keyboard tests | Catches common accessibility regressions. |
| Lockfile and dependency audit | Makes CI installations reproducible and improves supply-chain visibility. |
| CSP report-only rollout | Identifies required sources before tightening the policy. |
| API schema validation and consistent error codes | Reduces client/server drift and makes recovery clearer. |

## 4. Optional future enhancements

These are not production blockers unless the product chooses to sell them:
- Advanced CRM segmentation and marketing campaigns.
- Staff commission/payroll and shift optimization.
- Multi-branch forecasting and advanced finance dashboards.
- Inventory, supplier purchasing and wholesale marketplace.
- Native apps, push notifications and in-app chat.
- AI-generated growth advice and demand prediction.

## 5. Explicitly not faked

Payment success, email delivery, WhatsApp delivery, customer history completeness, loyalty points awards and performance targets must only be claimed after their real providers/data flows confirm success.