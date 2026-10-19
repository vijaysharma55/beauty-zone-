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
npm run test:api    # boots a real server on a temp DB and runs 34 API tests
npm run lint        # TypeScript check
```

The suite covers the full approval lifecycle (email verification, submit, request changes, resubmit,
approve, publish, rejected sites, suspension), snapshot isolation for unapproved edits, role gates,
tenant isolation, CSRF blocking, admin self-protection, password rotation and more.

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
7. `/dashboard/staff` — full CRUD for team members, photo upload, specialties.
8. `/dashboard/preview` — the current draft rendering, private to the owner.
9. `/dashboard/billing` — plan, status, renewal date (managed by the platform admin).
10. `/dashboard/account` — password change and “sign out everywhere”.

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
`POST /uploads?kind=logo|cover|gallery|staff` (raw image body, max 5 MB).

### Admin (`/api/admin`) — `super_admin` only
`GET /overview`, `GET /approvals`, `GET /approvals/:versionId`,
`POST /approvals/:versionId/review` (`approve` | `reject` | `request_changes`),
`GET /salons/:salonId/versions`,
`GET|POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`,
`GET /salons`, `GET|PATCH /salons/:id`, `GET /subscriptions`, `PATCH /subscriptions/:id`,
`GET|PATCH /settings`, `GET /audit-logs`.

### Public (`/api/public`) — no login
`GET /salons` (live only), `GET /salons/:slug` (approved snapshot only), `GET /slug-available?slug=…`,
`GET /templates`.

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
  routes/
    auth.js         Register / login / Google / verification / session / password
    salon.js        Owner dashboard API (tenant-scoped) + submit/publish
    admin.js        Super admin API + approval review + suspension
    public.js       Approved salon websites only
  tests/api.test.js End-to-end API, RBAC & approval-workflow tests
src/
  components/auth/       Login, register, route protection
  components/dashboard/  Owner dashboard pages (incl. approval status & history)
  components/admin/      Super admin console pages
  components/site/       Public salon website renderer
  context/AuthContext.tsx
  lib/api.ts
data/                    SQLite database + uploads (gitignored)
```

---

## 8. Deployment checklist

1. Set a strong `SEED_ADMIN_PASSWORD` (or create the admin interactively) and remove demo accounts.
   Set `APP_URL` so verification links point at your public host, and connect a real mail provider.
2. Set `NODE_ENV=production` so cookies are `Secure`; terminate TLS at your proxy/load balancer.
3. Back up `DATA_DIR` (SQLite file + uploads). WAL mode is enabled for concurrency.
4. Configure `GOOGLE_CLIENT_ID` with your production origin if Google sign-in is required.
5. Keep `ALLOWED_ORIGINS` empty unless a separate trusted frontend domain must send writes.
