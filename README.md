# BeautyZone — White-Label Salon Websites with Authentication & RBAC

A full-stack salon website platform. Salon owners sign up, build their salon website, manage
services / prices / staff / gallery, and publish a unique public URL. A super admin console manages
every user, salon, subscription and platform setting. Visitors browse published salon websites
without logging in.

The original luxury salon showcase remains the public marketing homepage at `/`.

---

## 1. Roles & permissions

| Capability | Super admin | Salon owner | Public visitor |
| --- | :---: | :---: | :---: |
| Browse marketing site | ✅ | ✅ | ✅ |
| Open a **published** salon website (`/salon/:slug`) | ✅ | ✅ | ✅ |
| Register / sign in (email + password or Google) | ✅ | ✅ | — |
| Edit own salon profile, logo, gallery, contact details | — | ✅ | — |
| Add / edit / delete own services, prices, staff | — | ✅ | — |
| Preview own draft website | — | ✅ | — |
| Publish / unpublish own website | — | ✅ | — |
| View own subscription | — | ✅ | — |
| List / create / disable users, change roles | ✅ | — | — |
| View every salon, force publish / unpublish | ✅ | — | — |
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
npm run test:api    # boots a real server on a temp DB and runs 21 API tests
npm run lint        # TypeScript check
```

The suite covers login lockout semantics, role gates, registration hardening, tenant isolation,
publish/unpublish visibility, CSRF blocking, admin self-protection, password rotation and more.

---

## 4. User flows

### Salon owner
1. `/register` — create an account (always provisioned as `salon_owner`; the client cannot choose a
   role). Google sign-in is available when `GOOGLE_CLIENT_ID` is configured.
2. `/dashboard/onboarding` — salon name, unique website slug, contact + address. Slugs are validated
   for format, reserved words and uniqueness; the API returns `409` on collision.
3. `/dashboard` — overview, setup checklist, publish status.
4. `/dashboard/website` — brand identity, logo/cover upload, gallery, contact details, hero copy,
   theme colours, slug and publish/unpublish controls.
5. `/dashboard/services` — full CRUD for services (price in paise server-side, duration bounds).
6. `/dashboard/staff` — full CRUD for team members, photo upload, specialties.
7. `/dashboard/preview` — exactly the public rendering, private to the owner.
8. `/dashboard/billing` — plan, status, renewal date (managed by the platform admin).
9. `/dashboard/account` — password change and “sign out everywhere”.

### Super admin
`/admin` — platform stats; `/admin/users` — create/disable accounts, change roles, reset passwords;
`/admin/salons` — inspect any salon, publish/unpublish on behalf of an owner; `/admin/subscriptions` —
change plan/status/period or extend 30 days; `/admin/settings` — registration toggle, trial length,
default plan, support email, maintenance message, audit log.

### Public visitor
`/salon/:slug` renders only salons with `website_published = 1`. Unpublished or unknown slugs return
the same 404 page, so drafts never leak. Inactive services and staff are filtered out.

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

### Owner (`/api/salon`) — `salon_owner` only
`GET /`, `POST /onboarding`, `PATCH /`, `POST /publish`, `POST /unpublish`, `GET /subscription`,
`GET|POST /services`, `PATCH|DELETE /services/:id`, `GET|POST /staff`, `PATCH|DELETE /staff/:id`,
`POST /uploads?kind=logo|cover|gallery|staff` (raw image body, max 5 MB).

### Admin (`/api/admin`) — `super_admin` only
`GET /overview`, `GET|POST /users`, `PATCH /users/:id`, `POST /users/:id/reset-password`,
`GET /salons`, `GET|PATCH /salons/:id`, `GET /subscriptions`, `PATCH /subscriptions/:id`,
`GET|PATCH /settings`, `GET /audit-logs`.

### Public (`/api/public`) — no login
`GET /salons` (published only), `GET /salons/:slug`, `GET /slug-available?slug=…`.

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
- **Audit log:** registrations, logins, salon/service/staff changes, publishes, admin actions and
  settings edits are recorded with actor, target, IP and timestamp.

---

## 7. Project layout

```
server/
  index.js          Express app, security middleware, Vite/static serving
  db.js             SQLite schema, serializers, queries, first-boot seed
  security.js       scrypt hashing, session tokens/cookies, rate limit, validators
  middleware.js     Security headers, CSRF, session loading, role/ownership guards
  google.js         Google ID token verification (JWKS)
  routes/
    auth.js         Register / login / Google / session / password
    salon.js        Owner dashboard API (tenant-scoped)
    admin.js        Super admin API
    public.js       Published salon websites
  tests/api.test.js End-to-end API + RBAC tests
src/
  components/auth/       Login, register, route protection
  components/dashboard/  Owner dashboard pages
  components/admin/      Super admin console pages
  components/site/       Public salon website renderer
  context/AuthContext.tsx
  lib/api.ts
data/                    SQLite database + uploads (gitignored)
```

---

## 8. Deployment checklist

1. Set a strong `SEED_ADMIN_PASSWORD` (or create the admin interactively) and remove demo accounts.
2. Set `NODE_ENV=production` so cookies are `Secure`; terminate TLS at your proxy/load balancer.
3. Back up `DATA_DIR` (SQLite file + uploads). WAL mode is enabled for concurrency.
4. Configure `GOOGLE_CLIENT_ID` with your production origin if Google sign-in is required.
5. Keep `ALLOWED_ORIGINS` empty unless a separate trusted frontend domain must send writes.
