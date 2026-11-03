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

After the administrator has signed up and the auth trigger has created the profiles row, use the trusted Supabase SQL Editor to set the role for the designated email:

```sql
update public.profiles set role = 'super_admin' where email = 'your-admin-email@example.com';
```

Never make role assignment a public signup field or client-side action. The database trigger blocks self-service role changes.

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
