# WhatsApp Business receipts (Meta Cloud API)

After a payment is **verified**, BeautyZone issues a receipt and submits a
WhatsApp confirmation to the customer's registered mobile number using the Meta
WhatsApp Cloud API with an **approved message template**.

## Guarantees

- A message is marked `sent` **only** when the provider accepts it and returns a
  message id. `delivered` / `read` / `failed` come from the provider webhook.
- If no provider is configured, the notification is recorded as `skipped` — the
  system never claims a message was sent.
- A delivery failure **never** cancels or reverses a confirmed booking. The
  receipt stays downloadable on the website, and the owner/admin can retry from
  the dashboard.

## 1. Create the Meta app + number

1. Create a Meta Business app with the **WhatsApp** product.
2. Add a sender phone number; note its **Phone number ID**.
3. Create a permanent **system user** access token with
   `whatsapp_business_messaging` permission.

## 2. Approve the message template

Create a template named `booking_confirmation_receipt` (or set
`WHATSAPP_TEMPLATE_NAME` to your own name) in the **UTILITY** category with this
body (14 parameters, in order):

```
Hello {{1}}, your booking at {{2}} is CONFIRMED.
Reference: {{3}}
Service: {{4}}
Date & time: {{5}} at {{6}}
Total: {{7}}
Advance received: {{8}} ({{9}})
Transaction: {{10}}
Remaining balance: {{11}}
Salon contact: {{12}}
Address: {{13}}
Receipt no: {{14}}
```

Add a **URL button** whose base URL is `https://<your-domain>/receipt/{{1}}`.
The server passes `<bookingId>?token=<receipt token>` as the button parameter,
so the button opens the customer's receipt page.

The 14 body parameters sent are: customer name, salon name, booking reference,
service(s), date, time, total, advance received, payment method, transaction
reference, remaining balance, salon contact, salon address, receipt number.

## 3. Configure the server

```bash
WHATSAPP_PROVIDER=meta_cloud
WHATSAPP_ACCESS_TOKEN=<permanent system-user token>
WHATSAPP_PHONE_NUMBER_ID=<sender phone number id>
WHATSAPP_TEMPLATE_NAME=booking_confirmation_receipt
WHATSAPP_TEMPLATE_LANGUAGE=en
WHATSAPP_VERIFY_TOKEN=<random string you choose>
WHATSAPP_APP_SECRET=<Meta app secret>
APP_URL=https://<your public https origin>
```

`APP_URL` is required so the receipt button links to a reachable page.

## 4. Subscribe the webhook

In the Meta app, set the WhatsApp webhook callback URL to:

```
https://<your-domain>/api/public/whatsapp/webhook
```

- Verify token: the `WHATSAPP_VERIFY_TOKEN` value.
- Subscribe to the `messages` field (delivery statuses).

The server verifies the `hub.verify_token` on subscription and validates
`X-Hub-Signature-256` (HMAC of the raw body with `WHATSAPP_APP_SECRET`) on every
delivery. Status updates move the notification through
`sent → delivered → read` (or `failed`).

## 5. Retry

- Owner: `POST /api/salon/bookings/:id/whatsapp/retry`
- Admin: `POST /api/admin/bookings/:id/whatsapp/retry`
- Customer (from the receipt page): `POST /api/public/receipts/:id/whatsapp`

Retries are rate-limited and recorded in `whatsapp_notifications` (attempt count,
last attempt, provider message id, error).

## Test mode

Automated tests point `WHATSAPP_API_BASE` at a local stub. No real messages are
sent and no network access to Meta is required.
