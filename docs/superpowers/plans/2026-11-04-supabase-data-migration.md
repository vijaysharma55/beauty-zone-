# Supabase data migration — implementation plan

Spec: `specs/2026-11-04-supabase-data-migration-design.md`

## Phase 1 — Foundation (this PR)
- [x] `server/store/supabaseAdmin.js`: minimal PostgREST client (select/insert/upsert/update/delete), service-role key from env, 8s timeout, no key logging.
- [x] `server/store/rowMap.js`: pure converters + unit tests.
- [x] `server/store/config.js`: `DATA_BACKEND` flag + `backendIsSupabase()`.
- [x] Audit log mirrored to Supabase when flag is `supabase` (best-effort, non-blocking).
- [x] `.env.example`: document new vars.

## Phase 2 — Identity, salons, services, staff, subscriptions, versions
- [ ] `profilesRepo`, `salonsRepo`, `servicesRepo`, `staffRepo`, `subscriptionsRepo`, `versionsRepo`.
- [ ] Convert `routes/auth.js`, `routes/salon.js`, `workflow.js`, `middleware.js` reads to `await`.
- [ ] Mapper tests for salon/service/staff.

## Phase 3 — Bookings, waitlist, reviews
- [ ] `bookingsRepo`, `waitlistRepo`, `reviewsRepo`; availability query by `booking_date`.
- [ ] Postgres RPC for slot conflict check + booking insert (atomic).
- [ ] Convert `routes/bookings.js`, `routes/public.js`.

## Phase 4 — Loyalty, admin, cutover
- [ ] `loyaltyRepo` with RPC for points/voucher redemption.
- [ ] Convert `routes/loyalty.js`, `routes/admin.js`.
- [ ] Backfill script SQLite -> Supabase; default flag to `supabase`; delete SQLite path.

## Per-phase gate
`npm run verify` locally, then enable `DATA_BACKEND=supabase` in a preview deploy and smoke-test sign up -> onboarding -> booking.
