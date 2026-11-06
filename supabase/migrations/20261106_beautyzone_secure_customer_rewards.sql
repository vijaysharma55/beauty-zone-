-- Secure, Supabase-backed BeautyZone customer rewards.
-- Customer identity is established only by a verified Supabase phone OTP.
-- All balance, tier, voucher, and booking-award writes are atomic Postgres RPCs.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create table if not exists public.loyalty_reward_offers (
  id text primary key,
  title text not null,
  description text not null default '',
  points_cost integer not null check (points_cost > 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  discount_value text not null default '',
  minimum_bill_amount bigint not null default 0 check (minimum_bill_amount >= 0),
  eligible_service_keyword text,
  eligible_location_type text check (eligible_location_type in ('salon','home')),
  eligible_max_distance_km numeric check (eligible_max_distance_km is null or eligible_max_distance_km >= 0),
  category text not null check (category in ('discount','free_service','upgrade','bridal')),
  badge text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.loyalty_reward_offers enable row level security;
drop policy if exists loyalty_reward_offers_public_active_select on public.loyalty_reward_offers;
create policy loyalty_reward_offers_public_active_select
  on public.loyalty_reward_offers for select to anon, authenticated
  using (active = true);
revoke all on table public.loyalty_reward_offers from public, anon, authenticated;
grant select on table public.loyalty_reward_offers to anon, authenticated;

insert into public.loyalty_reward_offers
  (id,title,description,points_cost,discount_amount,discount_value,minimum_bill_amount,eligible_service_keyword,eligible_location_type,eligible_max_distance_km,category,badge,sort_order,active)
values
  ('rew-1','₹500 Instant Salon Voucher','Use on eligible salon services with a minimum bill of ₹1,500.',500,500,'₹500 Flat Off',1500,null,null,null,'discount','Popular',1,true),
  ('rew-2','Free Moroccan Scalp & Hair Spa','Deep nourishing argan oil hair spa with hot towel steam and relaxing head massage.',750,1800,'100% Free Service (Worth ₹1,800)',1800,'hair spa',null,null,'free_service','Best Value',2,true),
  ('rew-3','24K Gold Foil Facial Upgrade','Upgrade an eligible regular facial to the signature 24K Gold Leaf facial.',1000,2500,'Free Luxury Upgrade (Worth ₹2,500)',2500,'facial',null,null,'upgrade','Royal Favorite',3,true),
  ('rew-4','Complimentary Gel Nail Art Set','Complimentary gel nail art set with crystal accents and chrome finish.',650,1499,'100% Free Service (Worth ₹1,499)',1499,'nail',null,null,'free_service',null,4,true),
  ('rew-5','₹1,500 Royal Bridal Booking Discount','Use on eligible Signature HD or Airbrush bridal makeup packages.',1500,1500,'₹1,500 Off Bridal',0,'bridal',null,null,'bridal','Bridal Special',5,true),
  ('rew-6','Free Home Salon Travel Pass','Waives eligible doorstep travel fees up to 15 km.',400,600,'Free Home Travel (Worth ₹600)',0,null,'home',15,'discount',null,6,true)
on conflict (id) do update set
  title=excluded.title,
  description=excluded.description,
  points_cost=excluded.points_cost,
  discount_amount=excluded.discount_amount,
  discount_value=excluded.discount_value,
  minimum_bill_amount=excluded.minimum_bill_amount,
  eligible_service_keyword=excluded.eligible_service_keyword,
  eligible_location_type=excluded.eligible_location_type,
  eligible_max_distance_km=excluded.eligible_max_distance_km,
  category=excluded.category,
  badge=excluded.badge,
  sort_order=excluded.sort_order,
  active=excluded.active,
  updated_at=now();

-- Browser sessions may inspect only rows allowed by RLS. All balance, transaction,
-- voucher and membership writes must go through the SECURITY DEFINER RPCs below.
revoke insert, update, delete on table public.loyalty_accounts,
  public.loyalty_transactions, public.loyalty_vouchers
  from public, anon, authenticated;
grant select on table public.loyalty_accounts,
  public.loyalty_transactions, public.loyalty_vouchers
  to authenticated;

alter table public.loyalty_transactions
  add column if not exists source_booking_id text,
  add column if not exists redeem_request_id uuid,
  add column if not exists legacy_transaction_id text;

alter table public.loyalty_vouchers
  add column if not exists redeem_request_id uuid,
  add column if not exists external_booking_id text;

create unique index if not exists loyalty_transactions_source_booking_uidx
  on public.loyalty_transactions(source_booking_id)
  where source_booking_id is not null and transaction_type = 'earn';
create unique index if not exists loyalty_transactions_legacy_id_uidx
  on public.loyalty_transactions(legacy_transaction_id);
create unique index if not exists loyalty_transactions_redeem_request_uidx
  on public.loyalty_transactions(redeem_request_id)
  where redeem_request_id is not null;
create unique index if not exists loyalty_vouchers_redeem_request_uidx
  on public.loyalty_vouchers(redeem_request_id)
  where redeem_request_id is not null;
create index if not exists loyalty_vouchers_external_booking_idx
  on public.loyalty_vouchers(external_booking_id)
  where external_booking_id is not null;

-- Membership tier is based on lifetime earned points, never the current spendable balance.
create or replace function private.ensure_customer_loyalty_account(p_name text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_raw_phone text;
  v_phone text;
  v_email text;
  v_account public.loyalty_accounts%rowtype;
  v_member text;
  v_name text;
begin
  if v_user_id is null then
    raise exception using errcode='42501', message='Sign in with your mobile OTP before opening rewards';
  end if;

  select u.phone, u.email into v_raw_phone, v_email
  from auth.users u
  where u.id=v_user_id and u.phone_confirmed_at is not null;
  if v_raw_phone is null then
    raise exception using errcode='42501', message='A verified phone OTP is required';
  end if;

  v_phone := regexp_replace(v_raw_phone,'[^0-9]','','g');
  if length(v_phone)=12 and left(v_phone,2)='91' then
    v_phone := right(v_phone,10);
  end if;
  if length(v_phone)<>10 then
    raise exception using errcode='22023', message='Verified Indian mobile number must contain 10 digits';
  end if;

  v_name := left(coalesce(nullif(trim(p_name),''), nullif(split_part(coalesce(v_email,''),'@',1),''), 'BeautyZone Guest'),120);

  -- Serialize claims by verified mobile number so concurrent OTP callbacks
  -- cannot create duplicate welcome bonuses or take over an existing account.
  perform pg_advisory_xact_lock(hashtextextended(v_phone,0));

  select * into v_account
  from public.loyalty_accounts
  where customer_id=v_user_id
  for update;

  if found then
    if v_account.phone <> v_phone then
      if exists (
        select 1 from public.loyalty_accounts
        where phone=v_phone and customer_id is distinct from v_user_id
      ) then
        raise exception using errcode='23505', message='This mobile number is already linked to another customer account';
      end if;
      update public.loyalty_accounts
      set phone=v_phone,
          name=case when trim(coalesce(p_name,''))<>'' then v_name else name end,
          tier=case when lifetime_points>=1500 then 'platinum' when lifetime_points>=500 then 'gold' else 'silver' end,
          updated_at=now()
      where id=v_account.id
      returning * into v_account;
    elsif trim(coalesce(p_name,''))<>'' and v_account.name<>v_name then
      update public.loyalty_accounts set name=v_name,updated_at=now()
      where id=v_account.id returning * into v_account;
    end if;
    return to_jsonb(v_account);
  end if;

  select * into v_account
  from public.loyalty_accounts
  where phone=v_phone
  for update;

  if found then
    if v_account.customer_id is not null and v_account.customer_id <> v_user_id then
      raise exception using errcode='23505', message='This mobile number is already linked to another customer account';
    end if;
    update public.loyalty_accounts
    set customer_id=v_user_id,
        name=case when trim(coalesce(p_name,''))<>'' then v_name else name end,
        tier=case when lifetime_points>=1500 then 'platinum' when lifetime_points>=500 then 'gold' else 'silver' end,
        updated_at=now()
    where id=v_account.id
    returning * into v_account;
    return to_jsonb(v_account);
  end if;

  v_member := 'VIP-' || right(v_phone,4) || '-' || upper(substr(encode(extensions.gen_random_bytes(4),'hex'),1,8));
  insert into public.loyalty_accounts
    (owner_id,customer_id,phone,name,member_id,tier,total_points,lifetime_points,visits_count)
  values
    (null,v_user_id,v_phone,v_name,v_member,'silver',100,100,0)
  returning * into v_account;

  insert into public.loyalty_transactions
    (account_id,phone,service_title,bill_amount,points,transaction_type,type,description)
  values
    (v_account.id,v_phone,'Welcome Loyalty Bonus',0,100,'bonus','bonus','Welcome gift for joining BeautyZone VIP Rewards');
  return to_jsonb(v_account);
end;
$$;
revoke all on function private.ensure_customer_loyalty_account(text) from public, anon, authenticated;
grant execute on function private.ensure_customer_loyalty_account(text) to authenticated;

create or replace function private.get_customer_loyalty_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_account public.loyalty_accounts%rowtype;
  v_phone text;
begin
  if v_user_id is null then
    raise exception using errcode='42501', message='Sign in before viewing loyalty details';
  end if;
  select regexp_replace(u.phone,'[^0-9]','','g') into v_phone
  from auth.users u where u.id=v_user_id and u.phone_confirmed_at is not null;
  if v_phone is null then
    raise exception using errcode='42501', message='A verified phone OTP is required';
  end if;
  if length(v_phone)=12 and left(v_phone,2)='91' then v_phone:=right(v_phone,10); end if;

  select * into v_account from public.loyalty_accounts
  where customer_id=v_user_id and phone=v_phone
  for share;
  if not found then
    raise exception using errcode='P0002', message='Customer rewards account not found';
  end if;

  return jsonb_build_object(
    'account', jsonb_build_object(
      'phone',v_account.phone,
      'name',v_account.name,
      'memberId',v_account.member_id,
      'tier',v_account.tier,
      'totalPoints',v_account.total_points,
      'lifetimePoints',v_account.lifetime_points,
      'visitsCount',v_account.visits_count,
      'joinedDate',v_account.created_at
    ),
    'activities',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',t.id,'date',t.created_at,'serviceTitle',t.service_title,
        'billAmount',t.bill_amount,'pointsEarned',t.points,
        'type',coalesce(t.type,t.transaction_type),'description',t.description
      ) order by t.created_at desc)
      from (
        select * from public.loyalty_transactions
        where account_id=v_account.id
        order by created_at desc
        limit 50
      ) t
    ),'[]'::jsonb),
    'vouchers',coalesce((
      select jsonb_agg(jsonb_build_object(
        'voucherCode',v.code,'rewardTitle',v.title,'discountAmount',v.discount_amount,
        'pointsCost',v.points_cost,'dateRedeemed',v.created_at,'validTill',v.expires_at,
        'used',v.used,
        'status',case when v.used then 'used' when v.expires_at<=now() then 'expired' else 'active' end,
        'discountValue',coalesce(o.discount_value,'₹'||v.discount_amount::text||' Off')
      ) order by v.created_at desc)
      from public.loyalty_vouchers v
      left join public.loyalty_reward_offers o on o.id=v.offer_id
      where v.account_id=v_account.id
    ),'[]'::jsonb),
    'offers',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',o.id,'title',o.title,'description',o.description,
        'pointsCost',o.points_cost,'discountAmount',o.discount_amount,
        'discountValue',o.discount_value,'minimumBillAmount',o.minimum_bill_amount,
        'eligibleServiceKeyword',o.eligible_service_keyword,'eligibleLocationType',o.eligible_location_type,
        'category',o.category,'badge',o.badge
      ) order by o.sort_order asc)
      from public.loyalty_reward_offers o where o.active=true
    ),'[]'::jsonb)
  );
end;
$$;
revoke all on function private.get_customer_loyalty_dashboard() from public, anon, authenticated;
grant execute on function private.get_customer_loyalty_dashboard() to authenticated;

create or replace function private.redeem_customer_loyalty_reward(
  p_offer_id text,
  p_request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_phone text;
  v_account public.loyalty_accounts%rowtype;
  v_offer public.loyalty_reward_offers%rowtype;
  v_existing public.loyalty_vouchers%rowtype;
  v_code text;
  v_new_balance integer;
  v_expiry timestamptz := now()+interval '60 days';
begin
  if v_user_id is null or p_request_id is null then
    raise exception using errcode='42501', message='A signed-in customer and request id are required';
  end if;
  select regexp_replace(u.phone,'[^0-9]','','g') into v_phone
  from auth.users u where u.id=v_user_id and u.phone_confirmed_at is not null;
  if v_phone is null then raise exception using errcode='42501', message='Verified mobile OTP is required'; end if;
  if length(v_phone)=12 and left(v_phone,2)='91' then v_phone:=right(v_phone,10); end if;

  select * into v_account from public.loyalty_accounts
  where customer_id=v_user_id and phone=v_phone for update;
  if not found then raise exception using errcode='P0002', message='Loyalty account not found'; end if;

  select * into v_existing from public.loyalty_vouchers
  where account_id=v_account.id and redeem_request_id=p_request_id;
  if found then
    if v_existing.offer_id <> p_offer_id then
      raise exception using errcode='22023', message='This redemption request id was already used for a different reward';
    end if;
    return jsonb_build_object(
      'success',true,'voucherCode',v_existing.code,'discountAmount',v_existing.discount_amount,
      'totalPoints',v_account.total_points,'tier',v_account.tier,'expiresAt',v_existing.expires_at,
      'alreadyRedeemed',true
    );
  end if;

  select * into v_offer from public.loyalty_reward_offers
  where id=p_offer_id and active=true;
  if not found then raise exception using errcode='22023', message='This reward is no longer available'; end if;
  if v_account.total_points < v_offer.points_cost then
    raise exception using errcode='23514', message='Insufficient loyalty points';
  end if;

  v_new_balance := v_account.total_points-v_offer.points_cost;
  update public.loyalty_accounts
  set total_points=v_new_balance,
      tier=case when lifetime_points>=1500 then 'platinum' when lifetime_points>=500 then 'gold' else 'silver' end,
      updated_at=now()
  where id=v_account.id
  returning * into v_account;

  v_code := 'VIP-'||v_offer.discount_amount::text||'-'||right(v_account.phone,4)||'-'||upper(substr(encode(extensions.gen_random_bytes(4),'hex'),1,8));
  insert into public.loyalty_vouchers
    (code,account_id,phone,offer_id,title,discount_amount,points_cost,used,created_at,expires_at,redeem_request_id)
  values
    (v_code,v_account.id,v_account.phone,v_offer.id,v_offer.title,v_offer.discount_amount,v_offer.points_cost,false,now(),v_expiry,p_request_id);

  insert into public.loyalty_transactions
    (account_id,phone,service_title,bill_amount,points,transaction_type,type,description,redeem_request_id)
  values
    (v_account.id,v_account.phone,v_offer.title,0,-v_offer.points_cost,'redeem','redeem',
     'Redeemed '||v_offer.points_cost||' points for voucher '||v_code,p_request_id);

  return jsonb_build_object(
    'success',true,'voucherCode',v_code,'discountAmount',v_offer.discount_amount,
    'totalPoints',v_account.total_points,'tier',v_account.tier,'expiresAt',v_expiry,
    'alreadyRedeemed',false
  );
end;
$$;
revoke all on function private.redeem_customer_loyalty_reward(text,uuid) from public, anon, authenticated;
grant execute on function private.redeem_customer_loyalty_reward(text,uuid) to authenticated;

revoke all on function private.redeem_customer_loyalty_reward(text) from public, anon, authenticated;
drop function if exists private.redeem_customer_loyalty_reward(text);

-- Remove the older single-argument public RPC; the old private RPC is also dropped above.
drop function if exists public.redeem_customer_loyalty_reward(text);

create or replace function private.verify_customer_loyalty_voucher(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_phone text;
  v_voucher public.loyalty_vouchers%rowtype;
begin
  if v_user_id is null then raise exception using errcode='42501', message='Sign in with phone OTP to use a rewards voucher'; end if;
  select regexp_replace(u.phone,'[^0-9]','','g') into v_phone
  from auth.users u where u.id=v_user_id and u.phone_confirmed_at is not null;
  if v_phone is null then raise exception using errcode='42501', message='Verified phone OTP is required'; end if;
  if length(v_phone)=12 and left(v_phone,2)='91' then v_phone:=right(v_phone,10); end if;

  select v.* into v_voucher
  from public.loyalty_vouchers v
  join public.loyalty_accounts a on a.id=v.account_id
  where upper(v.code)=upper(trim(p_code))
    and a.customer_id=v_user_id and a.phone=v_phone
  for update of v;
  if not found then raise exception using errcode='P0002', message='Voucher not found for this verified customer'; end if;
  if v_voucher.used then raise exception using errcode='23514', message='This voucher has already been used'; end if;
  if v_voucher.expires_at<=now() then raise exception using errcode='23514', message='This voucher has expired'; end if;

  return jsonb_build_object(
    'valid',true,
    'voucher',jsonb_build_object(
      'code',v_voucher.code,'title',v_voucher.title,
      'discountAmount',v_voucher.discount_amount,'phone',v_voucher.phone,
      'offerId',v_voucher.offer_id
    )
  );
end;
$$;
revoke all on function private.verify_customer_loyalty_voucher(text) from public, anon, authenticated;
grant execute on function private.verify_customer_loyalty_voucher(text) to authenticated;

create or replace function private.validate_customer_loyalty_voucher(
  p_code text,
  p_booking_phone text,
  p_service_title text,
  p_location_type text,
  p_bill_amount bigint,
  p_distance_km numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_verified_phone text;
  v_booking_phone text;
  v_account public.loyalty_accounts%rowtype;
  v_voucher public.loyalty_vouchers%rowtype;
  v_offer public.loyalty_reward_offers%rowtype;
begin
  if v_user_id is null then raise exception using errcode='42501', message='Sign in with phone OTP before applying a rewards voucher'; end if;
  select regexp_replace(u.phone,'[^0-9]','','g') into v_verified_phone
  from auth.users u where u.id=v_user_id and u.phone_confirmed_at is not null;
  if v_verified_phone is null then raise exception using errcode='42501', message='Verified phone OTP is required'; end if;
  if length(v_verified_phone)=12 and left(v_verified_phone,2)='91' then v_verified_phone:=right(v_verified_phone,10); end if;

  v_booking_phone:=regexp_replace(coalesce(p_booking_phone,''),'[^0-9]','','g');
  if length(v_booking_phone)=12 and left(v_booking_phone,2)='91' then v_booking_phone:=right(v_booking_phone,10); end if;
  if v_booking_phone<>v_verified_phone then
    raise exception using errcode='42501', message='The booking mobile number must match the verified rewards account';
  end if;
  if coalesce(p_location_type,'') not in ('salon','home') then
    raise exception using errcode='22023', message='A valid booking location is required';
  end if;
  if coalesce(p_bill_amount,0)<=0 then
    raise exception using errcode='22023', message='A positive booking amount is required to use a voucher';
  end if;

  select * into v_account from public.loyalty_accounts
  where customer_id=v_user_id and phone=v_verified_phone;
  if not found then raise exception using errcode='P0002', message='Rewards account not found'; end if;

  select * into v_voucher from public.loyalty_vouchers
  where upper(code)=upper(trim(p_code)) and account_id=v_account.id
  for update;
  if not found then raise exception using errcode='P0002', message='Voucher not found for this verified customer'; end if;
  if v_voucher.used then raise exception using errcode='23514', message='This voucher has already been used'; end if;
  if v_voucher.expires_at<=now() then raise exception using errcode='23514', message='This voucher has expired'; end if;

  select * into v_offer from public.loyalty_reward_offers
  where id=v_voucher.offer_id and active=true;
  if not found then raise exception using errcode='22023', message='This reward is no longer available'; end if;
  if coalesce(p_bill_amount,0)<v_offer.minimum_bill_amount then
    raise exception using errcode='23514', message='This reward requires a minimum eligible bill of ₹'||v_offer.minimum_bill_amount::text;
  end if;
  if v_offer.eligible_service_keyword is not null
    and position(lower(v_offer.eligible_service_keyword) in lower(coalesce(p_service_title,'')))=0 then
    raise exception using errcode='23514', message='This voucher can only be used for an eligible '||v_offer.eligible_service_keyword||' service';
  end if;
  if v_offer.eligible_location_type is not null and v_offer.eligible_location_type<>p_location_type then
    raise exception using errcode='23514', message='This voucher is valid only for an eligible doorstep home booking';
  end if;
  if v_offer.eligible_max_distance_km is not null
    and (p_distance_km is null or p_distance_km < 0 or p_distance_km > v_offer.eligible_max_distance_km) then
    raise exception using errcode='23514', message='This home travel reward is valid only within '||v_offer.eligible_max_distance_km::text||' km';
  end if;

  return jsonb_build_object(
    'valid',true,
    'voucher',jsonb_build_object(
      'code',v_voucher.code,'title',v_voucher.title,
      'discountAmount',least(v_voucher.discount_amount,coalesce(p_bill_amount,0)),
      'phone',v_voucher.phone,'offerId',v_voucher.offer_id
    )
  );
end;
$$;
revoke all on function private.validate_customer_loyalty_voucher(text,text,text,text,bigint,numeric) from public, anon, authenticated;
grant execute on function private.validate_customer_loyalty_voucher(text,text,text,text,bigint,numeric) to authenticated;
create or replace function private.consume_customer_loyalty_voucher(
  p_code text,
  p_external_booking_id text,
  p_booking_phone text,
  p_service_title text,
  p_location_type text,
  p_bill_amount bigint,
  p_distance_km numeric
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_verified_phone text;
  v_booking_phone text;
  v_voucher public.loyalty_vouchers%rowtype;
  v_account public.loyalty_accounts%rowtype;
  v_offer public.loyalty_reward_offers%rowtype;
  v_discount bigint;
begin
  if v_user_id is null or nullif(trim(p_external_booking_id),'') is null then
    raise exception using errcode='42501', message='A signed-in customer and booking reference are required';
  end if;
  if length(p_external_booking_id)>180 then
    raise exception using errcode='22023', message='Booking reference is too long';
  end if;
  select regexp_replace(u.phone,'[^0-9]','','g') into v_verified_phone
  from auth.users u where u.id=v_user_id and u.phone_confirmed_at is not null;
  if v_verified_phone is null then raise exception using errcode='42501', message='Verified phone OTP is required'; end if;
  if length(v_verified_phone)=12 and left(v_verified_phone,2)='91' then v_verified_phone:=right(v_verified_phone,10); end if;

  v_booking_phone:=regexp_replace(coalesce(p_booking_phone,''),'[^0-9]','','g');
  if length(v_booking_phone)=12 and left(v_booking_phone,2)='91' then v_booking_phone:=right(v_booking_phone,10); end if;
  if v_booking_phone<>v_verified_phone then
    raise exception using errcode='42501', message='The booking mobile number must match the verified rewards account';
  end if;
  if coalesce(p_location_type,'') not in ('salon','home') then
    raise exception using errcode='22023', message='A valid booking location is required';
  end if;
  if coalesce(p_bill_amount,0)<=0 then
    raise exception using errcode='22023', message='A positive booking amount is required to use a voucher';
  end if;

  select * into v_account from public.loyalty_accounts
  where customer_id=v_user_id and phone=v_verified_phone;
  if not found then raise exception using errcode='P0002', message='Rewards account not found'; end if;

  select * into v_voucher from public.loyalty_vouchers
  where upper(code)=upper(trim(p_code)) and account_id=v_account.id
  for update;
  if not found then raise exception using errcode='P0002', message='Voucher not found for this verified customer'; end if;
  select * into v_offer from public.loyalty_reward_offers
  where id=v_voucher.offer_id and active=true;
  if not found then raise exception using errcode='22023', message='This reward is no longer available'; end if;
  if v_voucher.expires_at<=now() then raise exception using errcode='23514', message='This voucher has expired'; end if;
  if v_voucher.used then
    if v_voucher.external_booking_id=p_external_booking_id then
      return jsonb_build_object('success',true,'alreadyConsumed',true,
        'discountAmount',least(v_voucher.discount_amount,coalesce(p_bill_amount,0)),'title',v_voucher.title);
    end if;
    raise exception using errcode='23514', message='This voucher has already been used';
  end if;
  if coalesce(p_bill_amount,0)<v_offer.minimum_bill_amount then
    raise exception using errcode='23514', message='This reward requires a minimum eligible bill of ₹'||v_offer.minimum_bill_amount::text;
  end if;
  if v_offer.eligible_service_keyword is not null
    and position(lower(v_offer.eligible_service_keyword) in lower(coalesce(p_service_title,'')))=0 then
    raise exception using errcode='23514', message='This voucher can only be used for an eligible '||v_offer.eligible_service_keyword||' service';
  end if;
  if v_offer.eligible_location_type is not null and v_offer.eligible_location_type<>p_location_type then
    raise exception using errcode='23514', message='This voucher is valid only for an eligible doorstep home booking';
  end if;
  if v_offer.eligible_max_distance_km is not null
    and (p_distance_km is null or p_distance_km < 0 or p_distance_km > v_offer.eligible_max_distance_km) then
    raise exception using errcode='23514', message='This home travel reward is valid only within '||v_offer.eligible_max_distance_km::text||' km';
  end if;

  v_discount:=least(v_voucher.discount_amount,coalesce(p_bill_amount,0));
  update public.loyalty_vouchers
  set used=true,external_booking_id=p_external_booking_id
  where id=v_voucher.id;

  return jsonb_build_object('success',true,'alreadyConsumed',false,
    'discountAmount',v_discount,'title',v_voucher.title);
end;
$$;
revoke all on function private.consume_customer_loyalty_voucher(text,text,text,text,text,bigint,numeric) from public, anon, authenticated;
grant execute on function private.consume_customer_loyalty_voucher(text,text,text,text,text,bigint,numeric) to authenticated;
create or replace function private.release_customer_loyalty_voucher(
  p_code text,
  p_external_booking_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_voucher public.loyalty_vouchers%rowtype;
begin
  if nullif(trim(p_code),'') is null or nullif(trim(p_external_booking_id),'') is null
    or length(p_external_booking_id)>180 then
    raise exception using errcode='22023', message='Voucher code and booking reference are required';
  end if;
  select * into v_voucher
  from public.loyalty_vouchers
  where upper(code)=upper(trim(p_code))
    and external_booking_id=p_external_booking_id
    and used=true
  for update;
  if not found then
    return jsonb_build_object('success',true,'released',false,'alreadyReleased',true);
  end if;
  if v_voucher.expires_at<=now() then
    return jsonb_build_object('success',true,'released',false,'expired',true);
  end if;
  update public.loyalty_vouchers set used=false,external_booking_id=null where id=v_voucher.id;
  return jsonb_build_object('success',true,'released',true,'voucherCode',v_voucher.code);
end;
$$;
revoke all on function private.release_customer_loyalty_voucher(text,text) from public, anon, authenticated;
grant execute on function private.release_customer_loyalty_voucher(text,text) to service_role;

create or replace function private.award_completed_loyalty_points(
  p_actor_id uuid,
  p_phone text,
  p_name text,
  p_external_booking_id text,
  p_service_title text,
  p_bill_amount bigint
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_profile_status text;
  v_phone text;
  v_account public.loyalty_accounts%rowtype;
  v_existing public.loyalty_transactions%rowtype;
  v_points integer;
  v_member text;
  v_multiplier numeric := 1;
begin
  -- Only service_role is granted EXECUTE on this private routine.
  if p_actor_id is null then raise exception using errcode='22023', message='Authenticated salon owner identity is required'; end if;

  select role,status into v_role,v_profile_status from public.profiles where id=p_actor_id;
  if coalesce(v_profile_status,'')<>'active' then
    raise exception using errcode='42501', message='The salon owner or admin profile is not active';
  end if;
  if coalesce(v_role,'') not in ('salon_owner','super_admin') then
    raise exception using errcode='42501', message='Only a salon owner or super admin may award visit points';
  end if;
  if v_role='salon_owner' and not exists (
    select 1 from public.salons s where s.owner_id=p_actor_id and not s.suspended
  ) then
    raise exception using errcode='42501', message='No active salon is linked to this owner';
  end if;
  if nullif(trim(p_external_booking_id),'') is null or length(p_external_booking_id)>180 then
    raise exception using errcode='22023', message='A valid booking reference is required';
  end if;
  if p_bill_amount is null or p_bill_amount<=0 or p_bill_amount>10000000 then
    raise exception using errcode='22023', message='A valid completed bill amount is required';
  end if;

  v_phone := regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  if length(v_phone)=12 and left(v_phone,2)='91' then v_phone:=right(v_phone,10); end if;
  if length(v_phone)<>10 then raise exception using errcode='22023', message='Customer mobile number is invalid'; end if;

  perform pg_advisory_xact_lock(hashtextextended(v_phone,0));
  select * into v_account from public.loyalty_accounts where phone=v_phone for update;
  if not found then
    v_member := 'VIP-'||right(v_phone,4)||'-'||upper(substr(encode(extensions.gen_random_bytes(4),'hex'),1,8));
    insert into public.loyalty_accounts
      (owner_id,customer_id,phone,name,member_id,tier,total_points,lifetime_points,visits_count)
    values
      (p_actor_id,null,v_phone,left(coalesce(nullif(trim(p_name),''),'BeautyZone Guest'),120),v_member,'silver',0,0,0)
    returning * into v_account;
  elsif v_account.owner_id is null then
    update public.loyalty_accounts set owner_id=p_actor_id,updated_at=now()
    where id=v_account.id returning * into v_account;
  end if;

  select * into v_existing from public.loyalty_transactions
  where source_booking_id=p_external_booking_id and transaction_type='earn';
  if found then
    return jsonb_build_object(
      'awarded',false,'alreadyAwarded',true,'pointsEarned',v_existing.points,
      'totalPoints',v_account.total_points,'lifetimePoints',v_account.lifetime_points,'tier',v_account.tier
    );
  end if;

  v_multiplier := case v_account.tier when 'platinum' then 1.5 when 'gold' then 1.25 else 1 end;
  v_points := round(greatest(100::numeric,round(p_bill_amount::numeric/10)) * v_multiplier)::integer;

  update public.loyalty_accounts
  set total_points=total_points+v_points,
      lifetime_points=lifetime_points+v_points,
      visits_count=visits_count+1,
      tier=case when lifetime_points+v_points>=1500 then 'platinum'
                when lifetime_points+v_points>=500 then 'gold' else 'silver' end,
      updated_at=now()
  where id=v_account.id
  returning * into v_account;

  insert into public.loyalty_transactions
    (account_id,phone,service_title,bill_amount,points,transaction_type,type,description,source_booking_id)
  values
    (v_account.id,v_phone,left(coalesce(nullif(trim(p_service_title),''),'Salon Service'),160),
     p_bill_amount,v_points,'earn','earn',
     'Earned '||v_points||' points for completed salon booking '||p_external_booking_id,
     p_external_booking_id);

  return jsonb_build_object(
    'awarded',true,'alreadyAwarded',false,'pointsEarned',v_points,
    'totalPoints',v_account.total_points,'lifetimePoints',v_account.lifetime_points,'tier',v_account.tier
  );
end;
$$;
drop function if exists public.award_completed_loyalty_points(text,text,text,text,bigint);
revoke all on function private.award_completed_loyalty_points(uuid,text,text,text,text,bigint) from public, anon, authenticated;
grant execute on function private.award_completed_loyalty_points(uuid,text,text,text,text,bigint) to service_role;


-- PostgREST entry points are SECURITY INVOKER wrappers. Privileged functions
-- themselves live in the non-exposed private schema.
create or replace function public.ensure_customer_loyalty_account(p_name text default '')
returns jsonb language sql security invoker set search_path = ''
as $$ select private.ensure_customer_loyalty_account(p_name); $$;
revoke all on function public.ensure_customer_loyalty_account(text) from public, anon;
grant execute on function public.ensure_customer_loyalty_account(text) to authenticated;

create or replace function public.get_customer_loyalty_dashboard()
returns jsonb language sql security invoker set search_path = ''
as $$ select private.get_customer_loyalty_dashboard(); $$;
revoke all on function public.get_customer_loyalty_dashboard() from public, anon;
grant execute on function public.get_customer_loyalty_dashboard() to authenticated;

create or replace function public.redeem_customer_loyalty_reward(p_offer_id text, p_request_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.redeem_customer_loyalty_reward(p_offer_id,p_request_id); $$;
revoke all on function public.redeem_customer_loyalty_reward(text,uuid) from public, anon;
grant execute on function public.redeem_customer_loyalty_reward(text,uuid) to authenticated;

create or replace function public.verify_customer_loyalty_voucher(p_code text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.verify_customer_loyalty_voucher(p_code); $$;
revoke all on function public.verify_customer_loyalty_voucher(text) from public, anon;
grant execute on function public.verify_customer_loyalty_voucher(text) to authenticated;

create or replace function public.validate_customer_loyalty_voucher(
  p_code text,p_booking_phone text,p_service_title text,p_location_type text,
  p_bill_amount bigint,p_distance_km numeric
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.validate_customer_loyalty_voucher(
  p_code,p_booking_phone,p_service_title,p_location_type,p_bill_amount,p_distance_km
); $$;
revoke all on function public.validate_customer_loyalty_voucher(text,text,text,text,bigint,numeric) from public, anon;
grant execute on function public.validate_customer_loyalty_voucher(text,text,text,text,bigint,numeric) to authenticated;

create or replace function public.consume_customer_loyalty_voucher(
  p_code text,p_external_booking_id text,p_booking_phone text,p_service_title text,
  p_location_type text,p_bill_amount bigint,p_distance_km numeric
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.consume_customer_loyalty_voucher(
  p_code,p_external_booking_id,p_booking_phone,p_service_title,p_location_type,p_bill_amount,p_distance_km
); $$;
revoke all on function public.consume_customer_loyalty_voucher(text,text,text,text,text,bigint,numeric) from public, anon;
grant execute on function public.consume_customer_loyalty_voucher(text,text,text,text,text,bigint,numeric) to authenticated;

create or replace function public.release_customer_loyalty_voucher(p_code text,p_external_booking_id text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.release_customer_loyalty_voucher(p_code,p_external_booking_id); $$;
revoke all on function public.release_customer_loyalty_voucher(text,text) from public, anon, authenticated;
grant execute on function public.release_customer_loyalty_voucher(text,text) to service_role;

create or replace function public.award_completed_loyalty_points(
  p_actor_id uuid,p_phone text,p_name text,p_external_booking_id text,
  p_service_title text,p_bill_amount bigint
)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.award_completed_loyalty_points(
  p_actor_id,p_phone,p_name,p_external_booking_id,p_service_title,p_bill_amount
); $$;
revoke all on function public.award_completed_loyalty_points(uuid,text,text,text,text,bigint) from public, anon, authenticated;
grant execute on function public.award_completed_loyalty_points(uuid,text,text,text,text,bigint) to service_role;

