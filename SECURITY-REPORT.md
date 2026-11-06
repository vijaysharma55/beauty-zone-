# BeautyZone — Security Report

Date: 2026-11-06  
Review type: repository/source review, production HTTP header inspection, Supabase schema/RLS metadata and security advisor review.

## Critical findings

### SEC-01 — Production demo credential bypass (P0)

Original login code used predictable seed credentials for admin and owner accounts, and special-cased those credentials as successful without normal password verification. It also auto-provisioned missing demo identities. In production this could create or authenticate a seeded super-admin identity.

**Fix in audit branch:** reject default/configured seed identities and generated synthetic Jaipur demo-owner addresses before the local DB lookup when NODE_ENV=production or VERCEL=1; demo auth/provisioning only runs outside production. Regression test covers default admin, owner and synthetic owner addresses.

### SEC-02 — Local role escalation in Supabase bridge (P0)

Original code accepted a local SQLite super_admin role when the verified Supabase profile was only salon_owner. This lets a local/seeded role supersede the identity provider's authorization record.

**Fix in audit branch:** Supabase profile role is the sole authorization source. Bridge verifies email confirmation, profile active status and email equality before issuing the local session. Local SQLite role is never used to elevate a profile.

## Other findings

| Risk | Finding | Required action |
|---|---|---|
| High | Local sessions stored in ephemeral SQLite on Vercel. | Move session persistence to shared durable store or use a verified token strategy. |
| High | Rate limit uses process-local Map. | Use shared atomic rate limiting across instances. |
| High | Server-only SUPABASE_SECRET_KEY absent from production Vercel config. | Configure through Vercel encrypted environment variable; never VITE-prefixed. |
| High | Razorpay credentials absent; payment endpoint unavailable. | Configure provider secrets and webhook signature secret. |
| High | Legacy email delivery writes outbox files and logs email contents. | Configure real transactional email provider; redact tokens and addresses from logs. |
| Medium | CSP permits unsafe-inline, unsafe-eval and broad HTTPS sources. | Move to CSP Report-Only, collect reports, then enforce a source-specific policy. |
| Medium | CSRF middleware accepts requests with malformed Origin/Referer by calling next(). | Reject malformed origin headers for unsafe methods; validate against exact allowed origins. |
| Medium | CSRF allowlist includes broad Google-related suffixes. | Reduce to explicitly required app origins. |
| Medium | No lockfile/dependency audit in CI. | Commit lockfile, use npm ci, add npm audit/SCA with exception policy. |

## Headers observed on production

- Content-Security-Policy: present but overly permissive.
- Strict-Transport-Security: present.
- X-Content-Type-Options: nosniff.
- Referrer-Policy: strict-origin-when-cross-origin.
- Permissions-Policy: present.
- X-XSS-Protection: 0 (modern safe setting; not a mitigation).
- CSP includes frame-ancestors restrictions; no X-Frame-Options header observed.

## Supabase security

Connected project Security Advisor returned zero security lints on 2026-11-06. RLS was enabled on all listed public tables. Loyalty RPCs were previously split between private SECURITY DEFINER functions and public SECURITY INVOKER wrappers; anon has no execution permission for loyalty RPCs, and award/release routines are service_role-only. Supabase core transactional tables currently report zero rows. This does not mean the whole application is secure: SQLite/API controls and the split data architecture remain in scope.

## Credential and environment rules

- Browser may receive only the Supabase publishable key.
- Supabase secret/service_role key must remain server-only.
- Razorpay key secret and webhook secret remain server-only.
- Do not log reset tokens, OTPs, full payment instrument data or secret headers.
- No production credential values were copied into source or reports.

## Remaining security verification

Real owner/admin login tests against active production identities, token expiry and revocation, cross-tenant API tests on PostgreSQL, file-upload abuse tests, CSP violation review, automated dependency scan and a full authorization review of every API route remain necessary before production security sign-off.