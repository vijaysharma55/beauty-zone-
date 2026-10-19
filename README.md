# BeautyZone — White-Label Salon Websites with Authentication & RBAC

A full-stack salon website platform. Salon owners sign up, verify their email, complete salon
onboarding, build and submit their website for approval, then publish a unique public URL once a
platform admin approves it. A super admin console manages every user, salon, submission,
subscription and platform setting. Visitors browse published salon websites without logging in.

### Approval lifecycle

```
Registered → Onboarding → Draft → Pending approval → Approved → Published
```

- **Draft** — only the owner can see it (`/dashboard/preview`).
- **Pending** — a submission snapshot is waiting for a super admin. The owner keeps editing, but
  the public site keeps serving the *previously approved* version.
- **Changes requested / Rejected** — the site is taken offline and stays fully editable; the
  owner can resubmit. A reviewer note is required and shown in the dashboard.
- **Approved** — the owner can publish (email must be verified).
- **Suspended** (admin) — publishing and submissions are blocked and the site goes offline.

The original luxury salon showcase remains the public marketing homepage at `/`.

---

## 1. Roles & permissions

| Capability | Super admin | Salon owner | Public visitor |
| --- | :---: | :---: | :---: |
| Browse marketing site | ✅ | ✅ | ✅ |
| Verify email (link, 24 h, single use) | ✅ | ✅ | — |
| Submit website for approval / resubmit | — | ✅ | — |
| Review queue: approve / reject / request changes | ✅ | — | — |
| Suspend / reinstate any salon (force offline) | ✅ | — | — |
| Open a **published** salon website (`/salon/:slug`) | ✅ | ✅ | ✅ |
| Register / sign in (email + password or Google) | ✅ | ✅ | — |
| Edit own salon profile, logo, gallery, contact details | — | ✅ | — |
| Add / edit / delete own services, prices, staff | — | ✅ | — |
| Preview own draft website | — | ✅ | — |
| Publish / unpublish own website | — | ✅ | — |
| View own subscription | — | ✅ | — |
| List / create / disable users, change roles | ✅ | — | — |
| View every salon, inspect services/team, edit website details, force publish / unpublish | ✅ | — | — |
| Approve only approved versions can be published (server-enforced) | ✅ | ✅ | — |
| Manage all subscriptions & billing periods | ✅ | — | — |
| Edit platform settings, view audit log | ✅ | — | — |

**Tenant isolation is enforced server-side.** Owner routes never accept a salon id from the client:
the salon is resolved from the authenticated session (`owner_id = session.user_id`). Nested resources
(services, staff) are always queried and mutated with `WHERE salon_id = <own salon id>`, so a forged id
returns `404` and changes nothing. Super admins are the only role that can read across salons.

---

## 2. Tech stack

- **Frontend:** React 19, React Router 7, TypeScript, Tailwind CSS 4, Lucide icons
- **Backend:** Node.js + Express 4, `node:sqlite` (`DatabaseSync`) — no external DB service required
- **Security:** scrypt password hashing, opaque session tokens (SHA-256 hashed at rest), HttpOnly
  SameSite cookies, CSRF origin checks, security headers/CSP, login rate limiting + account lockout,
  server-side validation on every field, magic-byte checking for image uploads
- **Build:** Vite 8 (dev middleware + production SPA build)

---

## 3. Quick start

```bash
npm install
cp .env.example .env     # optional — defaults work for local development
npm run dev              # starts API + Vite on http://localhost:3000
```

Open <http://localhost:3000>.

On first boot the database is created in `./data/beautyzone.db` and demo data is seeded:

| Role | Email | Password |
| --- | --- | --- |
| Super admin | `admin@beautyzone.app` | `Admin@12345` |
| Salon owner | `owner@luminaluxe.in` | `Owner@12345` |

> Change these (or set `SEED_ADMIN_*` / `SEED_OWNER_*` before the first run) in any real deployment.
> The seed only runs when the users table is empty.

### Production

```bash
npm run build
NODE_ENV=production npm start
```

The Express server serves the built SPA, the API, and `/api/uploads/*`. Put it behind HTTPS — session
cookies automatically gain the `Secure` flag when `NODE_ENV=production`.

### Tests

```bash
npm run verify      # lint (tsc --noEmit) → 52 tests → production build
npm run test:unit   # 11 unit tests: subdomain parsing + slot generation
npm run test:api    # 40 end-to-end API tests (boots a real server on a temp DB)
npm run lint        # TypeScript check
```

The suite covers the full approval lifecycle (email verification, submit, request changes, resubmit,
approve, publish, rejected sites, suspension), snapshot isolation for unapproved edits, role gates,
tenant isolation, CSRF blocking, admin self-protection, password rotation, subdomain tenant
resolution, availability/slot generation, the booking lifecycle and AI fallback behaviour.

### Email delivery

Verification and review-notification emails are written to `data/outbox/*.json` and logged instead
of being sent through an SMTP provider. Outside production the API also returns
`devVerificationUrl` so registration → verification can be completed locally without mail. Set
`APP_URL` so links point at the right host, and wire `sendMail` in `server/mailer.js` to a provider
(Resend, SES, Postmark…) for real delivery.

---

## 4. User flows

### Salon owner
1. `/register` — create an account (always provisioned as `salon_owner`; the client cannot choose a
   role). Google sign-in is available when `GOOGLE_CLIENT_ID` is configured.
2. `/dashboard/onboarding` — salon name, unique website slug, owner details, phone, complete address,
   logo, hero image, weekly opening hours and a website template. Slugs are validated for format,
   reserved words and uniqueness; the API returns `409` on collision.
3. `/dashboard` — overview, setup checklist, publish status.
4. `/dashboard/website` — brand identity, logo/hero upload, gallery, contact details, hero copy,
   template picker, opening hours, theme colours and the unique slug. Saves stay in Draft.
5. `/dashboard/approval` — workflow stepper, blockers, submit/resubmit, publish/unpublish and the
   full submission history with reviewer notes.
6. `/dashboard/services` — full CRUD for services (price in paise server-side, duration bounds).
7. `/dashboard/staff` — full CRUD for team members, photo upload, specialties and an
   “accepts online bookings” switch per specialist.
8. `/dashboard/bookings` — appointment inbox: every request submitted from the live website,
   filterable by status, with confirm / complete / decline / cancel actions.
9. `/dashboard/preview` — the current draft rendering, private to the owner.
10. `/dashboard/billing` — plan, status, renewal date (managed by the platform admin).
11. `/dashboard/account` — password change and “sign out everywhere”.

### Super admin
`/admin` — platform stats including pending approvals; `/admin/approvals` — review queue with the
submitted snapshot, approve / reject / request changes (with a required note); `/admin/users` —
create/disable accounts, change roles, reset passwords; `/admin/salons` — inspect any salon's profile,
services, prices and team; edit website details; publish/unpublish and suspend/reinstate;
`/admin/subscriptions` — change plan/status/period or extend 30 days; `/admin/settings` —
registration toggle, trial length, default plan, support email, maintenance message, audit log.

### Public visitor
`/salon/:slug` renders only salons that are published, not suspended, and have an approved version.
Draft, pending-only, rejected, suspended and unknown slugs all return the same 404 page, so
unapproved content never leaks. Inactive services/staff and moderation fields are stripped.
Visitors can request an appointment from the salon's own booking panel; the request is stored and
appears instantly in the owner's dashboard inbox.

---

## 4b. Subdomain (tenant) routing

A salon is reachable both by path and by subdomain:

| URL | Renders |
| --- | ------- |
| `beautyzone.app/salon/lumina-luxe` | the salon website |
| `lumina-luxe.beautyzone.app` | the same salon website, resolved from the `Host` header |
| `lumina-luxe.beautyzone.vercel.app` | same, on Vercel preview/production |
| `www.beautyzone.app` | the marketing homepage (not a tenant) |

Resolution happens in `server/subdomain.js` and is exposed to the browser via
`GET /api/public/tenant`:

```jsonc
// live tenant
{ "tenant": { "mode": "subdomain", "slug": "lumina-luxe", "salonId": "…", "salonName": "Lumina Luxe", "found": true } }
// unknown / unpublished / unapproved — never an error, never a 500
{ "tenant": { "mode": "subdomain", "slug": "ghost-salon", "found": false, "reason": "not_found" } }
```

`reason` is one of `not_found` · `not_published` · `not_approved` · `lookup_error`.

**Fallback contract:** reserved labels (`www`, `api`, `admin`, `dashboard`, …), bare IPs,
`localhost` and preview hosts (`*.e2b.app`, `*.onrender.com`, `*.netlify.app`) are never treated as
tenants, and every branch of the middleware ends in `next()` — a database error can never take an
SSR route down. Unresolved subdomains render a themed "not available" page with the reason instead
of silently showing the marketing site.

Add `?slug=<slug>` to `/api/public/tenant` to simulate a tenant on any host (handy in previews).

Wildcard DNS (`*.beautyzone.app → <your Vercel project>`) must be configured in the Vercel
dashboard; `vercel.json` already forwards `/api/*` and falls everything else back to the SPA.

---

## 5. API reference (summary)

All routes are JSON and cookie-authenticated. Writes require a same-origin `Origin` header.

### Auth (`/api/auth`)
| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/register` | public | Create salon owner account |
| POST | `/login` | public | Email + password login |
| POST | `/google` | public | Google ID token login (verified with Google JWKS) |
| GET | `/google/config` | public | Whether Google login is configured + client id |
| GET | `/me` | any | Session + salon + subscription |
| POST | `/logout` | auth | Revoke current session |
| POST | `/logout-all` | auth | Revoke all sessions |
| POST | `/password` | auth | Change password (re-issues session) |
| POST | `/verify-email` | public | Consume a verification token |
| POST | `/resend-verification` | auth | Re-send the verification email |

### Owner (`/api/salon`) — `salon_owner` only
`GET /` (includes `workflow` + version history), `POST /onboarding`, `PATCH /` (draft saves),
`POST /submit`, `POST /publish`, `POST /unpublish`, `GET /versions`, `GET /subscription`,
`GET|POST /services`, `PATCH|DELETE /services/:id`, `GET|POST /staff`, `PATCH|DELETE /staff/:id`,
`GET /bookings` (own salon's appointment inbox), `PATCH /bookings/:id` (`requested` → `confirmed` →
`completed`, or `declined` / `cancelled`),
`POST /uploads?kind=logo|cover|gallery|staff` (raw image body, max 5 MB).

Staff accept `bookingEnabled` — when `false` the specialist is still shown on the website but marked
*“Call the salon to book this artist”* and is not offered in the booking picker.

### Admin (`/api/admin`) — `super_admin` only
`GET /overview`, `GET /approvals`, `GET /approvals/:versionId`,
`POST /approvals/:versionId/review` (`approve` | `reject` | `request_changes`),
`GET /salons/:salonId/versions`,
`GET|POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`,
`GET /salons`, `GET|PATCH /salons/:id`, `GET /subscriptions`, `PATCH /subscriptions/:id`,
`GET|PATCH /settings`, `GET /audit-logs`.

### Public (`/api/public`) — no login
`GET /salons` (live only), `GET /salons/:slug` (approved snapshot only), `GET /slug-available?slug=…`,
`GET /templates`, `GET /tenant` (subdomain → salon resolution),
`GET /availability?date=YYYY-MM-DD[&slug=…][&duration=60][&slot=30][&tzOffset=…]`,
`POST /bookings` (create an appointment request).

`GET /availability` always answers `200`. Slots are generated from the approved snapshot's opening
hours, filtered by the service duration and today's lead time, and capped at 48:

```jsonc
{
  "date": "2026-10-20", "day": "tue", "open": "10:00", "close": "20:00",
  "closed": false, "source": "salon", "degraded": false,
  "slots": [{ "value": "10:00", "label": "10:00 AM", "start": "10:00", "end": "11:00", "available": true }]
}
```

When the salon is unknown or has no hours, platform defaults are used and `degraded` is `true` so
the UI can be honest about it.

### AI assist (`/api/ai`) — graceful by design
`GET /status`, `POST /taglines`, `POST /description`, `POST /review-reply` (auth required).

Set `GEMINI_API_KEY` to enable live generation. **These endpoints never fail hard:** a missing key,
an unavailable SDK, a timeout (12 s) or an empty model response all fall back to deterministic local
templates and answer `200` with `source: "fallback"` and a populated `warnings` array. Every provider
failure is logged with the `[ai]` prefix.

---

## 6. Security notes

- **Passwords** are hashed with scrypt (N=16384) and a unique 16-byte salt; verification uses
  `crypto.timingSafeEqual`. Passwords are never returned by any endpoint.
- **Sessions** are 256-bit random tokens stored in `HttpOnly`, `SameSite=Lax` cookies. Only the
  SHA-256 hash is stored in the database, so a database leak does not expose live sessions.
  Sessions expire after 7 days and are revoked on password change, admin reset, or account disable.
- **Google login** verifies the ID token signature against Google's published JWKS, plus issuer,
  audience, expiry and `email_verified`. The server never trusts a client-sent email/role. When no
  `GOOGLE_CLIENT_ID` is set, Google login is disabled and rejected with `503`.
- **CSRF:** every non-GET API request must carry an `Origin` (or `Referer`) matching the request host,
  or an explicit `ALLOWED_ORIGINS` entry. Cross-origin attempts are rejected with `403`.
- **Brute force:** 20 login attempts / IP / 10 min, and 5 failed passwords lock the account for
  15 minutes. Unknown emails approximate the same timing as wrong passwords.
- **Validation:** every input is type-checked, length-capped and validated (email formats, hex colours,
  URL protocols, price/duration bounds, gallery size). Image uploads are limited to real
  PNG/JPEG/WEBP/GIF by magic bytes and served with `X-Content-Type-Options: nosniff`.
- **Headers:** CSP (Google sign-in allowlisted), `X-Frame-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and HSTS in production.
- **Approvals:** `salon_versions` stores an immutable snapshot of each submission. The public site
  reads the latest approved snapshot, so pending/rejected edits cannot leak. A unique partial index
  guarantees only one pending submission per salon. Publishing re-checks approval server-side.
- **Email verification:** 256-bit single-use token, only its hash stored, 24-hour expiry. Verified
  email is required for submitting and publishing (Google accounts are verified by Google).
- **Audit log:** registrations, logins, email verifications, submissions, approval decisions,
  suspensions, salon/service/staff changes, publishes, admin actions and settings edits.

---

## 7. Project layout

```
server/
  index.js          Express app, security middleware, Vite/static serving
  db.js             SQLite schema, serializers, queries, first-boot seed
  security.js       scrypt hashing, session tokens/cookies, rate limit, validators
  middleware.js     Security headers, CSRF, session loading, role/ownership guards
  google.js         Google ID token verification (JWKS)
  workflow.js       Approval state machine, snapshots, publish gating
  migrations.js     Idempotent ALTERs + legacy backfills
  mailer.js         Outbox file mailer + verification/review templates
  subdomain.js      Tenant subdomain parsing + resolution middleware
  availability.js   Pure time-slot generation engine (opening hours → slots)
  routes/
    auth.js         Register / login / Google / verification / session / password
    salon.js        Owner dashboard API (tenant-scoped) + submit/publish
    admin.js        Super admin API + approval review + suspension
    public.js       Approved salon websites, tenant, availability, booking intake
    bookings.js     Public booking intake + owner inbox (tenant-scoped)
    ai.js           AI assist endpoints with deterministic fallbacks
  tests/api.test.js End-to-end API, RBAC, booking & approval-workflow tests
  tests/unit.test.js Subdomain parsing + slot-generation unit tests
src/
  components/auth/       Login, register, route protection
  components/dashboard/  Owner dashboard pages (incl. bookings, approval status & history)
  components/admin/      Super admin console pages
  components/site/       Public salon website renderer + subdomain resolution + booking panel
  hooks/useTenant.ts     Client-side tenant resolution
  hooks/useAvailability.ts Slot loading with retry + graceful fallback
  context/AuthContext.tsx
  lib/api.ts             Fetch wrapper (ApiError, typed methods)
  lib/ai.ts              AI helpers with local fallbacks
data/                    SQLite database + uploads (gitignored)
docs/SUPABASE_RLS.md     RLS policy mapping if the store is ever moved to Postgres
AUDIT.md                 End-to-end gap audit & remediation log
```

---

## 8. Deployment checklist

1. Set a strong `SEED_ADMIN_PASSWORD` (or create the admin interactively) and remove demo accounts.
   Set `APP_URL` so verification links point at your public host, and connect a real mail provider.
2. Set `NODE_ENV=production` so cookies are `Secure`; terminate TLS at your proxy/load balancer.
3. Back up `DATA_DIR` (SQLite file + uploads). WAL mode is enabled for concurrency.
4. Configure `GOOGLE_CLIENT_ID` with your production origin if Google sign-in is required.
5. Keep `ALLOWED_ORIGINS` empty unless a separate trusted frontend domain must send writes.
6. On Vercel: add the wildcard domain `*.beautyzone.app` so tenant subdomains resolve, and set
   `APP_URL`. `vercel.json` already handles the `/api` passthrough and SPA fallback.
7. Optional: set `GEMINI_API_KEY` (and `GEMINI_MODEL`) to enable live AI suggestions. Without it the
   AI endpoints still work, using deterministic local templates.
