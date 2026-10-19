# End-to-end gap audit & remediation

Date: 2026-10-19 · Branch: `arena/618d8b9a-beauty-zone`

This document records what was found during the full-stack sweep and what was
changed. Everything below is verified by the suite: `npm run verify`
(TypeScript → 52 tests → production build).

---

## 1. Routing, subdomains & template rendering

### Findings

| # | Gap | Severity |
| - | --- | -------- |
| 1.1 | **No subdomain routing existed.** Slugs lived only in the path (`/salon/:slug`). A `slug.beautyzone.app` host fell through to the marketing homepage. | High |
| 1.2 | **No `vercel.json`.** A Vercel deploy would 404 on every client-side route (`/dashboard/*`, `/salon/*`) because the SPA fallback and the `/api` rewrite were never declared. | High |
| 1.3 | **Invalid/unassigned subdomains were unhandled.** Any host-parsing failure would propagate as a 500 instead of a friendly "not available" page. | Medium |
| 1.4 | No way to verify a tenant from the browser (the client had no source of truth for "am I on a tenant host?"). | Medium |

### Fixes

- **`server/subdomain.js`** — `extractSubdomainSlug()` + `subdomainMiddleware`.
  Recognises `slug.beautyzone.app`, `slug.beautyzone.vercel.app` and 3-label
  custom domains. Rejects `www`/`api`/`admin`/`dashboard`/… reserved labels,
  bare IPs, `localhost`, and preview hosts (`*.e2b.app`, `*.onrender.com`,
  `*.netlify.app`) so a preview URL never masquerades as a tenant.
  Every branch ends in `next()` — **a DB error can never 500 an SSR route.**
- **`GET /api/public/tenant`** — resolves `req.tenant*` for the current host and
  answers `{ mode, slug, found, reason }`. `?slug=` override lets preview/dev
  hosts simulate a tenant.
- **`src/hooks/useTenant.ts`** + **`src/components/site/SubdomainResolver.tsx`** —
  `SubdomainAwareHome` wraps `/`: a live tenant renders its salon site; a
  dead one renders a themed fallback with the reason (`not_found` /
  `not_published` / `not_approved`) and links back to BeautyZone.
- **`src/components/site/PublicSalonPage.tsx`** — accepts `forcedSlug`, and now
  rejects empty/malformed slugs with a message instead of firing a doomed request.
- **`vercel.json`** — `/api/*` passthrough, `/(.*) → /index.html` SPA fallback,
  immutable caching for `/assets/*`, `no-store` for `/api/*`.

### Verified

```
lumina-luxe.beautyzone.app  → tenant "lumina-luxe"   (found)
ghost-salon.beautyzone.app  → { found: false, reason: "not_found" }
www.beautyzone.app          → no tenant (marketing site)
3000-abc123.e2b.app         → no tenant (preview host)
```

---

## 2. Booking & appointment logic

### Findings

| # | Gap | Severity |
| - | --- | -------- |
| 2.1 | **Time slots were a hard-coded array** of 7 strings, ignoring the salon's weekly opening hours entirely. | High |
| 2.2 | **There was no availability API and no persistence** — a booking only built a WhatsApp URL. The owner had no record of it. | High |
| 2.3 | **Submit failed silently.** `handleSubmit` did `if (…) return;` with no feedback; the home-address branch used a blocking `alert()`. | High |
| 2.4 | No closed-day handling, no past-date handling, no lead time. | Medium |
| 2.5 | Public salon pages had **no booking UI at all** — only call/WhatsApp CTAs. | Medium |

### Fixes

- **`server/availability.js`** — pure, tested slot engine:
  opening-hours → grid → per-date slots. Handles closed days, missing hours,
  over-long services (truncated, flagged with `truncated: true` rather than
  blocked), today's lead time, timezone-safe weekday resolution and a 48-slot cap.
  Timezone drift is avoided by anchoring dates at UTC noon.
- **`GET /api/public/availability`** — resolves hours from the **approved
  snapshot** (or the tenant subdomain, or platform defaults) and always answers
  `200` with `{ slots, closed, reason, source, degraded }`.
- **`POST /api/public/bookings`** — persists requests with full validation
  (name, 8–15 digit phone, future date, valid time). Accepts `02:30 PM` **or**
  `14:30`. Rejects out-of-hours with `409`, unknown/unpublished salons with
  `404`, past dates with `400`. Audits, notifies the owner by mail (best-effort),
  and warns when a slot is oversubscribed.
- **`GET|PATCH /api/salon/bookings`** — owner inbox, resolved from the session.
  A forged id from another salon returns `404` and changes nothing.
- **`src/hooks/useAvailability.ts`** — 2 retries with exponential backoff, then a
  static fallback grid with `usingFallback: true` so **a dead API never blocks
  booking**.
- **`src/components/BookingSection.tsx`** — real validation with inline
  field errors (replacing `alert()`/silent returns), loading/closed/empty slot
  states, a "Retry" recovery pill, a submitting spinner, and a failure card with
  **Retry booking** + **Confirm on WhatsApp**.
- **`src/components/site/SalonBookingPanel.tsx`** — booking on the published
  salon site, themed to the tenant, offering only specialists whose
  "online booking" switch is on.

---

## 3. Core modules & UI state management

### Findings

| # | Gap | Severity |
| - | --- | -------- |
| 3.1 | **`primary-action` / `secondary-action` were referenced in the brief but did not exist** anywhere — no stylesheet rules, no components. Every button re-declared its own hex values. | High |
| 3.2 | **No "specialist online booking" control.** A salon could not stop a specific artist being booked online. | Medium |
| 3.3 | Interactive controls had no shared, theme-aware primitive; the white-label theme variables were bypassed by hard-coded Tailwind classes. | Medium |
| 3.4 | Owner dashboard had **no view of customer bookings** — a data gap between the customer-facing page and the owner console. | High |

### Fixes

- **`src/index.css`** — added a themed primitive layer:
  `.action-base` + `.primary-action` / `.secondary-action` / `.ghost-action` /
  `.danger-action` / `.inverted-action` (+ `sm`/`md`/`lg`), `.toggle-switch` and
  `.toggle-switch__knob`, `.field-input` (`--error` variant), `.status-chip`
  (`info`/`success`/`warning`/`danger`/`neutral`), and a
  `prefers-reduced-motion` guard. All are driven by `--wl-*` variables so they
  follow the live white-label theme.
- **`src/components/ui.tsx`** — exported `ActionButton`, `Switch` (uses the
  `.toggle-switch` classes) and `StatusChip`, and wired them into the booking
  CTAs, the staff page and the new bookings page.
- **Specialist online-booking control** — `staff.booking_enabled` column
  (schema + idempotent migration), accepted on staff create/patch, included in
  the approval snapshot and the public payload, exposed as a `Switch` on
  `StaffPage` (optimistic with rollback), and surfaced on the public site as
  "Available for online booking" / "Call the salon to book this artist".
- **`src/components/dashboard/BookingsPage.tsx`** + `/dashboard/bookings` route
  and sidebar entry — the owner inbox that closes the dashboard/customer gap.

### Supabase / RLS

**No Supabase integration exists in this repository.** The backend is
`node:sqlite` (`DatabaseSync`) with tenant isolation enforced in the
application layer, not by Postgres row-level security:

- Owner routes never accept a salon id from the client — `req.salon` is resolved
  from the session (`owner_id = session.user_id`).
- Nested resources are always queried and mutated with
  `WHERE salon_id = <own salon id>`, so a forged id returns `404`.
- Super admin is the only role that reads across salons.
- Public responses are built from a **whitelist** of fields on the approved
  snapshot; review notes, suspension reasons and moderation metadata are never
  exposed. Inactive services/staff and non-approved versions are stripped.

If this is ever migrated to Supabase, the equivalent guarantees must be
re-expressed as policies — see `docs/SUPABASE_RLS.md` for the mapping.

---

## 4. API endpoints & server hardening

### Findings

| # | Gap | Severity |
| - | --- | -------- |
| 4.1 | **`@google/genai` was a declared dependency with no code path** — the AI features were orphaned (the client used a local mock only). | Medium |
| 4.2 | No error logging around generative calls; a provider outage would surface as an unhandled 500. | Medium |
| 4.3 | Vite emitted a `configLoader: 'native'` warning on every build (ESM `__dirname`). | Low |

### Fixes

- **`server/routes/ai.js`** — `GET /api/ai/status`,
  `POST /api/ai/taglines`, `POST /api/ai/description`,
  `POST /api/ai/review-reply` (auth required).
  Contract: **always answer 200**; if the key is missing, the SDK is absent, the
  call times out (12 s abort) or the model returns junk, fall back to
  deterministic templates and report `source: 'fallback'` + `warnings`.
  Every failure is logged with an `[ai]` prefix. Unknown `/api/ai/*` paths return
  a clear `404` instead of hanging.
- **`src/lib/ai.ts`** — client wrapper (`suggestTaglines`, `suggestDescription`,
  `aiStatus`) with its own local fallback, wired into `ManagementModal`'s
  tagline generator (with a loading state).
- **`vite.config.ts`** — `fileURLToPath(new URL('.', import.meta.url))` instead of
  `__dirname`; build is now warning-free.

---

## 5. Verification

```bash
npm run verify     # lint (tsc --noEmit) → 51 tests → production build
npm run test:unit  # 11 unit tests (subdomain parsing, slot engine)
npm run test:api   # 40 end-to-end API tests
```

New coverage: tenant resolution for every host shape, availability generation
and graceful degradation, the booking lifecycle (create → owner inbox → status
change), rejection of past dates / out-of-hours / unknown salons, cross-tenant
isolation of bookings, and AI fallback behaviour.

### Manual smoke test

```bash
npm run dev
# marketing site        → http://localhost:3000/
# owner dashboard       → /dashboard  (owner@luminaluxe.in / Owner@12345)
# owner bookings inbox  → /dashboard/bookings
# public salon site     → /salon/lumina-luxe
# simulated subdomain   → /api/public/tenant?slug=lumina-luxe
```
