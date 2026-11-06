# BeautyZone customer rewards

## Source of truth

Customer loyalty balances, lifetime points, tiers, transactions, offers and vouchers are stored in Supabase PostgreSQL. The browser must never create a balance, a points transaction or a voucher locally. The customer must authenticate using a verified Supabase phone OTP before reading or redeeming rewards.

The frontend uses the Supabase publishable key only. It must never contain a Supabase secret/service-role key.

## Supabase setup

1. Apply the migrations in timestamp order, including `20261106_beautyzone_secure_customer_rewards.sql`, after the existing BeautyZone schema, operational compatibility and customer-loyalty migrations.
2. In Supabase Authentication, enable Phone sign-in and configure an SMS provider. Supabase's default test configuration is not a production SMS delivery setup.
3. Set the Auth SMS template/provider and country restrictions for the business's supported customer regions.
4. Configure these frontend/server environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
5. Configure **one server-only key** for completed-booking points awards:
   - `SUPABASE_SECRET_KEY` (preferred), or
   - `SUPABASE_SERVICE_ROLE_KEY` (legacy key format).
   
   Store it only in the server/hosting environment. Never prefix it with `VITE_`, commit it, or return it to the browser. The points-award RPC is executable only by `service_role`.

Phone OTP is sent using Supabase Auth `/auth/v1/otp` and verified using `/auth/v1/verify`. The app currently formats Indian customer numbers as `+91` plus ten digits. For current provider configuration and supported SMS providers, see the [Supabase Phone Login guide](https://supabase.com/docs/guides/auth/phone-login).

## Reward rules

- New verified customers receive one 100-point welcome bonus. The account is created/claimed under a transaction lock and the welcome entry is written once.
- Completed booking awards use the final recorded booking amount in rupees: base points are the greater of 100 or the rounded bill amount divided by 10.
- Silver earns 1x, Gold earns 1.25x and Platinum earns 1.5x. The tier used for an award is the tier at the time the completed booking is processed.
- Tier is based on lifetime earned points: Silver below 500, Gold from 500, Platinum from 1,500. Redeeming points does not downgrade a member.
- Every completed booking award is idempotent by booking id. Repeating the completed status update cannot award the same booking twice.
- Reward costs and discount values come from `public.loyalty_reward_offers`, not from frontend or backend hard-coded copies.
- Redemptions are atomic: the account row is locked, points are deducted, the voucher and ledger entry are created together. The caller supplies an idempotency UUID so a retry returns the original voucher.
- Vouchers expire after 60 days. Verification and consumption require the signed-in customer to own the voucher. Consumption is idempotent for the same booking reference.
- Booking voucher discounts are applied only after Supabase validates the customer's voucher. A newly inserted SQLite booking is deleted if the authoritative Supabase consumption fails, so an unconsumed voucher cannot obtain a discount.

## Existing SQLite loyalty data

The old SQLite public lookup/redeem endpoints have been removed from the API mount. Existing SQLite loyalty tables are left intact for audit/recovery, but are **not** automatically copied into Supabase by this migration. Before enabling this rewards flow for existing customers, take a database backup and complete the approved one-time legacy data import. Do not run the old public phone-lookup endpoints again; they trusted a phone number supplied by the caller.

## Verification

Run:

```bash
npm run test:loyalty
npm run verify
```

The loyalty tests cover phone normalization, points/tier calculations, authenticated voucher verification, service-key-only booking awards and migration security/catalogue guards. They do not replace a live Supabase integration test. Production acceptance also requires a real OTP send/verify, a completed booking award, a redemption retry, voucher booking consumption, and a cross-customer access-denial test using the configured Supabase project.
