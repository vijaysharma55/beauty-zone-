# BeautyZone — Audit Changelog

## PR — "Add New Staff Member" onboarding module (2026-11-08)

Completes the salon-owner staff onboarding flow with every field captured from the latest UI walkthrough,
mapped end-to-end across the database schema, the API validation layer and the dashboard form.

### Data model (SQLite + Supabase in parity)
New `staff` columns, all additive with backfilled defaults so existing rosters keep working:

| Column | Type | Default | Purpose |
| --- | --- | --- | --- |
| `primary_role` | text | `''` | Professional title slug (senior_stylist … receptionist) |
| `app_access_role` | text | `service_provider` | System permission level (manager / service_provider / receptionist) |
| `commission_percent` | real | `15` | Commission share, 0–100 checked |
| `mobile_number` | text | `''` | Normalised `+91XXXXXXXXXX` |
| `hide_mobile_number` | int/bool | `0` | Keeps the number out of public/staff lists |
| `service_ids_json` / `service_ids` | json | `[]` | Assigned catalogue services (empty = whole catalogue) |
| `weekly_schedule_json` / `weekly_schedule` | json | `[]` | Mon→Sun start/end times + `closed` flag |

- `server/db.js`: expanded `CREATE TABLE staff` + `serializeStaff` now returns `primaryRole`, `appAccessRole`,
  `commissionPercent`, `mobileNumber`, `hideMobileNumber`, `serviceIds` and a always-seven-day `weeklySchedule`.
- `server/migrations.js`: idempotent `ALTER`s, default backfills, and a legacy `role_title` → `primary_role`
  inference pass so the dropdown never opens empty on an existing employee.
- `supabase/migrations/20261107_beautyzone_staff_onboarding.sql`: same columns plus CHECK constraints for the
  role vocabulary, app access, 0–100 commission, JSON array shape and the new `off_duty` availability state.
- `server/supabase-store.js`: extended `STAFF_SELECT_VARIANTS` and `mapStaff` so PostgREST projects expose the
  new fields with the same shapes.

### API
- `POST/PATCH /api/salon/staff` now validate and persist every onboarding field: primary role, app access,
  commission, mobile (normalised `+91`), hide flag, service mapping and weekly roster.
- `roleTitle` is derived from the primary-role label when the owner does not type a custom designation, so public
  templates never render a raw slug.
- Assigned service ids are rejected unless they belong to the owner's own catalogue (cross-tenant guard).
- Skills are trimmed, case-insensitively de-duplicated and capped at 25 × 80 chars.
- `off_duty` added as a fourth availability status; only `available` staff are offered for online booking.
- Public payloads omit `appAccessRole`, `commissionPercent`, `serviceIds` and always blank `mobileNumber`.
- `POST /api/public/bookings` rejects a preferred specialist who is not mapped to the requested service
  (`409 STAFF_SERVICE_MISMATCH`) instead of silently assigning the wrong artist.
- `GET /api/public/availability` accepts `staffId` and intersects the specialist's weekly roster with the salon's
  opening hours (`staffScheduleApplied: 'staff_schedule' | 'staff_closed'`).

### Dashboard UI
- `src/lib/staffRoles.js` — new framework-free vocabulary shared by API + browser (roles, app access, availability,
  weekdays, skill suggestions, mobile/commission normalisation, schedule helpers).
- `src/components/dashboard/StaffFormFields.tsx` — new form primitives: `SkillTagSelector` (pill/tag multi-select
  with custom skills), `ServiceAssignmentPicker` (searchable, category-grouped checkbox group), `WeeklyScheduleEditor`
  (per-day toggle, `HH:MM` start/end pickers, "closed" `[--:--]` state, Sunday closed by default) and
  `MobileNumberField` (+91 prefix, live validation, "hide from public/staff list" checkbox).
- `src/components/dashboard/StaffPage.tsx` — the Add/Edit modal is now a six-step form (identity → roles &
  permissions → services → weekly schedule → skills → optional profile), with client-side validation mirroring the
  API, and the staff cards surface role, app access, commission, masked mobile, roster summary and service mapping.
- `src/components/site/SalonBookingPanel.tsx` + `useAvailability` pass the selected specialist so the time picker
  respects their roster, and explain "this specialist is off on this day".
- `src/components/StylistProfileModal.tsx` shows a weekly availability summary on the public profile.

### Tests
- `server/tests/staff-onboarding-unit.test.js` (15 tests) covers the shared vocabulary, schedule normalisation,
  skill de-duplication, +91 mobile parsing, commission bounds, masking and service mapping.
- `server/tests/api.test.js`: two new end-to-end tests covering full field round-trip, privacy of internal fields,
  validation failures, defaults, `off_duty`, roster-driven availability and service-mapping enforcement.

`npm run lint && npm test && npm run build` all pass (235 tests, 234 pass / 1 skipped).

---

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