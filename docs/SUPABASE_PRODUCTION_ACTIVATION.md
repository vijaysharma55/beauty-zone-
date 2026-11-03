# BeautyZone — Supabase production activation

This project has a Supabase-backed operational API. Complete these steps before treating the Supabase migration as fully production-active.

## 1. Confirm the production domain

In Vercel, open the \`beauty-zone\` project → Settings → Domains. Use the primary, verified domain shown there as the production origin.

Do not use a one-off deployment URL as the permanent Auth Site URL. Set \`APP_URL\` in the Vercel Production environment to the same canonical origin, with no trailing slash, then redeploy.

## 2. Configure Supabase Auth URL settings

In Supabase → Authentication → URL Configuration:

- Site URL: \`https://YOUR_VERIFIED_PRODUCTION_DOMAIN\`
- Additional Redirect URLs:
  - \`https://YOUR_VERIFIED_PRODUCTION_DOMAIN/verify-email\`
  - \`https://YOUR_VERIFIED_PRODUCTION_DOMAIN/reset-password\`

Add a preview origin only if it is genuinely used for auth testing, and keep it restricted to the actual Vercel preview domain pattern you use. Avoid broad wildcard redirect rules.

Keep email confirmation enabled for email/password sign-ups. The app uses \`/verify-email\` for confirmation and \`/reset-password\` for password recovery.

## 3. Configure production SMTP

In Supabase → Authentication → SMTP Settings, configure a transactional email provider:

- SMTP host and port
- SMTP username and password
- Sender name: \`BeautyZone\`
- Sender address: an address on the verified sending domain

Verify the sender domain with the provider and publish its SPF/DKIM DNS records (and DMARC policy where available). Test both confirmation and password-recovery emails. Do not commit SMTP passwords to GitHub or expose them in Vite/browser environment variables.

## 4. Configure phone OTP (customer loyalty)

In Supabase → Authentication → Providers → Phone:

- Enable Phone provider.
- Select and configure an SMS provider supported by Supabase.
- Add the provider credentials in the Supabase dashboard.
- Set OTP expiry and rate limits appropriate for your provider.
- Test OTP send and verification using a real phone number.

The loyalty screen intentionally refuses to reveal or redeem a real account using a typed phone number alone. It requires a verified Supabase phone session. Until the SMS provider is configured, the OTP flow cannot be used in production.

## 5. Create the first Super Admin

The current Supabase project has no Auth users or application profiles yet. Therefore no account can be promoted until the first email/password user has signed up and confirmed their email.

1. Open the production BeautyZone website.
2. Register the intended administrator using the exact admin email address.
3. Complete the email-confirmation link.
4. In Supabase → SQL Editor, replace the placeholder below with that exact email and execute:

\`\`\`sql
update public.profiles
set role = 'super_admin',
    updated_at = now()
where lower(email) = lower('YOUR_ADMIN_EMAIL')
  and status = 'active';

select id, email, role, status, email_verified
from public.profiles
where lower(email) = lower('YOUR_ADMIN_EMAIL');
\`\`\`

Confirm the result is exactly one row with \`role = 'super_admin'\`, \`status = 'active'\`, and \`email_verified = true\`. Sign out and sign in again so the app loads the new role from the profile. Never promote a phone-only customer account to a super admin.

## 6. Subscription payments

The current implementation supports a manual reconciliation workflow:

1. Salon owner submits the UPI/bank transaction reference.
2. The payment record remains \`pending\`.
3. An authorized Super Admin checks the actual transaction in the merchant/bank account.
4. Only then does the admin use **Verify & activate**.

This is not automatic Razorpay/PhonePe settlement. To enable automatic settlement, configure a merchant account, API keys and webhook secret, then implement and test a signed webhook before enabling automatic activation. Never accept a browser-submitted “success” value as proof of payment.

## 7. Migrate existing SQLite records before disabling the compatibility fallback

This PR does not import existing SQLite user, salon, booking, loyalty or payment records. The Supabase schema is ready, but do not delete or disable the old SQLite database yet.

Before switching off the legacy fallback:

1. Export the actual production SQLite database from its current production storage location.
2. Back it up and record row counts for users, salons, services, staff, subscriptions, bookings, versions, waitlist, loyalty accounts, transactions, vouchers, platform settings and audit logs.
3. Build an explicit ID map from legacy text IDs to Supabase UUIDs; preserve external references and booking references.
4. Import parent records first (Auth users/profiles, salons), followed by services/staff/subscriptions/versions and then bookings/loyalty/audit children.
5. Reconcile row counts, foreign keys, money units (rupees vs paise), timestamps and status values.
6. Test owner isolation, public approved snapshots, admin approval, booking lifecycle, loyalty and payment audit against the imported records.
7. Keep a recoverable backup until production smoke tests pass.

No existing SQLite data should be assumed migrated simply because the Supabase tables exist.

## 8. Final smoke-test list

- Email sign-up → confirmation → sign-in
- Forgot password → recovery email → password update → sign-in
- Customer phone OTP → loyalty balance/history → voucher redemption
- Salon onboarding → service/staff setup → submit for approval
- Admin approval/rejection/change request → publish approved snapshot
- Public directory → availability → booking → owner status update → points credited once
- Manual payment reference → admin verification → subscription updated
- Admin settings change → audit log entry
- Cross-salon owner isolation and public draft-content isolation

The PR's GitHub verification workflow runs TypeScript, API/unit tests and the production build. Live provider delivery, real payment settlement and imported production data still require the external setup above.
