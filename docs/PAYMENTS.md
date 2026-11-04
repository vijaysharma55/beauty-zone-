# Booking payments — mock test mode & Razorpay

This document covers the booking checkout: how it protects confirmations, how to
run the full test-mode (mock) payment flow locally, the documented test
instruments, and how to switch to Razorpay test mode.

---

## 1. How the flow works

```
choose salon / service / date / time
              │
              ▼
POST /api/public/bookings          ← server computes total + advance from the
              │                       salon's published price and
              ▼                       PAYMENT_ADVANCE_PERCENT
   booking created as `pending_payment`
   (payment_status = pending, no confirmed_at)
              │
              ▼
POST /api/public/payments/orders   ← server creates a mock order (or a Razorpay
              │                       order) for the advance amount
              ▼
   mock checkout / Razorpay Checkout
              │
              ▼
server-side verification
   • mock: the transaction ID must exist in `mock_transactions`, belong to this
     order and the amounts/currency must match
   • Razorpay: HMAC-SHA256 signature + (optional) payment API cross-check
   • webhook: HMAC-SHA256 of the raw body, deduplicated per event id
              │
              ▼
   booking → `confirmed`, payment_status → `advance_paid`, advance_ref set
```

Only after that step does `GET /api/public/bookings/:id/confirmation` return
calendar links and notification details. The UI keeps the calendar buttons
disabled until the server confirms.

Failures, cancellations and pending payments **never** confirm a booking. The
slot is held for `PAYMENT_HOLD_MINUTES` (default 30) and then released
(`status = expired`) so a stale hold cannot block a real customer.

### Status model

| Booking status | Meaning |
| --- | --- |
| `requested` | No advance configured; the salon confirms manually. |
| `pending_payment` | Advance due. The slot is held, calendar locked. |
| `confirmed` | Payment verified (or manually confirmed for a paid/no-advance booking). |
| `advance_paid` `/ `completed` | Confirmed / finished (kept for compatibility). |
| `cancelled` / `declined` / `expired` | Not honoured; payment never processed. |

`bookings.payment_status`: `not_required` → `pending` → `verification_pending`/`failed`/`cancelled` → `advance_paid` (`paid` for a 100% advance).

> **Owner-controlled advances:** the advance percentage above is only the platform
> default. Each salon owner overrides it (percentage / fixed ₹ / per-service) from
> their dashboard, and can enable direct UPI QR payments with owner verification.
> See [`ADVANCE_PAYMENTS.md`](./ADVANCE_PAYMENTS.md) and [`WHATSAPP.md`](./WHATSAPP.md).

---

## 2. Run the mock checkout locally

```bash
cp .env.example .env          # PAYMENT_MODE=mock is already the default
npm install
npm run dev                   # http://localhost:3000
```

Mock mode is the default when `NODE_ENV` is not `production`, so no credentials
are needed. The startup banner prints:

```
Payments: MOCK test mode (no real money will be charged)
  Test UPI IDs: success@mockupi · failure@mockupi · pending@mockupi
```

Open the booking section, pick a service/date/time, press **Pay … & Confirm**,
and the checkout opens with a `TEST MODE — No real money will be charged.`
banner.

You can also drive it entirely from the API:

```bash
# 1. create the booking (server decides the advance)
curl -s localhost:3000/api/public/bookings \
  -H 'Content-Type: application/json' -H 'X-Requested-With: beautyzone' \
  -d '{"slug":"lumina-luxe","fullName":"Test Client","phone":"9000011111",
       "service":"HydraFacial Glow Ritual","date":"2026-12-01","time":"12:00"}'

# 2. create the payment order for that booking id
curl -s localhost:3000/api/public/payments/orders \
  -H 'Content-Type: application/json' -H 'X-Requested-With: beautyzone' \
  -d '{"bookingId":"<BOOKING_ID>"}'

# 3. simulate the mock gateway (returns the server-issued transaction id)
curl -s localhost:3000/api/public/payments/mock/checkout \
  -H 'Content-Type: application/json' -H 'X-Requested-With: beautyzone' \
  -d '{"orderId":"<PAYMENT_ID>","method":"upi","upiId":"success@mockupi"}'

# 4. verify the mock transaction — this is what confirms the booking
curl -s localhost:3000/api/public/payments/mock/complete \
  -H 'Content-Type: application/json' -H 'X-Requested-With: beautyzone' \
  -d '{"orderId":"<PAYMENT_ID>","transactionId":"MOCKTXN-…","amountPaise":124975,"currency":"INR"}'
```

---

## 3. Test instruments

> These are **mock identifiers only**. No UPI app, card network, bank or wallet
> is contacted, and no real money moves. Never treat them as real payment
> addresses.

### UPI IDs

| Test UPI ID | Result |
| --- | --- |
| `success@mockupi` | Successful payment → booking confirmed |
| `failure@mockupi` | Failed payment → booking stays `pending_payment` |
| `pending@mockupi` | Pending payment → booking stays `pending_payment` |
| `cancel@mockupi` | Cancelled payment → booking stays `pending_payment` |

Any other UPI ID (including real VPAs) is rejected with `400` so a client cannot
accidentally trigger a real-looking success.

### Cards

| Card number | Result |
| --- | --- |
| `4111111111111111` | Success |
| `4000000000000002` | Failure |
| `4000000000000006` | Pending |

### Net banking / wallets

Codes `test_success`, `test_failure`, `test_pending` for both channels.

The checkout screen exposes a **Test payment result** selector (Success /
Failure / Pending / Cancel) that pre-fills the matching instrument. The server
still derives the outcome from the instrument: sending
`requestedOutcome: "success"` with `failure@mockupi` returns
`409 MOCK_OUTCOME_MISMATCH`.

---

## 4. API reference

Mounted at **both** `/api/public/payments` and `/api/payments`.

| Method & path | Purpose |
| --- | --- |
| `GET /config` | Public, secret-free config: mode, advance %, hold time, test instruments. |
| `POST /orders` | Create the server-side order for a `pending_payment` booking. |
| `GET /orders/:id` | Latest payment + booking state (poll a pending payment). |
| `POST /mock/checkout` | Mock authorisation → returns `transactionId` + outcome. |
| `POST /mock/complete` | Verify the mock transaction and confirm the booking. |
| `POST /mock/cancel` | Cancel an unpaid mock order (never confirms). |
| `POST /razorpay/verify` | Verify Razorpay Checkout signature and confirm. |
| `POST /razorpay/webhook` | Signature-verified, idempotent gateway webhook. |

Booking status helpers:

| Method & path | Purpose |
| --- | --- |
| `GET /api/public/bookings/:id` | Public status (no name/phone/address). |
| `GET /api/public/bookings/:id/confirmation` | `409 PAYMENT_REQUIRED` until confirmed; then calendar + notification payload. |

### Error codes

`PAYMENT_UNAVAILABLE`, `BOOKING_NOT_PAYABLE`, `BOOKING_ALREADY_CONFIRMED`,
`NO_PAYMENT_REQUIRED`, `PAYMENT_NOT_FOUND`, `MOCK_PAYMENT_DISABLED`,
`INVALID_MOCK_TRANSACTION`, `MOCK_TRANSACTION_USED`, `MOCK_OUTCOME_MISMATCH`,
`AMOUNT_MISMATCH`, `CURRENCY_MISMATCH`, `SIGNATURE_MISMATCH`,
`RAZORPAY_NOT_CONFIGURED`, `INVALID_SIGNATURE`, `WEBHOOK_NOT_CONFIGURED`,
`PAYMENT_REQUIRED` (owner tries to confirm an unpaid booking).

---

## 5. Security guarantees

- The browser never sends a trusted amount, status or success flag. The booking
  amount comes from the salon's approved price snapshot; the advance comes from
  `PAYMENT_ADVANCE_PERCENT`.
- Client-supplied `status`, `paymentStatus`, `advancePaid` and `advanceRef` are
  ignored by `POST /api/public/bookings`.
- A mock success exists only if the transaction ID is in the server-side
  `mock_transactions` ledger for that exact order, with matching amount and
  currency.
- Confirming a payment is transactional and idempotent: an already-paid payment
  returns the existing booking, and a second confirmed booking for the same
  salon/date/time is refused (`requiresReview`, never double-confirmed).
- Webhooks are recorded per event id; a replay is acknowledged with
  `duplicate: true` without touching the booking. Amount/currency/order
  tampering is recorded as `rejected`.
- Owner-side status updates can decline/cancel an unpaid booking but cannot
  confirm one (`409 PAYMENT_REQUIRED`).
- Razorpay secrets (`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`) are only
  read server-side; the browser receives `RAZORPAY_KEY_ID` and an order id.

---

## 6. Switch to Razorpay test mode

1. Create a Razorpay account and generate **Test mode** API keys
   (`Dashboard → Settings → API Keys`).
2. Set the environment:

   ```bash
   NODE_ENV=development
   PAYMENT_MODE=razorpay
   PAYMENT_ADVANCE_PERCENT=25
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
   RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx     # optional locally
   ```

3. Restart. The checkout now opens Razorpay Checkout for the server-created
   order; the button reads **Pay ₹X with Razorpay** and no test banner is shown.
4. Add a webhook pointing at `https://<your-host>/api/public/payments/razorpay/webhook`
   with the `payment.captured` and `order.paid` events, using the same
   `RAZORPAY_WEBHOOK_SECRET`. The route needs the raw body (already wired), so
   it works behind Vercel or a reverse proxy without extra config.
5. Use Razorpay's test cards / test UPI IDs from their dashboard to complete a
   test payment; the booking confirms only after signature verification.

### Production rules

- `NODE_ENV=production` **blocks mock mode** (`GET /config` reports `mode:
  disabled`, every `/mock/*` call answers `403 MOCK_PAYMENT_DISABLED`).
- Production therefore requires `PAYMENT_MODE=razorpay` plus valid
  `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` for online payments.
- If you intentionally run a deployment without a payment provider, set
  `PAYMENT_REQUIRE_ADVANCE=false`: bookings are then created as `requested`
  ("pay at the salon") and can be confirmed by the owner. Set it to `true` if
  you prefer bookings to fail closed instead.

---

## 7. Tests

```bash
npm run test:payments   # 13 end-to-end payment tests (boots three servers)
npm run test:unit       # includes the payment unit tests
npm run test            # everything
npm run verify          # tsc + all tests + production build
```

The payment suite covers: successful mock payment confirming a booking; failed,
cancelled and pending payments not confirming; invalid mock transaction IDs;
unknown test instruments; forged outcome flags; wrong amount/currency; the
booking API ignoring client payment claims; owner confirmation blocked while
unpaid; idempotent re-verification; double-booking protection; mock rejected in
production; Razorpay order creation through a local gateway stub; signature
verification; and idempotent webhook processing.
