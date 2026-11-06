# Salon-owner personal QR payments

Production implementation and delivery guide for the tenant-scoped SalonOS payment module.

## 1. What is implemented

### Owner payment settings

`/dashboard/settings/payments` (alias `/dashboard/payment-settings`) provides:

- PNG/JPEG/WEBP QR upload, preview, replacement, download and deletion.
- Salon VPA, account-holder/business name, optional bank name and customer instructions.
- Explicit activation confirmation and active/inactive status.
- Percentage/fixed advance and remaining-balance policy.
- Optional Razorpay Route linked-account ID and KYC review status.

The salon is resolved from the authenticated session; no owner endpoint accepts a trusted salon ID. QR images are limited to 2 MB and checked for declared/actual image type and basic container integrity. Deleted QR settings deactivate static payments without deleting financial history.

### Customer payment experience

The existing booking checkout, public salon booking, and authenticated appointment details use the salon-specific payment configuration. A direct UPI order includes:

- Correct salon and server-derived amount.
- Owner's uploaded static QR, or a real server-generated UPI QR when no image exists.
- An optional exact-amount dynamic QR.
- QR download and `upi://pay` deep link.
- URL-encoded VPA, payee, exact amount, INR and unique booking reference.
- UPI transaction reference/UTR submission and optional private PNG/JPEG/WEBP proof (2 MB maximum).
- A pending-verification state, never an automatic success state.

The payee configuration is snapshotted when the order is created so replacing a QR/VPA cannot redirect an existing order. Amounts and salon ownership always come from server records.

### Verification and receipts

Static QR claims become `verification_pending`. Only the owning salon can verify after checking its actual bank/UPI history. Verification/rejection stores actor, timestamp, note and append-only audit events. Administrators have monitoring access but cannot attest to a personal bank credit.

Paid HTML/PDF receipts are issued only after verification. `/receipt/:bookingId?token=…` shows the salon branding/address, customer, service, booking and transaction references, amount, method and verified status. Unverified payments have no paid receipt.

### My Payments

`/dashboard/payments` includes:

- Gross verified collection, today, this month and outstanding balances.
- Pending, verified, rejected and refunded counts/amounts.
- Date/status/search filters, CSV export, transaction details, audit history and receipts.
- Owner-only private proof viewing.
- Verification/rejection workflow and refund workflow.

CSV cells are escaped against formula injection. Monetary values are integer paise throughout the server.

### Refunds and cancellations

- Razorpay: the server calls the real provider refund API and records only a valid provider response.
- Direct UPI/cash: the owner must first send the refund, then enter the actual bank/UPI reference and confirm the action. The record explicitly says it is owner-recorded, not automatic bank confirmation.
- Mock payments cannot be refunded because no real money exists.
- Refunds are full-payment refunds and idempotent. Booking cancellation does not falsely imply a refund; the owner performs the refund from the transaction details.

### Optional automatic provider mode

Razorpay Route is supported for verified linked accounts:

- Owner supplies the provider-linked `acc_…` account after external merchant onboarding/KYC.
- Admin records the actual provider-dashboard KYC result with a review note.
- Orders include a full-amount Route transfer to the salon's linked account.
- Existing server-side signature verification, raw-body webhook HMAC, event deduplication and idempotent confirmation are reused.
- Production cannot fall back to the platform's ordinary Razorpay account for salon customer funds.
- Settlement timing and availability remain subject to Razorpay Route rules.

An uploaded static UPI QR is **never** represented as automatically reconciled.

### Admin monitoring

`/admin/payments` shows all configurations, QR activity, provider/KYC state, transactions, missing-proof/stale/paid-cancelled flags, verification history and refunds. Role gates use the existing `super_admin` permission.

## 2. Database migrations

SQLite startup migrations in `server/migrations.js` are additive and preserve existing rows. They add:

- `salon_payment_settings`: `bank_name`, `payment_instructions`, `verification_mode`, `provider_account_id`, `provider_onboarding_status`.
- `payments`: `payment_proof_url`, refunded amount/reference/reason/actor/timestamp.
- `payment_audit_logs`: payment/salon/action/state transition/actor/note/timestamp.
- `payment_refunds`: amount, provider or owner reference, reason, processed/recorded status and actor.
- Salon/status/date indexes and a partial unique index for active UPI references.

Apply the PostgreSQL/RLS parity migration when using Supabase:

```text
supabase/migrations/20261106_salon_owner_qr_payments.sql
```

It adds the same fields/tables/indexes, owner/admin read-only RLS for audit/refunds, and removes direct anonymous reads of payment settings. Public checkout uses the constrained API instead. No customer payment mutation policy is added. The trusted server remains responsible for mutations.

Proof images are not stored in the public upload directory or exposed through a public URL. They are private files under `DATA_DIR/payment-proofs`, streamed only after owner/admin authorization.

## 3. API endpoints

### Public checkout

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/public/payments/config?salon=:slug` | Active salon-safe methods/config |
| POST | `/api/public/payments/orders` | Server-derived advance/balance order |
| GET | `/api/public/payments/orders/:id/upi-qr` | Exact-amount UPI SVG |
| POST | `/api/public/payments/manual/proof?orderId=:id` | Private supporting image; no status change |
| POST | `/api/public/payments/manual/claim` | Submit UTR; always pending verification |
| GET | `/api/public/receipts/:bookingId?token=…` | Verified receipt JSON |
| GET | `/api/public/receipts/:bookingId/pdf?token=…` | Verified PDF |
| POST | `/api/public/payments/razorpay/verify` | Checkout signature verification |
| POST | `/api/public/payments/razorpay/webhook` | Signed, deduplicated webhook |

### Owning salon only

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET/PUT | `/api/salon/payment-settings` | Own configuration; activation confirmation |
| POST | `/api/salon/uploads?kind=payment_qr` | Validated QR image |
| DELETE | `/api/salon/payment-qr` | Delete QR and deactivate |
| GET | `/api/salon/payments` | Own transactions with filters |
| GET | `/api/salon/payments/summary` | Collection/status metrics |
| GET | `/api/salon/payments/details/:id` | Transaction, audit and refunds |
| GET | `/api/salon/payments/export.csv` | Filtered CSV |
| GET | `/api/salon/payments/:id/proof` | Authorized private proof |
| GET | `/api/salon/payments/verification-queue` | Pending claims |
| POST | `/api/salon/payments/:id/verify` | Verify after bank/UPI review |
| POST | `/api/salon/payments/:id/reject` | Reject claim with note |
| POST | `/api/salon/payments/:id/refund` | Provider refund or owner-recorded refund |
| GET | `/api/salon/receipts/:id/pdf` | Own verified receipt |

### Super admin only

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/admin/payment-configurations` | All salon configurations |
| PATCH | `/api/admin/payment-configurations/:salonId` | Record provider KYC review |
| GET | `/api/admin/payments` | Cross-tenant monitoring and flags |
| GET | `/api/admin/payments/details/:id` | Audit/refund history |
| GET | `/api/admin/payments/:id/proof` | Authorized proof review |

`POST /api/admin/payments/:id/verify` intentionally returns `403 OWNER_VERIFICATION_REQUIRED`.

## 4. Files added

- `server/payments/audit.js`
- `server/payments/proofs.js`
- `server/payments/refunds.js`
- `server/tests/qr-payment-production.test.js`
- `src/lib/ownerPayments.ts`
- `src/components/dashboard/PaymentSettingsPage.tsx`
- `src/components/dashboard/MyPaymentsPage.tsx`
- `src/components/admin/AdminPayments.tsx`
- `src/components/customer/ReceiptPage.tsx`
- `supabase/migrations/20261106_salon_owner_qr_payments.sql`
- `docs/SALON_OWNER_PAYMENTS.md`

Modified server routing/schema/settings/service/Razorpay/upload/admin modules; existing booking/payment checkout and appointment history; dashboard/admin navigation and routes; payment API types/tests; package test script and documentation.

## 5. Security verification

- Owner salon is resolved from the server session on every owner request.
- Cross-tenant payment/proof access returns 404; admin routes require the existing admin role.
- Static claims cannot set `paid`, `verified`, amount or salon ID.
- Active duplicate UPI references are checked in the service and by a partial unique index.
- Proof upload does not verify payment and is not publicly readable.
- Receipt issuance remains downstream of actual verification.
- Razorpay secrets stay server-side; webhook signatures use the exact raw body.
- Provider events and payment confirmation are idempotent.
- Production salon gateway orders require a verified linked account transfer.
- Admin users cannot mark personal UPI credits as bank-confirmed.
- Refund processing cannot be forged for mock or manual payments.

## 6. External configuration required

Static personal QR payments need no gateway credentials. The owner must upload the correct QR/VPA and verify credits in their own bank/UPI app.

For automatic mode:

1. Enable Razorpay Route/linked accounts for the platform provider account.
2. Complete each salon merchant's onboarding and KYC in Razorpay.
3. Set server-only `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` and `PAYMENT_MODE=razorpay`.
4. Save the salon `acc_…` ID and record its verified KYC status from the provider dashboard.
5. Configure `payment.captured`, `order.paid`, `payment.failed` and `payment.authorized` webhooks to `/api/public/payments/razorpay/webhook`.
6. Test in Razorpay test mode before enabling live credentials.

Use durable server storage for SQLite and private uploads. The existing Vercel `/tmp` filesystem is ephemeral and is **not** sufficient for production financial records/proofs. Deploy the Node service with a durable volume or complete the documented PostgreSQL/Supabase route migration and use private object storage for proofs.

## 7. Deployment checklist

1. Back up the existing database and uploaded files.
2. Apply `20261106_salon_owner_qr_payments.sql` if Supabase/Postgres is in use.
3. Run `npm ci && npm run verify`.
4. Configure persistent `DATA_DIR` with restricted filesystem permissions and backups.
5. Configure production HTTPS, `APP_URL`, strong non-demo seed credentials and payment provider secrets as applicable.
6. Start with `NODE_ENV=production npm start` after `npm run build`.
7. Verify Salon A/Salon B isolation and one static payment in the deployed environment.
8. For provider mode, verify webhook signatures, duplicate deliveries, linked-account settlement and a small refund in provider test mode.

No migration or PR step in this module deploys or merges automatically.

## 8. Test evidence

The module adds real HTTP integration tests using isolated temporary SQLite databases. They cover QR validation, two-salon configuration, correct payee selection, forged amount/salon fields, private proofs, pending claims, owner-only verification, admin verification denial, audit history, CSV/filtering, refunds, inactive QR deletion and history preservation. Existing tests cover duplicate UTRs, webhooks, signatures, idempotency, booking cancellation/payment states and receipt generation.

Final verification commands and counts are recorded in the pull request. Browser automation is not substituted for these tests; UI type safety, production bundling and route-shell checks run separately. A browser binary is not available in the build sandbox, so final visual/device UAT remains a deployment checklist item.
