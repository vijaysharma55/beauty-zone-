# Production hardening notes (auth, routing, RBAC, PostgREST, cache hydration)

Last validated: `npm run lint` (zero TypeScript errors), `npm test` (full suite),
`npm run build` — see the verification section at the end.

## 1. Authentication & session synchronisation

| File | What changed |
| --- | --- |
| `src/context/AuthContext.tsx` | `syncInFlight` is a `Map` keyed by access token (not a single promise), so simultaneous `onAuthStateChange(SIGNED_IN)` + `login()` calls share exactly one `/api/auth/supabase-session` request. A monotonic `latestSyncSeq` generation guard ensures only the newest sync can write state; `SIGNED_OUT`/logout invalidates in-flight results so a late 200 cannot resurrect a session. Phone-only customer OTP sessions are ignored by the owner bridge, and a transient bridge failure falls back to `/auth/me` instead of blanking the screen. |
| `server/routes/auth.js` | Login bridge verifies the token with the shared resolver, syncs the trusted profile role into SQLite, and issues the HttpOnly `bz_session` cookie. Friendly, actionable errors for missing/unverified/disabled profiles. |
| `server/supabase-auth.js` | Shared token verification + profile resolution, 30 s per-token cache, service-role repair of missing profile rows, `SUPER_ADMIN_EMAILS` / `ADMIN_EMAILS` promotion through the trusted `public.profiles` row. |
| `server/middleware.js` | `loadSession` accepts a verified Supabase bearer token as a **stateless fallback** when the SQLite `sessions` row disappears (Vercel cold start). The bearer path also re-checks the profile role on warm instances, so a demotion cannot live in a stale cookie. |

RBAC vocabulary (`src/lib/roles.js`, re-exported by `server/roles.js`):
`super_admin`, `admin`, `salon_owner`, `customer`. Unknown/legacy spellings
normalize to the least-privileged `customer`. Roles are read **only** from
`public.profiles.role`; never from request bodies, user metadata or localStorage.
Operational `admin` can read `/admin` and `/api/admin/*`; granting roles and
changing platform settings stay `super_admin`-only.

## 2. PostgREST schema resilience

`server/postgrest.js` (`selectWithFallback`, `isSchemaMismatch`) and
`src/lib/postgrestFallback.js` (`withSchemaFallback`) retry progressively
smaller `select` lists / write bodies when a deployed Supabase instance lacks
an optional column (`42703`, `42P01`, `PGRST204/205`). Safe defaults are applied
for `status`, `email_verified`, `date_of_birth`, `image_url`, `active`,
`sort_order`, `booking_enabled` and `availability_status`.

Used by:
- `server/supabase-auth.js` → `public.profiles` during login (4 variants).
- `server/supabase-store.js` → `getSupabaseContext`, `getServices`, `getStaff`,
  `rawServices`, `rawStaff`.
- `src/lib/sectionStore.ts` → optional `is_published` / `updated_by` columns on
  cloud catalogue writes.
- `src/lib/appointmentHistory.ts` → optional `customer_id` column / `salons`
  embed. RLS remains the real authorization boundary when the redundant
  `customer_id` filter is dropped.

Non-schema errors (401/403/network) are propagated unchanged — never swallowed.

## 3. Vercel SPA deep links

`vercel.json` puts `/api/(.*)` first, then the prerendered `/` → `/index.html`,
then explicit SPA routes (`/login`, `/admin`, `/admin/*`, `/dashboard`,
`/dashboard/*`, `/salon/*`, `/my-appointments`, `/receipt/*`) and finally a
`/(.*)` catch-all. All SPA routes resolve to the real **`/spa.html`** shell
(`cleanUrls: false`).

> In this repository `dist/index.html` is the *prerendered marketing homepage*
> with injected SEO/structured-data HTML, while `dist/spa.html` is the plain
> React Router shell. Routing deep links to `index.html` would hydrate the
> wrong document. `/spa.html` is the correct SPA entry point; `/index.html`
> remains the `/` landing page. Both are emitted by `npm run build` and are
> covered by `server/tests/vercel-routing.test.js`.

HTML shells are served `Cache-Control: no-cache, must-revalidate`; hashed
`/assets/*` stay immutable, so a redeploy never leaves a browser loading old
chunk hashes.

## 4. Route guards

`src/components/auth/ProtectedRoute.tsx` + `src/lib/redirectGuard.js`:
- waits for `AuthContext.loading` before deciding anything;
- accepts one role or an array (`role` / `roles`);
- sends a role mismatch to that role's real home (`/admin`, `/dashboard`,
  `/dashboard/onboarding`, `/my-appointments`) instead of a dead end;
- `evaluateRedirect` blocks same-path redirects, repeated identical redirects
  (3 within 8 s) and redirect storms (5 within 8 s), rendering a recoverable
  "Access restricted" screen with a workspace link and sign-out instead of an
  infinite loop or white screen;
- `src/lib/authRoutes.js` is the single redirect authority, used by
  `LoginPage`, `RegisterPage`, `ProtectedRoute` and the footer.

## 5. Data integrity & cache hydration

`src/data/catalogHydration.js` holds the framework-free primitives used by
`servicesStore.ts`, `packagesData.ts` and `App.tsx`:

- Owner titles, prices (**including a deliberate 0 / "price on consultation"**),
  images, durations and non-empty copy are preserved byte-for-byte. Inputs are
  never mutated.
- Blank or legacy-placeholder descriptions are replaced; short but genuine
  owner copy is *appended to* with canonical editorial detail, never discarded.
- Missing `processSteps`, `benefits`, `idealFor`, `productsUsed`, `priceNote`,
  validity, outlets and usage rules are filled from the master catalog or a
  category-specific fallback.
- `mergeCatalogs(cloud, local)` reconciles by id: cloud order wins, blank cloud
  fields are repaired from the local cache, and local-only custom cards survive
  a partial/stale cloud read. Enrichment runs exactly once afterwards.
- `sanitizeCatalog` drops malformed rows, deduplicates ids and caps the payload
  at 500 items so a corrupt cache cannot exceed the localStorage quota.
- `catalogsEqual` avoids a localStorage write on every page view; writes only
  happen when content actually changed.
- Cloud failures are caught: the already-hydrated local cache keeps the
  storefront rendering with no blank cards.

## Deployment checklist

1. Run `supabase/migrations/20261107_beautyzone_admin_login_rbac.sql` in the
   Supabase SQL Editor. It is idempotent, repairs the `auth.users` →
   `public.profiles` trigger, backfills missing rows, adds `admin`/`customer`
   RLS policies and defines `private.assign_application_role(email, role)`.
2. Promote accounts (SQL Editor or env allowlists):
   ```sql
   select * from private.assign_application_role('chief@example.com', 'super_admin');
   select * from private.assign_application_role('ops@example.com',   'admin');
   ```
   Or set `SUPER_ADMIN_EMAILS` / `ADMIN_EMAILS` plus
   `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SECRET_KEY`) in Vercel.
3. Confirm the admin's email in Supabase Auth (`email_confirmed_at`).
4. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (the API also accepts
   `VITE_SUPABASE_*` / `SUPABASE_ANON_KEY` fallbacks), `APP_URL`, and redeploy.
5. Sign in at `/login`; a `super_admin` or `admin` must land on `/admin`, an
   owner on `/dashboard` (or `/dashboard/onboarding`), a customer on
   `/my-appointments`.

## Scale caveat (important, not resolved by this patch)

The Express API still uses `node:sqlite` on Vercel's ephemeral `/tmp` for
sessions, bookings, payments, approvals and admin analytics. That is fine for a
single instance, but it is **not** a 100,000-concurrent-user / zero-downtime
datastore: sessions and transactional rows are lost on cold starts and are not
shared across function instances. The bearer-token fallback in this patch keeps
authentication working across cold starts, but the data itself still needs:

1. a managed Postgres (Supabase) migration for all transactional tables, with
   RLS and tenant isolation;
2. stateless sessions (verified bearer tokens only) or a shared session store;
3. connection pooling / rate limiting / idempotency keys on write endpoints;
4. load and failover testing before claiming a 100k-user SLO.

Those are architectural work items, not configuration toggles.

## Verification

```
npm install --no-audit --no-fund
npm run lint     # tsc --noEmit, zero errors
npm test         # node --test, full suite
npm run verify   # lint + test + build
npm run test:auth      # auth/RBAC/redirect subset
npm run test:hardening # all hardening regression tests
```
