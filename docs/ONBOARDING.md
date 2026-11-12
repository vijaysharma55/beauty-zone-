# Salon owner onboarding persistence

## Deploying

1. In the Supabase SQL Editor, apply the existing baseline, owner RBAC, atomic
   onboarding and asset bucket migrations first. Then apply
   `supabase/migrations/20261111_beautyzone_onboarding_persistence.sql` to the
   **same Supabase project** used by the application, and deploy the app/API
   together. Refresh the PostgREST schema cache if the new RPCs are not visible.
   The migration is included in the repository; deploying the code alone does
   **not** apply it to a remote project. If an earlier version of this migration
   was already applied, reapply the updated, idempotent file so the local-owner
   availability RPC is installed.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser,
   and `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the API. Both pairs must
   point to the same project. No service-role key is sent to the browser.
3. The `beautyzone-assets` bucket and its existing owner-folder policies must be
   present. Authenticated Supabase owners upload onboarding images to
   `<auth.uid()>/onboarding/…`; failed uploads are reported rather than silently
   falling back to an ephemeral server file. URL entries and uploads are both
   supported. Local-only development accounts use the existing local upload API.

## Behaviour and recovery

- There are four sequential steps. Name, handle, tagline, description, address,
  city, state, business phone/email, logo, hero image, a template and valid
  seven-day opening hours are required. Owner/manager name and phone are optional.
  At least one day must be open and closing must be after opening. A handle must
  be valid, non-reserved and available in both the legacy and Supabase catalogues.
  A failed Supabase lookup blocks advancement and completion rather than
  treating the address as free. The old local-only creation endpoint performs
  the same check. The two stores are independent: these checks cannot make
  concurrent cross-store creation atomic; a shared authoritative catalogue is
  needed for a hard global uniqueness guarantee.
- React Hook Form and the shared Zod schemas validate each step. The current
  section is saved before moving forward or backward; the progress indicator is
  not a navigation control. The API and database also reject forward jumps,
  invalid prerequisites and normal edits to other sections. The old
  `POST /api/salon/onboarding` remains for local-only legacy integrations;
  Supabase-linked owners must use the draft and completion endpoints instead.
- `public.onboarding_profiles` is keyed to `auth.users.id`, readable only by the
  active owner under RLS. Write access is through fixed-search-path,
  authenticated RPCs that check `auth.uid()` and perform a revision-checked
  upsert. Completion creates the Supabase `salons` row and trial subscription
  and marks the draft complete in one transaction. Retrying completion returns
  the same salon rather than creating a duplicate.
- Changes are backed up to localStorage immediately and saved to the database
  after a short debounce. The backup is scoped to the account and browser tab;
  another tab cannot silently overwrite it, even if a new window copies its
  opener's session storage. Web Locks preserve the tab key across reloads;
  browsers without Web Locks use a fresh page key and recover from the backup
  scan. A new tab can recover an abandoned backup. A pending write is recorded
  so a response lost after a successful
  database commit can be reconciled safely. If the server and device have
  conflicting unsynced versions, the owner explicitly chooses which to keep.
- If loading fails without a device backup, the form is not initialized over an
  unknown remote draft. With a backup, the owner can continue editing the current
  step, but cannot advance or finish until the database save succeeds. A retry
  button and online reconnect retry are provided. If browser storage is disabled
  or full, a warning is shown; unsynced edits cannot be recovered after closing
  that page. Browser storage is not encrypted, so users of shared devices should
  consider that the draft can remain on that device until setup completes.
- Local-only, cookie-authenticated development accounts store drafts in the
  owner-scoped SQLite `onboarding_drafts` table. They do not have a Supabase
  `auth.uid()` and their drafts cannot sync across devices unless their SQLite
  database is shared. Supabase identities do not silently fall back to SQLite
  when their online session or storage is unavailable. Cookie-only owners use
  `onboarding_slug_available_for_local`, an anonymous RPC that returns only an
  availability flag and reason (including for unpublished handles). The API
  limits its availability endpoint; the RPC can also be called directly with a
  publishable key, so apply Supabase gateway rate limits where appropriate.

## Legacy dashboard boundary

The owner dashboard and many other operational routes still use SQLite. On
successful Supabase onboarding, the API mirrors the completed salon and
subscription into that existing store. If a fresh API instance has no local
salon, it first restores a completed draft; otherwise it can restore a salon
created by the previous Supabase flow using the verified owner's bearer token.
Legacy salons are not rejected for missing fields or reserved handles that the
new wizard requires. An existing subscription is preserved; a missing remote
subscription does not create a new trial. A remote suspension remains in effect.

This is a **salon-profile snapshot**, not a full migration. It does not recreate
approval/publication state, services, staff, bookings, or other operational
records, and it does not sync later SQLite dashboard edits back to Supabase. Do
not rely on ephemeral server storage for those other records. Existing
SQLite-only salons are not automatically backfilled.

## Tests

Run `npm run test:onboarding` for draft/recovery, SQLite API, Supabase/Postgres
migration, serverless bridge and React wizard/upload tests. `npm run verify`
includes these checks as well as the existing project suite and production build.
CI installs the committed Bun lockfile with `bun install --frozen-lockfile` before
running `npm run verify` under Node.js 22.
