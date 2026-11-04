-- Supabase Auth trigger correction, legacy identity mapping, and Razorpay payment processing.
-- Additive, idempotent migration; existing user/business rows are not deleted.

alter table public.profiles add column if not exists legacy_user_id text;
create unique index if not exists profiles_legacy_user_id_uidx
  on public.profiles(legacy_user_id) where legacy_user_id is not null;

-- Legacy SQLite permits global waitlist records and enquiries without a salon.
alter table public.waitlist alter column salon_id drop not null;
alter table public.stylist_inquiries alter column salon_id drop not null;

-- Store provider IDs independently from user-supplied values.
alter table public.subscription_payments
  add column if not exists provider_order_id text,
  add column if not exists provider_payment_id text;
create unique index if not exists subscription_payments_provider_order_uidx
  on public.subscription_payments(provider,provider_order_id) where provider_order_id is not null;
create unique index if not exists subscription_payments_provider_payment_uidx
  on public.subscription_payments(provider,provider_payment_id) where provider_payment_id is not null;

create table if not exists public.booking_payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  provider text not null check (provider = 'razorpay'),
  provider_order_id text not null unique,
  provider_payment_id text unique,
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'pending' check (status in ('pending','captured','failed','refunded')),
  provider_signature_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  captured_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists booking_payments_booking_created_idx
  on public.booking_payments(booking_id,created_at desc);
alter table public.booking_payments enable row level security;
drop policy if exists booking_payments_owner_select on public.booking_payments;
create policy booking_payments_owner_select on public.booking_payments
for select to authenticated using (
  exists(select 1 from public.bookings b join public.salons s on s.id=b.salon_id
    where b.id=booking_payments.booking_id and s.owner_id=(select auth.uid()))
  or (select private.is_super_admin())
);
revoke insert,update,delete on public.booking_payments from anon,authenticated;

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider = 'razorpay'),
  event_id text not null unique,
  event_type text not null,
  payload jsonb not null,
  status text not null default 'received' check (status in ('received','processed','ignored','failed')),
  processing_error text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists payment_webhook_events_status_received_idx
  on public.payment_webhook_events(status,received_at);
alter table public.payment_webhook_events enable row level security;
revoke all on public.payment_webhook_events from public,anon,authenticated;
grant all on public.payment_webhook_events to service_role;
grant all on public.booking_payments to service_role;
grant all on public.subscription_payments to service_role;
grant all on public.subscriptions to service_role;
grant all on public.bookings to service_role;

-- Correct Supabase Auth column name: auth.users uses raw_app_meta_data, not app_metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_provider text;
begin
  v_role := case
    when new.phone is not null or new.raw_app_meta_data ->> 'provider' = 'phone' then 'customer'
    else 'salon_owner'
  end;
  v_provider := case
    when new.raw_app_meta_data ->> 'provider' = 'google' then 'google'
    when new.phone is not null or new.raw_app_meta_data ->> 'provider' = 'phone' then 'phone'
    else 'password'
  end;
  insert into public.profiles (id,email,name,role,auth_provider,email_verified,updated_at)
  values (
    new.id,
    coalesce(new.email,''),
    coalesce(nullif(new.raw_user_meta_data ->> 'name',''),nullif(new.raw_user_meta_data ->> 'full_name',''),nullif(split_part(coalesce(new.email,''),'@',1),''),'BeautyZone Guest'),
    v_role,
    v_provider,
    new.email_confirmed_at is not null,
    now()
  )
  on conflict(id) do update
    set email=excluded.email,
        email_verified=excluded.email_verified,
        auth_provider=excluded.auth_provider,
        updated_at=now();
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;

create or replace function private.process_razorpay_event(p_event_id text,p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text := coalesce(p_event->>'event','');
  v_payment jsonb := p_event #> '{payload,payment,entity}';
  v_order_id text := v_payment->>'order_id';
  v_payment_id text := v_payment->>'id';
  v_amount bigint := nullif(v_payment->>'amount','')::bigint;
  v_currency text := coalesce(v_payment->>'currency','INR');
  v_row public.subscription_payments%rowtype;
  v_booking_payment public.booking_payments%rowtype;
  v_updated integer := 0;
  v_inserted integer := 0;
  v_event_status text := 'ignored';
begin
  if coalesce(auth.role(),'') <> 'service_role' then
    raise exception using errcode='42501',message='Only the trusted webhook service may process payment events';
  end if;
  if coalesce(trim(p_event_id),'')='' or length(p_event_id)>200 then
    raise exception using errcode='22023',message='Missing Razorpay event ID';
  end if;

  insert into public.payment_webhook_events(provider,event_id,event_type,payload,status)
  values('razorpay',p_event_id,v_type,p_event,'received')
  on conflict(event_id) do nothing;
  get diagnostics v_inserted = row_count;

  perform 1 from public.payment_webhook_events where event_id=p_event_id for update;
  if exists(select 1 from public.payment_webhook_events where event_id=p_event_id and status in ('processed','ignored')) then
    return jsonb_build_object('ok',true,'duplicate',true,'eventId',p_event_id);
  end if;

  if v_type not in ('payment.captured','payment.failed') or v_order_id is null or v_payment_id is null then
    update public.payment_webhook_events set status='ignored',processed_at=now(),processing_error=null where event_id=p_event_id;
    return jsonb_build_object('ok',true,'ignored',true,'eventType',v_type);
  end if;

  if v_currency<>'INR' or v_amount is null or v_amount<=0 then
    raise exception using errcode='22023',message='Razorpay payment currency or amount is invalid';
  end if;

  select * into v_row from public.subscription_payments
  where provider='razorpay' and provider_order_id=v_order_id for update;
  if found then
    if v_row.amount_paise<>v_amount or v_row.currency<>v_currency then
      raise exception using errcode='23514',message='Razorpay subscription payment amount does not match the stored order';
    end if;
    if v_type='payment.captured' then
      if v_row.status<>'verified' then
        update public.subscription_payments
        set status='verified',provider_payment_id=v_payment_id,provider_reference=v_payment_id,
            verified_at=coalesce(verified_at,now()),
            metadata=metadata || jsonb_build_object('razorpayPaymentId',v_payment_id,'razorpayEventId',p_event_id),
            updated_at=now()
        where id=v_row.id;
        insert into public.subscriptions(salon_id,plan,status,current_period_end)
        values(v_row.salon_id,v_row.plan,'active',coalesce(v_row.period_end,now()+interval '30 days'))
        on conflict(salon_id) do update
          set plan=excluded.plan,status='active',
              current_period_end=excluded.current_period_end,updated_at=now();
      end if;
    elsif v_row.status not in ('verified','refunded') then
      update public.subscription_payments
      set status='failed',provider_payment_id=v_payment_id,provider_reference=v_payment_id,updated_at=now()
      where id=v_row.id;
    end if;
    v_event_status:='processed';
  else
    select * into v_booking_payment from public.booking_payments
    where provider='razorpay' and provider_order_id=v_order_id for update;
    if not found then
      raise exception using errcode='P0002',message='Razorpay order is not linked to a BeautyZone payment';
    end if;
    if v_booking_payment.amount_paise<>v_amount or v_booking_payment.currency<>v_currency then
      raise exception using errcode='23514',message='Razorpay booking payment amount does not match the stored order';
    end if;
    if v_type='payment.captured' then
      if v_booking_payment.status<>'captured' then
        update public.booking_payments
        set status='captured',provider_payment_id=v_payment_id,
            provider_signature_verified=true,captured_at=now(),
            metadata=metadata || jsonb_build_object('razorpayEventId',p_event_id),updated_at=now()
        where id=v_booking_payment.id;
        update public.bookings
        set advance_paid=greatest(advance_paid,v_amount),advance_ref=v_payment_id,updated_at=now()
        where id=v_booking_payment.booking_id;
      end if;
    elsif v_booking_payment.status<>'captured' then
      update public.booking_payments set status='failed',provider_payment_id=v_payment_id,updated_at=now()
      where id=v_booking_payment.id;
    end if;
    v_event_status:='processed';
  end if;

  update public.payment_webhook_events
  set status=v_event_status,processed_at=now(),processing_error=null
  where event_id=p_event_id;
  return jsonb_build_object('ok',true,'duplicate',false,'eventType',v_type,'paymentId',v_payment_id);
end;
$$;
revoke all on function private.process_razorpay_event(text,jsonb) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.process_razorpay_event(text,jsonb) to service_role;

create or replace function public.process_razorpay_webhook(p_event_id text,p_event jsonb)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.process_razorpay_event(p_event_id,p_event);
$$;
revoke all on function public.process_razorpay_webhook(text,jsonb) from public,anon,authenticated;
grant execute on function public.process_razorpay_webhook(text,jsonb) to service_role;
