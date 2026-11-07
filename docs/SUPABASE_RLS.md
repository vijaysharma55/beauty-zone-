# Supabase database security and migration status

Project: **beauty-zone-jaipur** (botkjeikjzhnbxnowdkl), region **eu-central-1**.

## Current architecture

Supabase Auth is used for new email/password registration and login, confirmation
callbacks, and password recovery. The Express API validates the Supabase access
token with the Auth server, reads the authenticated user's own profiles row,
and issues a separate HttpOnly application session to preserve existing API
authorization.

The site_sections table stores owner-scoped website configuration payloads
for brand, services, packages, gallery and videos. It is the initial Supabase
content bridge. The older Express API continues to use SQLite for several
transactional dashboard features; this is not a completed data migration.

## Public tables and RLS

RLS is enabled on every application table in public:

- profiles
- salons, salon_versions, services, staff, subscriptions, bookings
- site_sections, gallery_items, salon_packages, videos, branches
- waitlist, stylist_inquiries, service_reviews
- loyalty_accounts, loyalty_transactions, loyalty_vouchers
- platform_settings, audit_logs

Policies are tenant-aware: a salon owner can access records associated with
their own profiles.id; public visitors can read approved/published content
and submit constrained public requests; platform-wide settings, audit records,
subscription management and approval decisions are restricted to the
super-admin role.

Workflow triggers constrain salon approval/publishing/suspension fields,
version review status, profile identity/role fields, visitor booking payment
status, and review/waitlist/inquiry initial status. Administrative helper
functions live in the non-API-exposed private schema. public.rls_auto_enable
and the old auth trigger function are not callable through public RPC.

Image storage uses the beautyzone-assets bucket. Public image reads are
enabled; authenticated uploads, updates and deletes must use a first-level
folder matching the caller's auth.uid().

## Customer appointment history

Migration `20261106_beautyzone_customer_appointment_history.sql` adds
`bookings.customer_id` (nullable, `ON DELETE SET NULL`), allows the `no_show`
status, and adds the SELECT policy `bookings_customer_select` so a signed-in
customer can read only rows where `customer_id = auth.uid()`. Rows are linked to
a customer by **verified** phone number (one-off backfill plus the
`private.link_booking_customer` insert trigger); an ambiguous number is left
unlinked. The customer UI is `/my-appointments` (`src/components/customer/`).

Note: the live booking flow (`POST /public/bookings`) still writes to SQLite, so
this table only contains bookings that have been mirrored/migrated into Supabase.

## Auth integration and configuration

Frontend variables:
- VITE_SUPABASE_URL
- VITE_SUPABASE_PUBLISHABLE_KEY

Server variables:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

The publishable key is not a secret. Do not put service_role or secret keys in
frontend code or VITE_* variables. Configure the Supabase Auth Site URL and
allow the deployed /verify-email and /reset-password redirect URLs. Set up
SMTP for production email. Google login also requires the Google provider to
be enabled in Supabase Auth and matching OAuth client configuration.

## First super-admin bootstrap

An admin account is **not** created by the app. Roles live only in
`public.profiles.role`; the default for every new Supabase Auth user is
`salon_owner`, so an un-promoted account signs in successfully and is correctly
routed to `/dashboard` — never to `/admin`. User metadata, the
`/api/admin/login` demo credentials and a local SQLite `users.role` value cannot
grant admin access.

Run `supabase/migrations/20261107_beautyzone_admin_login_rbac.sql` in the
Supabase SQL Editor first. It repairs the profile trigger, backfills missing
profile rows, adds the profile columns the API reads, installs explicit
`super_admin` RLS policies, and defines a bootstrap function. Then promote the
verified admin email:

```sql
select * from private.bootstrap_super_admin('your-admin-email@example.com');
select id, email, role, status, email_verified from public.profiles where role = 'super_admin';
```

The function is `security definer` and is executable only by `service_role`;
`anon` and `authenticated` cannot call it, so nobody can self-promote from a
signup form. Alternatively, set `SUPER_ADMIN_EMAILS=your-admin-email@example.com`
and `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) in the deployment
environment: the API will update that trusted profile row at sign-in and
re-read it before issuing the application session.

Never make role assignment a public signup field or client-side action. The
`prevent_profile_role_change` and `guard_profile_identity_fields` triggers block
self-service role changes.

## Admin login troubleshooting (production)

| Symptom | Cause | Fix |
| --- | --- | --- |
| "Invalid login credentials" | Seeded demo credentials (`admin@beautyzone.app` / `Admin@12345`) are hard-blocked in `NODE_ENV=production`; they only exist for local first-boot demos. | Create the admin in Supabase Auth (Dashboard > Authentication > Users), confirm the email, then bootstrap the role. |
| "Please confirm your email address" | `auth.users.email_confirmed_at` is null. | Confirm the user in Supabase Auth, or enable/confirm email in Auth settings. |
| "Your BeautyZone profile is still being created" / "missing" | `public.profiles` row was never created because `on_auth_user_created` was missing. | Run the migration above; it backfills from `auth.users` and the API repairs a missing row when a service-role key is configured. |
| "Could not load your BeautyZone profile" | Older deployed schema lacks `profiles.status` / `date_of_birth`, so PostgREST returns 400. | The migration adds both columns; the API also retries with a minimal column list. |
| Signs in but lands on `/dashboard`, not `/admin` | `profiles.role` is still `salon_owner`. | Bootstrap the role as above; the login response role then drives the redirect. |
| `/api/admin/*` returns 401 after a cold start | Vercel `/tmp` is ephemeral and the SQLite `sessions` row referenced by `bz_session` disappeared. | `server/middleware.js` now verifies the Supabase bearer token directly and mirrors the trusted profile role on every protected request; the cookie is only a warm-instance convenience. |
| Admin tables are empty or writes return 403 | Missing explicit super-admin RLS policy. | The migration installs `bz_admin_all_*` policies on every admin-facing table. |

### Four application roles

`public.profiles.role` accepts `super_admin`, `admin`, `salon_owner` and
`customer` (the `20261107_beautyzone_admin_login_rbac.sql` migration replaces the
older two-role check). `super_admin` has full console access; `admin` has
operational console access (`private.is_admin()`); `salon_owner` owns one salon;
`customer` only sees customer-facing surfaces. `private.is_super_admin()` stays
strict for role changes, platform settings and destructive admin writes.

```sql
select * from private.assign_application_role('ops@example.com', 'admin');
select * from private.assign_application_role('chief@example.com', 'super_admin');
select id, email, role, status from public.profiles order by role;
```

The Express API accepts the same vocabulary via `src/lib/roles.js` /
`server/roles.js`. Deployed schemas missing `status`, `date_of_birth` or
`email_verified` are handled by the select-list fallbacks in
`server/postgrest.js`, so a partially-migrated project cannot return 409/500
at sign-in. See `docs/PRODUCTION_HARDENING.md` for the full hardening matrix.

Server variables used by the login bridge: `SUPABASE_URL`,
`SUPABASE_PUBLISHABLE_KEY` (or `SUPABASE_ANON_KEY` / `VITE_*` equivalent), plus
optional `SUPABASE_SERVICE_ROLE_KEY`, `SUPER_ADMIN_EMAILS` and `ADMIN_EMAILS`.
Setup order:
run the SQL migration, set the environment variables, redeploy, then sign in at
`/login`. The client route rewrites for `/login`, `/admin/*` and `/dashboard/*`
in `vercel.json` must also be deployed so deep links resolve to the SPA.

## Migration still required

The current Supabase schema does not automatically migrate SQLite data. Existing
salons, service/staff records, appointments, subscriptions, approvals, reviews,
loyalty activity, administrator settings and audit history remain in SQLite
until an explicit backfill is implemented and validated. Several existing
Express route modules also continue to use SQLite directly. Do not remove the
SQLite database or treat the platform as fully Supabase-backed until:

1. A deterministic, repeatable SQLite-to-Postgres backfill exists.
2. Every owner/admin/public CRUD route uses Supabase/Postgres with RLS or a
   trusted server-side service role.
3. Tenant isolation and workflow tests run against the Supabase schema.
4. Persistence is verified across deploys/restarts (especially when the
   hosting platform uses ephemeral filesystems).
5. Booking/payment and email side effects are tested end-to-end.

Supabase Security Advisor returned no security lints after the initial policy
hardening. The performance advisor reports currently-unused indexes on the
new, mostly-empty tables; these should be evaluated after real workload data
exists rather than dropped prematurely.
