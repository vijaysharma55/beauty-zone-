-- Operational compatibility and controls for the BeautyZone Supabase API.
-- Additive migration: does not delete or overwrite existing rows.

alter table public.profiles
  add column if not exists status text not null default 'active',
  add column if not exists email_verified boolean not null default false;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active','disabled'));
  end if;
end $$;

alter table public.salon_versions
  add column if not exists submitted_by uuid references public.profiles(id) on delete set null;

-- Keep the established API field names in the public PostgREST schema.
alter table public.bookings add column if not exists date date;
alter table public.bookings add column if not exists time text;
update public.bookings set date = booking_date where date is null;
update public.bookings set time = booking_time where time is null;
alter table public.bookings alter column date set not null;
alter table public.bookings alter column time set not null;

alter table public.waitlist add column if not exists date date;
alter table public.waitlist add column if not exists time text;
update public.waitlist set date = requested_date where date is null;
update public.waitlist set time = requested_time where time is null;
alter table public.waitlist alter column date set not null;
alter table public.waitlist alter column time set not null;

alter table public.loyalty_accounts
  add column if not exists customer_id uuid references auth.users(id) on delete cascade;
alter table public.loyalty_transactions
  add column if not exists phone text,
  add column if not exists type text;
update public.loyalty_transactions lt
set phone = la.phone,
    type = coalesce(lt.type, lt.transaction_type)
from public.loyalty_accounts la
where la.id = lt.account_id;
alter table public.loyalty_vouchers
  add column if not exists phone text;
update public.loyalty_vouchers lv
set phone = la.phone
from public.loyalty_accounts la
where la.id = lv.account_id and lv.phone is null;

alter table public.audit_logs
  add column if not exists actor_email text,
  add column if not exists meta jsonb;

create index if not exists bookings_salon_date_time_idx on public.bookings(salon_id, date, time);
create index if not exists bookings_owner_status_date_idx on public.bookings(salon_id, status, date desc);
create index if not exists waitlist_salon_date_idx on public.waitlist(salon_id, date);
create index if not exists salon_versions_salon_status_version_idx on public.salon_versions(salon_id, status, version desc);
create index if not exists loyalty_accounts_customer_id_idx on public.loyalty_accounts(customer_id);
create index if not exists loyalty_transactions_phone_created_idx on public.loyalty_transactions(phone, created_at desc);
create index if not exists loyalty_vouchers_phone_created_idx on public.loyalty_vouchers(phone, created_at desc);
create unique index if not exists loyalty_transactions_booking_type_uidx
  on public.loyalty_transactions(booking_id, transaction_type)
  where booking_id is not null and transaction_type = 'earn';

create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  salon_id uuid not null references public.salons(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null check (provider in ('razorpay','phonepe','cashfree','upi','manual')),
  provider_reference text,
  amount_paise bigint not null check (amount_paise >= 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'pending' check (status in ('pending','verified','failed','refunded')),
  plan text not null check (plan in ('trial','starter','pro','elite')),
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists subscription_payments_provider_reference_uidx
  on public.subscription_payments(provider, provider_reference)
  where provider_reference is not null;
create index if not exists subscription_payments_salon_created_idx
  on public.subscription_payments(salon_id, created_at desc);
alter table public.subscription_payments enable row level security;

-- Do not let owners forge successful payment state or update a verified transaction.
drop policy if exists subscription_payments_owner_select on public.subscription_payments;
create policy subscription_payments_owner_select on public.subscription_payments
for select to authenticated using (
  (select private.is_super_admin())
  or exists (select 1 from public.salons s where s.id=subscription_payments.salon_id and s.owner_id=(select auth.uid()))
);
drop policy if exists subscription_payments_owner_insert on public.subscription_payments;
create policy subscription_payments_owner_insert on public.subscription_payments
for insert to authenticated with check (
  status = 'pending'
  and verified_at is null
  and verified_by is null
  and exists (select 1 from public.salons s where s.id=subscription_payments.salon_id and s.owner_id=(select auth.uid()))
);
drop policy if exists subscription_payments_admin_update on public.subscription_payments;
create policy subscription_payments_admin_update on public.subscription_payments
for update to authenticated using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));
drop policy if exists subscription_payments_admin_select on public.subscription_payments;
create policy subscription_payments_admin_select on public.subscription_payments
for select to authenticated using ((select private.is_super_admin()));

create or replace function private.guard_subscription_payment_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not (select private.is_super_admin()) then
    if new.status is distinct from old.status
      or new.verified_by is distinct from old.verified_by
      or new.verified_at is distinct from old.verified_at
      or new.provider_reference is distinct from old.provider_reference then
      raise exception 'Only a super admin or verified payment webhook may change payment state';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_subscription_payment_state() from public, anon, authenticated;
drop trigger if exists guard_subscription_payment_state on public.subscription_payments;
create trigger guard_subscription_payment_state before update on public.subscription_payments
for each row execute function private.guard_subscription_payment_state();

-- Authenticated users may append audit events only for themselves; admins may read all.
drop policy if exists audit_logs_insert_self on public.audit_logs;
create policy audit_logs_insert_self on public.audit_logs
for insert to authenticated with check (actor_id = (select auth.uid()));
drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select on public.audit_logs
for select to authenticated using ((select private.is_super_admin()));

-- A verified customer can read/manage only the loyalty account linked to their own auth id.
drop policy if exists loyalty_accounts_customer_select on public.loyalty_accounts;
create policy loyalty_accounts_customer_select on public.loyalty_accounts
for select to authenticated using (customer_id = (select auth.uid()));
drop policy if exists loyalty_transactions_customer_select on public.loyalty_transactions;
create policy loyalty_transactions_customer_select on public.loyalty_transactions
for select to authenticated using (
  exists (select 1 from public.loyalty_accounts la
    where la.id=loyalty_transactions.account_id and la.customer_id=(select auth.uid()))
);
drop policy if exists loyalty_vouchers_customer_select on public.loyalty_vouchers;
create policy loyalty_vouchers_customer_select on public.loyalty_vouchers
for select to authenticated using (
  exists (select 1 from public.loyalty_accounts la
    where la.id=loyalty_vouchers.account_id and la.customer_id=(select auth.uid()))
);

-- No browser may mutate identity or disable an account through its profile row.
create or replace function private.guard_profile_identity_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and not (select private.is_super_admin()) then
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email_verified is distinct from old.email_verified
       or new.created_at is distinct from old.created_at then
      raise exception 'Only trusted authentication or administrator workflows may change profile identity and access fields';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_profile_identity_fields() from public, anon, authenticated;
drop trigger if exists guard_profile_identity_fields on public.profiles;
create trigger guard_profile_identity_fields before update on public.profiles
for each row execute function private.guard_profile_identity_fields();

grant select, insert, update, delete on public.subscription_payments to authenticated;
