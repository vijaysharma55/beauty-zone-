-- Salon-owner-controlled advance payments + mandatory date of birth.
-- Additive, idempotent migration. The booking/payment lifecycle runs on the
-- Node/SQLite runtime; this keeps the Supabase (PostgREST) schema in parity for
-- profiles, services, salon payment settings and booking payment bookkeeping.

-- ---------------------------------------------------------------------------
-- 1. Mandatory date of birth on profiles (private; never exposed publicly).
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists date_of_birth date;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_dob_valid') then
    alter table public.profiles add constraint profiles_dob_valid
      check (date_of_birth is null or (date_of_birth >= date '1900-01-01' and date_of_birth <= current_date));
  end if;
end $$;

-- Copy DOB from signup metadata into the profile on user creation.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  insert into public.profiles (id, email, name, date_of_birth)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Per-service advance overrides.
-- ---------------------------------------------------------------------------
alter table public.services
  add column if not exists advance_mode text not null default 'inherit',
  add column if not exists advance_percent numeric,
  add column if not exists advance_fixed_paise bigint;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.services'::regclass and conname='services_advance_mode_check') then
    alter table public.services add constraint services_advance_mode_check
      check (advance_mode in ('inherit','percent','fixed','none'));
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Salon-owner booking & advance payment settings (one row per salon).
-- ---------------------------------------------------------------------------
create table if not exists public.salon_payment_settings (
  salon_id uuid primary key references public.salons(id) on delete cascade,
  advance_enabled boolean not null default true,
  advance_type text not null default 'percent',
  advance_percent numeric not null default 25,
  advance_fixed_paise bigint not null default 0,
  balance_policy text not null default 'at_salon',
  disabled_policy text not null default 'pay_at_salon',
  gateway_enabled boolean not null default true,
  manual_upi_enabled boolean not null default false,
  upi_id text not null default '',
  payment_display_name text not null default '',
  upi_qr_url text not null default '',
  methods jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint salon_payment_settings_type_check check (advance_type in ('percent','fixed')),
  constraint salon_payment_settings_balance_check check (balance_policy in ('at_salon','online')),
  constraint salon_payment_settings_disabled_check check (disabled_policy in ('pay_at_salon','block_booking')),
  constraint salon_payment_settings_percent_check check (advance_percent > 0 and advance_percent <= 100),
  constraint salon_payment_settings_fixed_check check (advance_fixed_paise >= 0)
);

alter table public.salon_payment_settings enable row level security;

drop policy if exists "salon_payment_settings_owner_admin_all" on public.salon_payment_settings;
create policy "salon_payment_settings_owner_admin_all" on public.salon_payment_settings
  as permissive for all to authenticated
  using (exists (select 1 from public.salons s where s.id = salon_payment_settings.salon_id and (s.owner_id = (select auth.uid()) or (select private.is_super_admin()))))
  with check (exists (select 1 from public.salons s where s.id = salon_payment_settings.salon_id and (s.owner_id = (select auth.uid()) or (select private.is_super_admin()))));

-- Public checkout needs the (non-secret) advance rules + enabled methods + UPI
-- QR for live salons. Secrets never live in this table.
drop policy if exists "salon_payment_settings_public_read" on public.salon_payment_settings;
create policy "salon_payment_settings_public_read" on public.salon_payment_settings
  as permissive for select to anon, authenticated
  using (exists (select 1 from public.salons s where s.id = salon_payment_settings.salon_id and s.website_published and s.status = 'approved' and not s.suspended));

-- ---------------------------------------------------------------------------
-- 4. Booking payment bookkeeping parity.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists amount_paise bigint not null default 0,
  add column if not exists advance_paise bigint not null default 0,
  add column if not exists payment_status text not null default 'not_required',
  add column if not exists balance_policy text not null default 'at_salon',
  add column if not exists payment_method text not null default '',
  add column if not exists confirmed_at timestamptz;

-- Extend the booking status set for the payment lifecycle.
do $$ begin
  if exists (select 1 from pg_constraint where conrelid='public.bookings'::regclass and conname='bookings_status_check') then
    alter table public.bookings drop constraint bookings_status_check;
  end if;
  alter table public.bookings add constraint bookings_status_check
    check (status in ('requested','pending_payment','payment_verification_pending','payment_failed','advance_paid','confirmed','declined','completed','cancelled','expired'));
end $$;

update public.bookings set payment_status = 'pending' where payment_status = 'unpaid';

create index if not exists bookings_payment_status_idx on public.bookings(payment_status);

-- ---------------------------------------------------------------------------
-- 5. Payment orders, receipts and WhatsApp notification ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete set null,
  provider text not null,
  method text not null default '',
  kind text not null default 'advance',
  provider_order_id text not null unique,
  provider_payment_id text unique,
  amount_paise bigint not null check (amount_paise >= 0),
  total_paise bigint not null default 0,
  remaining_paise bigint not null default 0,
  currency text not null default 'INR',
  status text not null default 'created',
  failure_reason text not null default '',
  instrument text not null default '',
  manual_reference text,
  customer_note text not null default '',
  claimed_at timestamptz,
  verified_by uuid,
  verification_note text not null default '',
  raw jsonb,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_provider_check check (provider in ('mock','razorpay','manual_upi')),
  constraint payments_kind_check check (kind in ('advance','balance')),
  constraint payments_status_check check (status in ('created','pending','verification_pending','paid','failed','cancelled','expired'))
);
create index if not exists payments_booking_idx on public.payments(booking_id, created_at desc);
create index if not exists payments_status_idx on public.payments(status);

create table if not exists public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete set null,
  access_token text not null,
  kind text not null default 'advance',
  total_paise bigint not null default 0,
  paid_paise bigint not null default 0,
  remaining_paise bigint not null default 0,
  method text not null default '',
  transaction_ref text not null default '',
  currency text not null default 'INR',
  issued_at timestamptz not null default now()
);
create index if not exists payment_receipts_booking_idx on public.payment_receipts(booking_id);

create table if not exists public.whatsapp_notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  salon_id uuid,
  receipt_id uuid,
  to_number text not null,
  provider text not null default 'meta_cloud',
  template_name text not null default '',
  status text not null default 'pending',
  provider_message_id text,
  error text not null default '',
  attempts integer not null default 0,
  payload jsonb,
  last_attempt_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_status_check check (status in ('pending','sent','delivered','read','failed','skipped'))
);
create index if not exists whatsapp_booking_idx on public.whatsapp_notifications(booking_id, created_at desc);
create index if not exists whatsapp_message_idx on public.whatsapp_notifications(provider_message_id);

-- Owner/admin access to payment rows (the Node server uses the service role;
-- these policies protect direct PostgREST access).
alter table public.payments enable row level security;
alter table public.payment_receipts enable row level security;
alter table public.whatsapp_notifications enable row level security;

drop policy if exists "payments_owner_admin_select" on public.payments;
create policy "payments_owner_admin_select" on public.payments
  as permissive for select to authenticated
  using ((select private.is_super_admin()) or exists (select 1 from public.salons s where s.id = payments.salon_id and s.owner_id = (select auth.uid())));

drop policy if exists "payment_receipts_owner_admin_select" on public.payment_receipts;
create policy "payment_receipts_owner_admin_select" on public.payment_receipts
  as permissive for select to authenticated
  using ((select private.is_super_admin()) or exists (select 1 from public.salons s where s.id = payment_receipts.salon_id and s.owner_id = (select auth.uid())));

drop policy if exists "whatsapp_owner_admin_select" on public.whatsapp_notifications;
create policy "whatsapp_owner_admin_select" on public.whatsapp_notifications
  as permissive for select to authenticated
  using ((select private.is_super_admin()) or exists (select 1 from public.salons s where s.id = whatsapp_notifications.salon_id and s.owner_id = (select auth.uid())));
