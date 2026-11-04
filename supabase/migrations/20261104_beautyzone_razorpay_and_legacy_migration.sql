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


-- Canonicalize Indian OTP and booking phone values before loyalty lookup.
create or replace function private.normalize_customer_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_digits text := regexp_replace(coalesce(p_phone,''),'\D','','g');
begin
  -- Persist Indian E.164, 91-prefixed and trunk-prefix forms as one 10-digit key.
  if length(v_digits)=12 and left(v_digits,2)='91' then return right(v_digits,10);
  elsif length(v_digits)=11 and left(v_digits,1)='0' then return right(v_digits,10);
  end if;
  return v_digits;
end;
$$;
revoke all on function private.normalize_customer_phone(text) from public,anon,authenticated;
grant execute on function private.normalize_customer_phone(text) to authenticated,service_role;

CREATE OR REPLACE FUNCTION private.complete_salon_booking(p_booking_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_booking public.bookings%rowtype;
  v_salon public.salons%rowtype;
  v_account public.loyalty_accounts%rowtype;
  v_points integer := 0;
  v_base integer := 0;
  v_member_id text;
  v_now timestamptz := now();
begin
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception using errcode='P0002',message='Booking not found'; end if;
  select * into v_salon from public.salons where id=v_booking.salon_id and owner_id=(select auth.uid());
  if not found then raise exception using errcode='42501',message='You can only complete bookings for your salon'; end if;
  if v_booking.status not in ('requested','confirmed','completed') then
    raise exception using errcode='23514',message='Only requested or confirmed bookings can be completed';
  end if;
  if v_booking.status<>'completed' then
    update public.bookings set status='completed',updated_at=v_now where id=v_booking.id returning * into v_booking;
  end if;

  if exists(select 1 from public.loyalty_transactions where booking_id=v_booking.id and transaction_type='earn') then
    select * into v_account from public.loyalty_accounts where phone=private.normalize_customer_phone(v_booking.phone);
    return jsonb_build_object('booking',to_jsonb(v_booking),'loyaltyReward',null,'alreadyCompleted',true);
  end if;

  select * into v_account from public.loyalty_accounts
    where phone=private.normalize_customer_phone(v_booking.phone) for update;
  if not found then
    v_member_id:='VIP-'||right(private.normalize_customer_phone(v_booking.phone),4)||'-'||upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    insert into public.loyalty_accounts(owner_id,phone,name,member_id,tier,total_points,lifetime_points,visits_count)
    values(null,private.normalize_customer_phone(v_booking.phone),coalesce(v_booking.full_name,'BeautyZone Guest'),v_member_id,'silver',100,100,0)
    returning * into v_account;
    insert into public.loyalty_transactions(account_id,phone,booking_id,salon_id,service_title,bill_amount,points,transaction_type,type,description)
    values(v_account.id,v_account.phone,null,v_booking.salon_id,'Welcome Loyalty Bonus',0,100,'bonus','bonus','Welcome gift for joining BeautyZone VIP Rewards');
  end if;

  -- Booking totals are stored in paise; award one point per ₹10, minimum 100.
  v_base:=greatest(100,round(coalesce(v_booking.estimated_total,0)::numeric/1000)::integer);
  v_points:=round(v_base * case v_account.tier when 'gold' then 1.25 when 'platinum' then 1.5 else 1.0 end)::integer;
  update public.loyalty_accounts set
    total_points=total_points+v_points,
    lifetime_points=lifetime_points+v_points,
    visits_count=visits_count+1,
    tier=case when total_points+v_points>=1500 then 'platinum' when total_points+v_points>=500 then 'gold' else 'silver' end,
    updated_at=v_now
  where id=v_account.id returning * into v_account;

  insert into public.loyalty_transactions(account_id,phone,booking_id,salon_id,service_title,bill_amount,points,transaction_type,type,description)
  values(v_account.id,v_account.phone,v_booking.id,v_booking.salon_id,coalesce(v_booking.service,'Salon Service'),
    coalesce(v_booking.estimated_total,0),v_points,'earn','earn',
    'Rewarded '||v_points||' loyalty points for completed appointment ('||coalesce(v_booking.reference,'Ref')||')');

  return jsonb_build_object('booking',to_jsonb(v_booking),'loyaltyReward',
    jsonb_build_object('pointsEarned',v_points,'totalPoints',v_account.total_points,'tier',v_account.tier),
    'alreadyCompleted',false);
end;
$function$;

CREATE OR REPLACE FUNCTION private.create_public_booking(p_booking jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_id uuid := coalesce(nullif(p_booking->>'id','')::uuid,gen_random_uuid());
  v_salon public.salons%rowtype;
  v_snapshot jsonb;
  v_snapshot_service jsonb;
  v_snapshot_staff jsonb;
  v_service_id uuid := null;
  v_staff_id uuid := null;
  v_booking public.bookings%rowtype;
  v_code text := nullif(upper(trim(coalesce(p_booking->>'promo_code',''))),'');
  v_phone text := private.normalize_customer_phone(p_booking->>'phone');
  v_total bigint := greatest(0,coalesce((p_booking->>'estimated_total')::bigint,0));
  v_user_phone text;
  v_discount bigint := 0;
  v_conflicts integer := 0;
  v_now timestamptz := now();
  v_salon_id uuid := nullif(p_booking->>'salon_id','')::uuid;
  v_service_text text := lower(trim(coalesce(p_booking->>'service','')));
  v_staff_text text := lower(trim(coalesce(p_booking->>'stylist','')));
begin
  if v_salon_id is null then
    v_total := 0;
    if v_code is not null then
      raise exception using errcode='22023',message='Loyalty vouchers require a published salon booking';
    end if;
  end if;
  if length(trim(coalesce(p_booking->>'full_name','')))<2
     or length(trim(coalesce(p_booking->>'phone','')))<8
     or length(v_phone)<8
     or length(v_service_text)<2
     or coalesce(p_booking->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
     or (p_booking->>'date')::date < current_date
     or coalesce(p_booking->>'time','') !~ '^([01]\d|2[0-3]):[0-5]\d$' then
    raise exception using errcode='22023',message='Booking details are invalid';
  end if;
  if coalesce(p_booking->>'location_type','salon') not in ('salon','home') then
    raise exception using errcode='22023',message='Invalid booking location type';
  end if;

  if v_salon_id is not null then
    select * into v_salon from public.salons s
    where s.id=v_salon_id
      and s.website_published and s.status in ('approved','pending') and not s.suspended
      and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved');
    if not found then raise exception using errcode='P0002',message='Salon is not currently available for booking'; end if;

    select v.snapshot into v_snapshot from public.salon_versions v
    where v.salon_id=v_salon.id and v.status='approved'
    order by v.version desc limit 1;
    if v_snapshot is null then raise exception using errcode='P0002',message='Published salon content is not available'; end if;

    if nullif(p_booking->>'service_id','') is not null then
      select item into v_snapshot_service
      from jsonb_array_elements(coalesce(v_snapshot->'services','[]'::jsonb)) item
      where item->>'id'=p_booking->>'service_id' and coalesce((item->>'active')::boolean,false)
      limit 1;
    else
      select item into v_snapshot_service
      from jsonb_array_elements(coalesce(v_snapshot->'services','[]'::jsonb)) item
      where lower(trim(coalesce(item->>'name','')))=v_service_text
        and coalesce((item->>'active')::boolean,false)
      order by coalesce((item->>'sortOrder')::integer,0)
      limit 1;
    end if;
    if v_snapshot_service is null then
      raise exception using errcode='22023',message='Selected service is not part of the live approved salon website';
    end if;
    if lower(trim(coalesce(v_snapshot_service->>'name','')))<>v_service_text then
      raise exception using errcode='22023',message='Selected service name does not match the live approved service';
    end if;
    if nullif(v_snapshot_service->>'pricePaise','') is not null then
      v_total:=greatest(0,(v_snapshot_service->>'pricePaise')::bigint);
    end if;
    if exists(select 1 from public.services where id=(v_snapshot_service->>'id')::uuid and salon_id=v_salon.id) then
      v_service_id:=(v_snapshot_service->>'id')::uuid;
    end if;

    if nullif(p_booking->>'staff_id','') is not null then
      select item into v_snapshot_staff
      from jsonb_array_elements(coalesce(v_snapshot->'staff','[]'::jsonb)) item
      where item->>'id'=p_booking->>'staff_id'
        and coalesce((item->>'active')::boolean,false)
        and coalesce((item->>'bookingEnabled')::boolean,true)
      limit 1;
    elsif v_staff_text<>'' then
      select item into v_snapshot_staff
      from jsonb_array_elements(coalesce(v_snapshot->'staff','[]'::jsonb)) item
      where lower(trim(coalesce(item->>'name','')))=v_staff_text
        and coalesce((item->>'active')::boolean,false)
        and coalesce((item->>'bookingEnabled')::boolean,true)
      limit 1;
    end if;
    if v_staff_text<>'' and v_snapshot_staff is null then
      raise exception using errcode='22023',message='Selected specialist is not part of the live approved salon website';
    end if;
    if v_snapshot_staff is not null then
      if exists(select 1 from public.staff where id=(v_snapshot_staff->>'id')::uuid and salon_id=v_salon.id) then
        v_staff_id:=(v_snapshot_staff->>'id')::uuid;
      end if;
    end if;

    select count(*) into v_conflicts from public.bookings b
    where b.salon_id=v_salon.id and b.date=(p_booking->>'date')::date and b.time=p_booking->>'time'
      and b.status in ('requested','confirmed');
  end if;

  if v_code is not null then
    if (select auth.uid()) is null then raise exception using errcode='42501',message='Sign in and verify your mobile to use a loyalty voucher'; end if;
    select phone into v_user_phone from auth.users
      where id=(select auth.uid()) and phone_confirmed_at is not null;
    if v_user_phone is null or private.normalize_customer_phone(v_user_phone)<>v_phone then
      raise exception using errcode='42501',message='The booking phone must match your verified mobile number';
    end if;
    select lv.discount_amount into v_discount
    from public.loyalty_vouchers lv
    join public.loyalty_accounts la on la.id=lv.account_id
    where upper(lv.code)=v_code and la.customer_id=(select auth.uid())
      and la.phone=v_phone and not lv.used and lv.expires_at>v_now
    for update of lv;
    if not found then raise exception using errcode='P0002',message='Invalid, used or expired voucher'; end if;
    -- Vouchers are denominated in rupees; bookings are stored in paise.
    v_total:=greatest(0,v_total-(v_discount*100));
  end if;

  insert into public.bookings(
    id,salon_id,reference,full_name,phone,email,service,service_id,category,stylist,staff_id,
    date,time,booking_date,booking_time,location_type,branch,address,locality,distance_km,bridal_trial,
    notes,promo_code,estimated_total,advance_paid,advance_ref,status,source,created_by,created_at,updated_at
  ) values (
    v_id,v_salon_id,
    coalesce(nullif(p_booking->>'reference',''),'BZ-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
    left(trim(p_booking->>'full_name'),120),left(trim(p_booking->>'phone'),40),
    nullif(left(trim(coalesce(p_booking->>'email','')),254),''),
    left(trim(p_booking->>'service'),160),v_service_id,
    left(coalesce(p_booking->>'category',''),80),left(coalesce(p_booking->>'stylist',''),120),
    v_staff_id,(p_booking->>'date')::date,p_booking->>'time',
    (p_booking->>'date')::date,p_booking->>'time',coalesce(p_booking->>'location_type','salon'),
    left(coalesce(p_booking->>'branch',''),120),left(coalesce(p_booking->>'address',''),300),
    left(coalesce(p_booking->>'locality',''),150),nullif(p_booking->>'distance_km','')::numeric,
    coalesce((p_booking->>'bridal_trial')::boolean,false),left(coalesce(p_booking->>'notes',''),2000),
    v_code,v_total,0,null,'requested','public',(select auth.uid()),v_now,v_now
  ) returning * into v_booking;

  if v_code is not null then
    update public.loyalty_vouchers set used=true,used_booking_id=v_id where upper(code)=v_code;
  end if;
  return jsonb_build_object(
    'booking',to_jsonb(v_booking),
    'discountApplied',v_discount,
    'highDemand',(v_conflicts>=2)
  );
end;
$function$;

CREATE OR REPLACE FUNCTION private.ensure_customer_loyalty_account(p_name text DEFAULT ''::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_phone text;
  v_email text;
  v_user_id uuid := (select auth.uid());
  v_account public.loyalty_accounts%rowtype;
  v_member text;
begin
  if v_user_id is null then raise exception using errcode='42501', message='Sign in before opening loyalty'; end if;
  select phone,email into v_phone,v_email from auth.users
  where id=v_user_id and phone_confirmed_at is not null;
  if v_phone is null then raise exception using errcode='42501', message='Verify your mobile number with Supabase phone OTP before using customer loyalty'; end if;
  v_phone:=private.normalize_customer_phone(v_phone);
  if length(v_phone)<8 then raise exception using errcode='22023', message='Verified phone number is invalid'; end if;
  select * into v_account from public.loyalty_accounts where customer_id=v_user_id for update;
  if found then return to_jsonb(v_account); end if;
  select * into v_account from public.loyalty_accounts where phone=v_phone and customer_id is null for update;
  if found then
    update public.loyalty_accounts set customer_id=v_user_id,
      name=case when coalesce(trim(p_name),'')<>'' then left(trim(p_name),120) else name end,
      updated_at=now() where id=v_account.id returning * into v_account;
    return to_jsonb(v_account);
  end if;
  if exists(select 1 from public.loyalty_accounts where phone=v_phone and customer_id is distinct from v_user_id) then
    raise exception using errcode='23505', message='This verified mobile number is already linked to another loyalty account';
  end if;
  v_member := 'VIP-' || right(v_phone,4) || '-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
  insert into public.loyalty_accounts(owner_id,customer_id,phone,name,member_id,tier,total_points,lifetime_points,visits_count)
  values(null,v_user_id,v_phone,left(coalesce(nullif(trim(p_name),''),split_part(coalesce(v_email,''),'@',1),'BeautyZone Guest'),120),v_member,'silver',100,100,0)
  returning * into v_account;
  insert into public.loyalty_transactions(account_id,phone,service_title,bill_amount,points,transaction_type,type,description)
  values(v_account.id,v_phone,'Welcome Loyalty Bonus',0,100,'bonus','bonus','Welcome gift for joining BeautyZone VIP Rewards');
  return to_jsonb(v_account);
end;
$function$;

CREATE OR REPLACE FUNCTION private.redeem_customer_loyalty_reward(p_offer_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_phone text;
  v_account public.loyalty_accounts%rowtype;
  v_points integer;
  v_discount bigint;
  v_title text;
  v_code text;
  v_expiry timestamptz := now()+interval '60 days';
begin
  if v_user_id is null then raise exception using errcode='42501', message='Sign in before redeeming loyalty points'; end if;
  select phone into v_phone from auth.users where id=v_user_id and phone_confirmed_at is not null;
  if v_phone is null then raise exception using errcode='42501', message='Verified mobile OTP is required for loyalty redemption'; end if;
  select * into v_account from public.loyalty_accounts where customer_id=v_user_id and phone=private.normalize_customer_phone(v_phone) for update;
  if not found then raise exception using errcode='P0002', message='Loyalty account not found'; end if;

  case p_offer_id
    when 'rew-1' then v_points:=200; v_discount:=200; v_title:='₹200 Instant Salon Discount';
    when 'rew-2' then v_points:=450; v_discount:=500; v_title:='₹500 Premium Treatment Voucher';
    when 'rew-3' then v_points:=750; v_discount:=1800; v_title:='Free Moroccan Scalp & Hair Spa';
    when 'rew-4' then v_points:=1000; v_discount:=2500; v_title:='24K Gold Foil Facial Upgrade';
    when 'rew-5' then v_points:=1200; v_discount:=1500; v_title:='₹1,500 Royal Bridal Booking Discount';
    else raise exception using errcode='22023', message='Selected reward offer does not exist';
  end case;
  if v_account.total_points < v_points then
    raise exception using errcode='23514', message='Insufficient loyalty points';
  end if;
  v_code := 'VIP-'||v_discount::text||'-'||right(v_account.phone,4)||'-'||upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
  update public.loyalty_accounts
    set total_points=total_points-v_points,
        tier=case when total_points-v_points>=1500 then 'platinum' when total_points-v_points>=500 then 'gold' else 'silver' end,
        updated_at=now()
    where id=v_account.id returning * into v_account;
  insert into public.loyalty_transactions(account_id,phone,service_title,bill_amount,points,transaction_type,type,description)
  values(v_account.id,v_account.phone,v_title,0,-v_points,'redeem','redeem','Redeemed '||v_points||' points for voucher '||v_code);
  insert into public.loyalty_vouchers(code,account_id,phone,offer_id,title,discount_amount,points_cost,expires_at)
  values(v_code,v_account.id,v_account.phone,p_offer_id,v_title,v_discount,v_points,v_expiry);
  return jsonb_build_object('success',true,'voucherCode',v_code,'discountAmount',v_discount,'totalPoints',v_account.total_points,'tier',v_account.tier,'expiresAt',v_expiry);
end;
$function$;

CREATE OR REPLACE FUNCTION private.verify_customer_loyalty_voucher(p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_user_id uuid := (select auth.uid());
  v_phone text;
  v_voucher public.loyalty_vouchers%rowtype;
begin
  if v_user_id is null then raise exception using errcode='42501',message='Sign in before verifying a voucher'; end if;
  select phone into v_phone from auth.users where id=v_user_id and phone_confirmed_at is not null;
  if v_phone is null then raise exception using errcode='42501',message='Verified mobile OTP is required'; end if;
  v_phone:=private.normalize_customer_phone(v_phone);
  select lv.* into v_voucher
  from public.loyalty_vouchers lv
  join public.loyalty_accounts la on la.id=lv.account_id
  where upper(lv.code)=upper(trim(p_code))
    and la.phone=v_phone and la.customer_id=v_user_id
    and not lv.used and lv.expires_at>now()
  for update of lv;
  if not found then raise exception using errcode='P0002',message='Invalid, used or expired voucher'; end if;
  return jsonb_build_object('valid',true,'voucher',jsonb_build_object(
    'code',v_voucher.code,'title',v_voucher.title,'discountAmount',v_voucher.discount_amount
  ));
end;
$function$;
