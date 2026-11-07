# BeautyZone — Strict RBAC & Super-Admin-Only Approval Workflow

Date: 2026-11-08
Scope: `server/routes/{auth,salon,admin}.js`, `server/workflow.js`, `server/middleware.js`,
`src/lib/roles.js`, `src/context/AuthContext.tsx`, owner dashboard, admin console,
new Supabase migration, new regression suite.

## The flaw

A salon owner could make their own website live without any platform review:

1. `POST /api/salon/publish` was mounted inside the **salon owner** router
   (`server/routes/salon.js`). Any authenticated `salon_owner` could call it and the handler wrote
   `website_published = 1` directly. The `canPublish` check inside `workflowInfo()` was computed for
   the *caller*, so the owner's own submission satisfied it.
2. `POST /api/salon/unpublish` had the same problem (and was mounted twice).
3. `POST /api/admin/approvals/:id/review` was guarded by `requireRole('super_admin', 'admin')`, so an
   operational `admin` could approve a submission, and `reviewSubmission()` accepted any `adminId`
   passed to it — it never verified the reviewer's role or that the reviewer did not own the salon.
4. In the database, `guard_salon_workflow_fields()` only compared NEW vs OLD values. Because it had to
   be permissive for content edits, the owner UPDATE policy (`salons_owner_update`) let a direct
   PostgREST call change `status`/`website_published`, and `salon_versions_owner_insert` accepted a
   version with any status.

Net effect: the "Draft → Pending → Approved" lifecycle was advisory, not enforced.

## The fix

### 1. Separate Super Admin portal (`role = 'super_admin'`)

- New front door `GET /admin/login` → `src/components/auth/AdminLoginPage.tsx`. Dark, unlinked,
  signup-free, and it never renders owner registration or Google signup.
- New API endpoints:
  - `POST /api/auth/admin/login` — email/password for administrator accounts (403 `WRONG_PORTAL`
    for a salon owner).
  - `POST /api/auth/admin/supabase-session` — Supabase token bridge that refuses non-admins.
  - `POST /api/auth/owner/supabase-session` — owner bridge that refuses administrators.
  - `GET /api/auth/portal` — tells the UI which front door an account belongs to.
- `POST /api/auth/login` (owner portal) and `POST /api/auth/google` now refuse `super_admin`/`admin`
  with `403 WRONG_PORTAL` **before creating a session**, so an admin cookie can never be minted by the
  owner login form. The Supabase bridges also drop the browser token on rejection.
- `vercel.json` and the SPA route table include `/admin/login`, and it is marked `noindex`.

### 2. Owner dashboard restrictions

- `POST /api/salon/publish` and `/api/salon/unpublish` **removed**; both now return
  `403 SELF_APPROVAL_FORBIDDEN` so old clients fail loudly instead of silently succeeding.
- `workflowInfo()` always reports `canPublish: false` to the owner, plus explicit `websiteStatus`
  (`draft` | `pending_approval` | `approved`) and `isLive`.
- UI: `WorkflowActions` renders exactly one action — **Submit for review** (Draft → Pending). The
  Publish/Unpublish buttons are gone. The Approvals page now shows a read-only "Who can do what"
  three-state explainer instead of any approve control.
- Dashboard copy no longer claims the owner publishes ("Approved — publishing by platform").

### 3. Approval workflow (super admin only)

- `requireSuperAdmin` added to: `GET /api/admin/approvals`, `GET /api/admin/approvals/:id`,
  `POST /api/admin/approvals/:id/review`, and the new `POST /api/admin/salons/:id/publish` /
  `/unpublish`.
- `reviewSubmission()` re-checks `reviewer.role === 'super_admin'`, requires `adminId === reviewer.id`,
  and rejects a reviewer whose id equals `salons.owner_id` (an owner can never review their own salon
  even if their role is wrong).
- New `publishSalon()` / `unpublishSalon()` in `server/workflow.js` are the **only** writers of
  `website_published = 1`, and both re-verify the role and the `status = 'approved'` precondition
  plus an approved snapshot. Approving alone no longer publishes.
- `PATCH /api/admin/salons/:id` with `published` or `suspended` is now super-admin-only too.
- `hasLiveApproval()` requires suspension=false, an approved snapshot, and a review status that is
  not rejected/changes-requested. `server/supabase-store.js` no longer accepts `pending` as a public
  state.
- The admin console offers **Approve & publish**, **Approve only**, Request changes and Reject, and
  can publish an already-approved version. Operational admins see a read-only notice and disabled
  controls.

### 4. Database permissions

New migration `supabase/migrations/20261107_beautyzone_strict_approval_rbac.sql`:

- `salons.website_status` (`draft` | `pending_approval` | `approved`) with a backfill + CHECK.
- `salons_published_requires_approval` CHECK: `website_published` implies an approved review state.
- Rewritten `guard_salon_workflow_fields()`: deny-by-default. A non-privileged (owner) session may
  only perform **Draft → Pending Approval**; any other workflow-field change raises
  `insufficient_privilege`. Privileged (service_role / super admin) writes reconcile `website_status`.
- Rewritten `guard_salon_version_state()`: an owner may only INSERT a `pending` version for their own
  salon, cannot claim a review, and may never UPDATE/DELETE review history. Dropped
  `salon_versions_owner_delete`.
- Public `SELECT` policy now requires `website_published AND website_status = 'approved' AND
  status = 'approved' AND NOT suspended`.
- New `private.is_salon_owner_of(uuid)` and `private.is_operational_admin()` helpers.

## Verification

- `npm test` — **218 tests, 217 pass, 0 fail** (1 pre-existing skip in the runner), including the new
  `server/tests/approval-rbac.test.js` (17 tests) which asserts, against a real server and SQLite DB:
  portal isolation both ways, no session issued on rejection, owner publish/unpublish → 403,
  owner blocked from every `/api/admin/*` route, owner attempts to force `status`/`published` via
  `PATCH /api/salon` are inert, the full Draft → Pending → Approved → Published sequence, and that an
  operational `admin` can read the console but cannot approve/publish/suspend.
- `npx tsc --noEmit` clean; `npm run build` succeeds.
- Live HTTP checks against the running server confirmed: owner self-publish 403, owner approval queue
  403, admin unpublish → public 404 → admin publish → public 200, `/admin/login` serves the SPA.

## Deployment notes

1. Apply `supabase/migrations/20261107_beautyzone_admin_login_rbac.sql` (if not already) and then
   `20261107_beautyzone_strict_approval_rbac.sql` in the Supabase SQL Editor as `postgres`.
2. Existing live salons are backfilled to `website_status = 'approved'` because they already have an
   approved snapshot; nothing goes offline.
3. Administrator accounts are provisioned out of band only: `SUPER_ADMIN_EMAILS` (server env) or
   `select private.bootstrap_super_admin('email@example.com');`. There is no self-service super admin
   signup.
