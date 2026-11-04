# BeautyZone — Supabase, SQLite migration and Razorpay production activation

This guide is the production handover for PR #7. The application code and database migrations are in the branch, but external merchant/provider credentials and the actual production SQLite file must be supplied by the operator before live activation.

## 1. Set the canonical production URL

1. Open the Vercel project \`beauty-zone\` → **Settings → Domains**.
2. Copy the primary domain that Vercel marks as verified.
3. In Vercel → **Settings → Environment Variables**, set \`APP_URL\` to that exact origin, for example \`https://beauty.example.com\` (no path and no trailing slash).
4. Apply it to **Production**. Add Preview only if the preview environment is used for Auth testing.
5. Redeploy after changing environment variables.

Do not use an expired preview URL or a guessed \`*.vercel.app\` host as the production callback origin.

## 2. Configure Supabase Auth redirects

Open the Supabase project \`beauty-zone-jaipur\` → **Authentication → URL Configuration**.

Set **Site URL** to the exact verified Vercel domain, e.g. \`https://YOUR_VERIFIED_DOMAIN\`.

Add these two exact **Redirect URLs**:

- \`https://YOUR_VERIFIED_DOMAIN/verify-email\`
- \`https://YOUR_VERIFIED_DOMAIN/reset-password\`

For a preview environment, add only its actual preview hostname and the same two paths. Avoid an unrestricted \`*\` redirect.

Open **Authentication → Providers → Email** and keep Email enabled. For production signup, keep email confirmation enabled. The app's verification callback and password recovery flow use the above two paths. The confirmation and recovery messages will not reliably reach users until SMTP is configured in the next step.

## 3. Configure transactional SMTP

Open **Authentication → SMTP Settings** in Supabase and enable custom SMTP. Use credentials from a transactional mail service (for example, Amazon SES, Postmark, Resend, SendGrid or another provider accepted by Supabase).

Enter the provider-issued values:

- SMTP host
- SMTP port (normally provider TLS/STARTTLS setting)
- SMTP username
- SMTP password
- Sender name: \`BeautyZone\`
- Sender email: an address on the verified sending domain, e.g. \`no-reply@YOUR_VERIFIED_DOMAIN\`

At your mail provider, verify the sending domain and publish its exact SPF and DKIM DNS records; add a DMARC policy appropriate to your domain. Do not guess DNS values.

In **Authentication → Email Templates**, inspect the Confirm signup and Reset Password templates. Preserve the Supabase confirmation/recovery action URL variables; do not hard-code a one-time link. Send a test signup and test password-recovery email and verify delivery plus the final landing URL.

Never put SMTP credentials in \`VITE_*\`, frontend code, GitHub, or screenshots.

## 4. Configure customer SMS / Phone OTP

The customer loyalty lookup now requires a verified Supabase phone session. A typed mobile number alone cannot access another person's points or vouchers.

Open **Authentication → Providers → Phone**:

1. Enable Phone authentication.
2. Enable phone signups if new customer identities should be created on first OTP.
3. Select one supported SMS provider and add its provider-issued credentials. Supabase currently documents MessageBird, Twilio, Vonage and TextLocal (community-supported).
4. Configure OTP expiry and request-rate limits within the provider/Supabase limits.
5. Use Indian E.164 phone format, e.g. \`+919876543210\`.
6. Test OTP send and verify using a real phone number.

The current UI uses a six-digit SMS code. Until the Phone provider is enabled and its credentials are saved in the Supabase dashboard, live loyalty OTP sign-in is not available.

## 5. Configure Razorpay (subscription and booking advance payments)

The code uses Razorpay **Orders + Checkout + signed webhooks**. It does not use the manual UPI/bank-reference route for new payment creation.

### Razorpay Dashboard

1. Create/activate the merchant account and complete KYC/bank settlement configuration.
2. Start in **Test Mode**. In **Account & Settings → Payment Capture**, configure automatic capture for successful payments. The application activates plans and booking advances only on a captured payment; an authorised-but-not-captured payment is not treated as paid.
3. Under **Account & Settings → Webhooks**, add this URL:

   \`https://YOUR_VERIFIED_DOMAIN/api/webhooks/razorpay\`

4. Subscribe to at least:
   - \`payment.captured\`
   - \`payment.failed\`

5. Set a strong webhook secret. Copy it once into the server environment below. Keep the Razorpay API secret and webhook secret separate.
6. Send Razorpay's test webhook (or complete a test-mode payment) and confirm the webhook is acknowledged with HTTP 200 and the payment record changes to captured/verified.
7. After testing, generate Live API keys, configure the Live webhook separately, update Production Vercel environment variables, and perform a low-value live transaction before launch.

### Vercel server environment variables

Set these in Vercel → **Settings → Environment Variables** → Production:

- \`RAZORPAY_KEY_ID\` — Razorpay API Key ID
- \`RAZORPAY_KEY_SECRET\` — Razorpay API Key Secret
- \`RAZORPAY_WEBHOOK_SECRET\` — the secret configured for the webhook endpoint
- \`SUPABASE_URL=https://botkjeikjzhnbxnowdkl.supabase.co\`
- \`SUPABASE_PUBLISHABLE_KEY\` — the project's publishable key
- \`SUPABASE_SERVICE_ROLE_KEY\` — service-role/secret database key, **server-side only**
- \`APP_URL\` — canonical production URL

Never use a \`VITE_\` prefix for Razorpay secrets or the Supabase service-role key. Never commit real key values. Redeploy after adding/updating them.

The code supports:
- Salon subscription checkout for Starter / Pro / Elite plans.
- 25% booking advance checkout against a saved booking reference and customer phone.
- Server-side order, amount and currency checks.
- Checkout signature verification plus Razorpay payment fetch.
- Raw-body webhook signature verification.
- Idempotent webhook event records and one-pending-payment constraints.
- Plan activation and booking advance update only after a captured payment is confirmed.

The Admin page deliberately does not manually override a pending Razorpay payment. Razorpay settlement is gateway-controlled. Old offline UPI/manual entries, if any, can still be reconciled through the separate admin workflow.

## 6. Migrate the actual production SQLite database

**Do not run \`--apply\` against a guessed or development database.** First obtain the exact SQLite file from the production host's persistent disk/volume, stop writes or take a consistent SQLite backup, and preserve the original file. Vercel's serverless filesystem is not a reliable place to assume a long-lived SQLite database exists.

The script is at \`scripts/migrate-sqlite-to-supabase.js\`. It uses Node 22's built-in \`node:sqlite\`, opens the source database read-only and defaults to dry-run.

### Prepare a secure migration machine

1. Download/clone this branch to a controlled machine with Node.js 22.
2. Install dependencies with \`npm ci\`.
3. Copy the production SQLite DB to an encrypted/permission-restricted location.
4. Set variables in the local shell (not in Git and not in ChatGPT):
   - \`DATABASE_PATH=/secure/path/beautyzone.db\`
   - \`SUPABASE_URL=https://botkjeikjzhnbxnowdkl.supabase.co\`
   - \`SUPABASE_SERVICE_ROLE_KEY=...\` (secret/service-role key only in this shell)
   - \`APP_URL=https://YOUR_VERIFIED_DOMAIN\`
   - \`MIGRATION_EXPORT_PASSPHRASE=...\` (16+ characters, long random passphrase)

### Dry-run first

Run:

\`\`\`bash
node scripts/migrate-sqlite-to-supabase.js --help
node scripts/migrate-sqlite-to-supabase.js
node scripts/migrate-sqlite-to-supabase.js --export=/secure/backup/beautyzone-pre-migration.enc
\`\`\`

The export is AES-256-GCM encrypted, redacted of password hashes, reset/verification tokens and sessions, created with restrictive file permissions, and will not overwrite an existing path. Keep the passphrase separately from the export.

Review the dry-run source counts and skipped invalid-email users before writing anything. The import requires valid email identities; users with invalid/missing email are reported and not silently attached to another identity.

### Apply after reviewing the report

Once the correct production SQLite file, export and dry-run counts are confirmed:

\`\`\`bash
node scripts/migrate-sqlite-to-supabase.js --apply --send-recovery
\`\`\`

The utility:
- Creates/links Supabase Auth identities by normalized email before inserting owner profiles.
- Preserves the old account ID in \`profiles.legacy_user_id\`.
- Generates stable UUIDs for legacy business rows and maps owner, salon, service, staff, subscription, version, booking, loyalty transaction and voucher references.
- Imports parent tables before dependent tables so PostgreSQL foreign keys remain enforced.
- Uses conflict-safe/idempotent row insertion and then queries Supabase to report found/missing rows.
- Sends password recovery emails for migrated email identities when \`--send-recovery\` is specified. Custom SMTP must already be working.
- Does not copy SQLite password hashes or sessions into Supabase Auth. Users set a new password via the recovery email.
- Reports legacy Google accounts separately; those users must re-link/sign in with the configured Google provider.

The CLI returns non-zero if a table import fails. Fix the reported issue and rerun; the deterministic IDs and conflict-safe inserts make partial runs resumable. Do not delete/disable the legacy SQLite file until row counts, owner isolation, booking totals (paise), loyalty points and approved salon snapshots have been reconciled.

**Important:** this migration is not automatically executed by a Vercel deploy. It must be run explicitly against the actual production SQLite backup by an operator who has the database file and the service-role key.

## 7. Test matrix before switching traffic

- Email signup → confirmation email → \`/verify-email\` → sign-in.
- Forgot password → recovery email → \`/reset-password\` → sign-in.
- Customer phone OTP → live loyalty balance/history → voucher redemption.
- Owner onboarding → services/staff → approval request → admin review → publish.
- Public salon booking → 25% Razorpay advance → signed callback → \`payment.captured\` webhook.
- Owner booking lifecycle → completed → loyalty earn exactly once.
- Salon plan checkout → successful Razorpay capture → subscription activated exactly once.
- Razorpay \`payment.failed\` event → payment remains failed/no activation.
- Invalid webhook signature → HTTP 401 and no database state change.
- Duplicate webhook event → no duplicate subscription activation or booking advance.
- Cross-salon RLS isolation and no draft snapshot exposure.
- Migration dry-run → encrypted export → apply to a staging clone → reconciliation with zero unexpected missing rows.

The CI workflow runs TypeScript, unit/API/migration/payment tests and the production build. CI passing does not substitute for Test Mode checkout, real SMTP/SMS delivery, production DB backfill or a low-value Live Mode transaction.
