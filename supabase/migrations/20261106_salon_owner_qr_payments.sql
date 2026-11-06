-- Salon-owner personal QR payments: additive production schema.
-- Existing bookings/payments are preserved. Monetary values remain integer paise.

alter table public.salon_payment_settings
  add column if not exists bank_name text not null default '',
  add column if not exists payment_instructions text not null default '',
  add column if not exists verification_mode text not null default 'static_qr',
  add column if not exists provider_account_id text not null default '',
  add column if not exists provider_onboarding_status text not null default 'not_started';

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'salon_payment_verification_mode_check') then
    alter table public.salon_payment_settings add constraint salon_payment_verification_mode_check
      check (verification_mode in ('static_qr','provider'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'salon_provider_onboarding_status_check') then
    alter table public.salon_payment_settings add constraint salon_provider_onboarding_status_check
      check (provider_onboarding_status in ('not_started','pending','verified','rejected'));
  end if;
end $$;

-- Public checkout is served by the tenant-scoped Node API. Do not expose
-- inactive QR images, bank metadata or provider onboarding rows via PostgREST.
drop policy if exists "salon_payment_settings_public_read" on public.salon_payment_settings;

alter table public.payments
  add column if not exists payment_proof_url text,
  add column if not exists refunded_amount_paise bigint not null default 0,
  add column if not exists refund_reference text not null default '',
  add column if not exists refund_reason text not null default '',
  add column if not exists refunded_at timestamptz,
  add column if not exists refunded_by uuid;

create index if not exists payments_salon_created_idx on public.payments(salon_id, created_at desc);
create index if not exists payments_salon_status_idx on public.payments(salon_id, status);
create unique index if not exists payments_manual_reference_active_uidx
  on public.payments(manual_reference)
  where manual_reference is not null and manual_reference <> ''
    and status in ('verification_pending','paid');

create table if not exists public.payment_audit_logs (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete cascade,
  action text not null,
  previous_status text,
  new_status text,
  performed_by uuid,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists payment_audit_payment_idx on public.payment_audit_logs(payment_id, created_at);
create index if not exists payment_audit_salon_idx on public.payment_audit_logs(salon_id, created_at desc);

create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete cascade,
  salon_id uuid references public.salons(id) on delete cascade,
  amount_paise bigint not null check (amount_paise > 0),
  provider_refund_id text unique,
  reference text not null default '',
  reason text not null default '',
  status text not null check (status in ('processed','recorded')),
  performed_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists payment_refunds_payment_idx on public.payment_refunds(payment_id, created_at desc);
create index if not exists payment_refunds_salon_idx on public.payment_refunds(salon_id, created_at desc);

alter table public.payment_audit_logs enable row level security;
alter table public.payment_refunds enable row level security;

-- Read-only to the owning salon/admin. All mutations go through authorized
-- server endpoints using the service role; clients cannot forge audit entries.
drop policy if exists "payment_audit_owner_admin_select" on public.payment_audit_logs;
create policy "payment_audit_owner_admin_select" on public.payment_audit_logs
  as permissive for select to authenticated
  using ((select private.is_super_admin()) or exists (
    select 1 from public.salons s where s.id = payment_audit_logs.salon_id and s.owner_id = (select auth.uid())
  ));

drop policy if exists "payment_refunds_owner_admin_select" on public.payment_refunds;
create policy "payment_refunds_owner_admin_select" on public.payment_refunds
  as permissive for select to authenticated
  using ((select private.is_super_admin()) or exists (
    select 1 from public.salons s where s.id = payment_refunds.salon_id and s.owner_id = (select auth.uid())
  ));

-- Defence in depth: authenticated customers still receive no payment INSERT,
-- UPDATE or DELETE policy from this migration. Existing owner/admin policies
-- remain select-only. Verified payment records cannot be changed by customers.
