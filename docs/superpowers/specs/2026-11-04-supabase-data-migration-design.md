# Supabase data-layer migration — design

Status: approved in chat by the project owner (Approach 1, phase-wise). Written spec; implementation follows `plans/2026-11-04-supabase-data-migration.md`.

## Goal
Move all persistent data (salons, services, staff, bookings, waitlist, loyalty, subscriptions, settings, audit) from the local SQLite file to Supabase Postgres project `beauty-zone-jaipur`, while the React app and the `/api/*` contract stay unchanged. Sections are wired to each other through Postgres foreign keys (`salons` -> `services`/`staff`/`bookings`/`waitlist`/`subscriptions`/`loyalty_*`).

## Why
- Vercel's filesystem is ephemeral, so SQLite data is lost between deploys/cold starts.
- Identity already lives in Supabase Auth (see `server/supabase.js`).

## Non-goals
- No frontend rewrite and no direct browser-to-database access.
- No change to API shapes, serializers or roles.
- File uploads (`UPLOAD_DIR`) stay as-is; moving them to Supabase Storage is a later, separate change.

## Architecture
Browser -> Express `/api/*` (unchanged) -> `server/store/*` repositories -> Supabase PostgREST using the **service-role key** (server only, never in the browser or git). Access control stays in Express (`requireAuth`, `requireRole`, tenant checks); the existing RLS policies remain as defence in depth for any future direct access.

```
routes/*  ->  store/<entity>Repo.js  ->  store/supabaseAdmin.js (fetch -> PostgREST)
                                   \->  store/rowMap.js (pure SQLite-shape <-> Postgres-shape)
```

Key decision: repositories return rows in the **existing SQLite shape** (0/1 booleans, `*_json` strings, `date`/`time`). `rowMap.js` converts both ways, so the existing serializers (`serializeSalon`, `serializeService`, ...) and route logic keep working; routes only change from sync to `await`.

## Schema gaps found (Supabase vs SQLite)
| Topic | SQLite | Supabase | Handling |
| --- | --- | --- | --- |
| IDs | text uuid | uuid | pass through (already uuid-formatted) |
| Booleans | 0/1 | boolean | rowMap |
| JSON | `*_json` text | jsonb (`gallery`, `theme`, `timings`, `specialties`, ...) | rowMap |
| Booking date/time | `date`,`time` | `date`/`time` **and** `booking_date`/`booking_time` | write both, read `booking_*` first |
| Loyalty | keyed by `phone` | keyed by uuid `id`, `phone` unique per owner/salon | repo resolves account by phone |
| Loyalty tx type | `type` | `transaction_type` and `type` | write both |
| Users | `users` + `sessions` | `profiles.id = auth.users.id`; no sessions | profiles replaces users; cookie sessions retire once Supabase auth is on |
| audit meta/ip | text | jsonb / inet | rowMap (invalid IP -> null) |
| platform_settings.value | JSON text | jsonb | rowMap |

## Safety / rollout
- Env flag `DATA_BACKEND=sqlite|supabase` (default `sqlite`) so each phase can be merged and switched on per environment, and rolled back by flipping the flag.
- Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only). The service-role key bypasses RLS: never log it, never ship it to Vite (`VITE_*`).
- One-off backfill script copies existing SQLite rows to Supabase (idempotent, upsert by id).

## Phases
1. Foundation: admin client, `rowMap`, flag, audit log + platform settings mirrored. (additive, no behaviour change)
2. Identity + salons + services + staff + subscriptions + salon_versions (workflow/approval).
3. Bookings + waitlist + reviews + availability queries.
4. Loyalty, admin dashboards, backfill script, remove SQLite path.

## Testing
Pure `rowMap` unit tests (node --test, no network). Repositories tested against a stubbed `fetch`. Existing `npm run verify` stays the gate before each phase is enabled.

## Known risks
- `node:sqlite` calls are synchronous; converting call sites to `await` is the bulk of phases 2-4.
- Transactions: PostgREST has no multi-statement transactions. Multi-row writes that must be atomic (loyalty points + transaction + voucher, booking + waitlist) need Postgres functions (RPC) added by migration.
- Not verified in the authoring sandbox (npm registry unreachable): run `npm run verify` locally.
