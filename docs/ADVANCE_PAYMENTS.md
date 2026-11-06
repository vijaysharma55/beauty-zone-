# Salon-owner-controlled advance payments

This document describes the owner-configurable advance payment system, the
payment/booking status flow, manual UPI verification, receipts and the security
model. It extends [`PAYMENTS.md`](./PAYMENTS.md) (mock + Razorpay checkout).

---

## 1. What the salon owner controls

Every salon owner gets a **Payments** area in their dashboard backed by these
APIs (all tenant-scoped to the session's salon):

| Endpoint | Purpose |
| --- | --- |
| `GET/PUT /api/salon/payment-settings` | Enable/disable advance, percentage **or** fixed ₹ amount, custom values, balance policy, disabled-booking policy |
| `GET/PUT /api/salon/payment-methods` | Toggle UPI / PhonePe / Google Pay / Paytm / other UPI / cards / net banking / wallets; set UPI ID, display name, upload/replace QR |
| `GET /api/salon/payments` | Transaction ledger (advance received, balances, status) |
| `GET /api/salon/payments/summary` | Headline totals |
| `GET /api/salon/payments/verification-queue` | Manual UPI claims awaiting review |
| `POST /api/salon/payments/:id/verify` / `reject` | Authorize or reject a claimed UPI transfer |
| `GET /api/salon/bookings/:id/receipts`, `GET /api/salon/receipts/:id/pdf` | Receipts |
| `GET/POST /api/salon/bookings/:id/whatsapp[/retry]` | Notification log + retry |
| `POST /api/salon/bookings/:id/collect-balance` | Record balance collected at the salon |

Per-service overrides are set on the service itself (`advanceMode`:
`inherit | percent | fixed | none`, plus `advancePercent` / `advanceFixedPaise`).

### Advance calculation (server-side only)

`server/payments/salon-settings.js → resolveAdvanceForBooking()`:

1. Load the salon's settings (falls back to platform defaults until saved).
2. If the salon advance is **disabled**, no advance is due (the disabled-booking
   policy decides whether bookings are still accepted).
3. Apply a per-service override if present (`none` waives the advance).
4. Percentage: `round(total × percent / 100)`; fixed: the exact ₹ amount.
5. The result is always **> ₹0** when configured and **never exceeds the total**
   (a fixed amount larger than the total is clamped to the total).

Example: total ₹1,000, salon fixed advance ₹200 → pay now ₹200, balance ₹800.

The browser never chooses the advance. `POST /api/public/bookings` recomputes it
from the published service price + salon settings and ignores any client-supplied
`advancePaise`, `advancePaid`, `amountPaise` or `status`.

---

## 2. Status flow

```
select salon/service/date/time
        │  server computes total + advance from salon settings
        ▼
booking = pending_payment            (payment_status = pending)
        │  customer picks an enabled method
        ▼
gateway (Razorpay/mock)  OR  manual UPI QR
        │                          │
        │                          ▼  customer submits UTR ("I have paid")
        │                  booking = payment_verification_pending
        │                  (payment_status = verification_pending)
        │                          │  salon owner verifies the bank credit
        ▼                          ▼
server verifies amount + currency + booking + transaction
        ▼
booking = confirmed                  (payment_status = advance_paid / paid)
        ▼
receipt issued  →  WhatsApp confirmation + receipt
```

Booking statuses: `requested`, `pending_payment`, `payment_verification_pending`,
`payment_failed`, `confirmed`, `advance_paid`, `completed`, `cancelled`,
`declined`, `expired`.

Payment statuses: `not_required`, `pending`, `verification_pending`,
`advance_paid`, `paid`, `failed`, `cancelled`, `refunded`.

A failed gateway payment moves the booking to `payment_failed` (retryable). A
rejected manual claim also returns it to `payment_failed`. Nothing confirms a
booking before a verified payment.

---

## 3. Payment channels

- **Gateway (Razorpay / mock):** used when the platform provider is configured
  and the owner left "online gateway" enabled. Cards, net banking, wallets and
  UPI apps all route through the gateway. Raw card data is never collected.
- **Manual UPI QR:** the owner enables direct UPI and adds their UPI ID (+ an
  optional uploaded QR). Checkout shows the uploaded QR **or** a server-generated
  dynamic QR (`GET /api/public/payments/orders/:id/upi-qr`) and a `upi://pay`
  link carrying the exact amount + booking reference.

> A scanned QR or an "I have paid" click **never** confirms a booking. The
> customer submits the UPI transaction reference (UTR); the booking stays
> `payment_verification_pending` until the salon owner verifies the credit
> (`POST /api/salon/payments/:id/verify`) or a supported gateway callback
> confirms it. The same UTR cannot back two payments.

If an advance is required but the salon has **no** usable channel, booking
creation fails closed with `503 PAYMENT_UNAVAILABLE` — payment is never silently
bypassed.

---

## 4. Receipts

`server/payments/receipts.js` issues exactly one receipt per verified payment
(unique `payment_id`). Each carries a random capability token used in the public
link `/receipt/<bookingId>?token=…` and the WhatsApp button.

- `GET /api/public/receipts/:bookingId?token=…` — receipt JSON
- `GET /api/public/receipts/:bookingId/pdf?token=…` — downloadable PDF
- `POST /api/public/receipts/:bookingId/whatsapp` — re-send on WhatsApp

The PDF is generated server-side with no external dependency
(`server/payments/pdf.js`), embeds a local JPEG logo when present, and shows the
salon branding, customer, booking, amounts, method, transaction reference,
receipt number and issue date. Owners/admins download receipts without a token
through authenticated endpoints.

---

## 5. Security model

- Amounts, currency, salon id, booking id and transaction id are validated
  server-side before any confirmation (`assertPaymentAmounts`, signature checks).
- Frontend payment-success flags are never trusted.
- Razorpay checkout uses HMAC signature verification (+ optional payment API
  cross-check); webhooks are signature-verified and deduplicated per event id.
- `confirmBookingPayment()` runs in a single `BEGIN IMMEDIATE` transaction and is
  idempotent, so retries/double clicks/webhook replays never double-process.
- A unique partial index prevents two confirmed bookings owning the same slot.
- Payment secrets stay server-side; only the public Razorpay `key_id` reaches
  the browser. Mock mode is hard-blocked when `NODE_ENV=production`.

---

## 6. Database

SQLite (runtime) — see `server/db.js` + `server/migrations.js`:

- `salon_payment_settings` (one row per salon)
- `services.advance_mode / advance_percent / advance_fixed_paise`
- `payments.provider` += `manual_upi`, `payments.status` += `verification_pending`,
  plus `kind`, `manual_reference`, `customer_note`, `claimed_at`, `verified_by`,
  `verification_note`
- `bookings.status` += `payment_verification_pending`, `payment_failed`;
  `bookings.balance_policy`, `bookings.payment_method`; legacy `unpaid` → `pending`
- `payment_receipts`, `whatsapp_notifications`
- `users.date_of_birth`

Supabase (Postgres) parity migration:
`supabase/migrations/20261104_beautyzone_advance_payments_dob.sql`.

---

## 7. Tests

```bash
npm run test:unit     # includes advance-unit.test.js (maths, settings, DOB, UPI, PDF, WhatsApp template)
npm run test:owner    # owner-payments.test.js (E2E: fixed/percent, manual UPI, receipts, WhatsApp stub, DOB)
npm test              # full suite
```
