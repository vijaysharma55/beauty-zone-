-- Supabase storage and transactional booking/loyalty workflows.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('beautyzone-assets','beautyzone-assets',true,5242880,array['image/png','image/jpeg','image/webp','image/gif'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists beautyzone_assets_public_read on storage.objects;
create policy beautyzone_assets_public_read on storage.objects
for select to anon,authenticated using (bucket_id='beautyzone-assets');

drop policy if exists beautyzone_assets_owner_insert on storage.objects;
create policy beautyzone_assets_owner_insert on storage.objects
for insert to authenticated with check (
  bucket_id='beautyzone-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists beautyzone_assets_owner_update on storage.objects;
create policy beautyzone_assets_owner_update on storage.objects
for update to authenticated using (
  bucket_id='beautyzone-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
) with check (
  bucket_id='beautyzone-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists beautyzone_assets_owner_delete on storage.objects;
create policy beautyzone_assets_owner_delete on storage.objects
for delete to authenticated using (
  bucket_id='beautyzone-assets'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

-- Publicly view only approved snapshots used by published salon websites.
drop policy if exists salon_versions_public_read on public.salon_versions;
create policy salon_versions_public_read on public.salon_versions
for select to anon,authenticated using (
  status='approved'
  and exists(select 1 from public.salons s where s.id=salon_versions.salon_id
    and s.website_published and s.status='approved' and not s.suspended)
);

-- The global showcase site may collect an unassigned enquiry without a salon id.
drop policy if exists waitlist_public_insert on public.waitlist;
create policy waitlist_public_insert on public.waitlist
for insert to anon,authenticated with check (
  (salon_id is null and status='pending')
  or exists(select 1 from public.salons s where s.id=waitlist.salon_id
    and s.website_published and s.status='approved' and not s.suspended)
);

create or replace function public.verify_customer_loyalty_voucher(p_code text)
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
$$;
revoke all on function public.verify_customer_loyalty_voucher(text) from public,anon;
grant execute on function public.verify_customer_loyalty_voucher(text) to authenticated;

-- Public booking creation validates the published salon/service/staff and atomically consumes
-- a voucher only when the caller owns the verified phone attached to that voucher.
create or replace function public.create_public_booking(p_booking jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := coalesce(nullif(p_booking->>'id','')::uuid,gen_random_uuid());
  v_salon public.salons%rowtype;
  v_service public.services%rowtype;
  v_staff public.staff%rowtype;
  v_booking public.bookings%rowtype;
  v_code text := nullif(upper(trim(coalesce(p_booking->>'promo_code',''))),'');
  v_phone text := private.normalize_customer_phone(p_booking->>'phone');
  v_total bigint := greatest(0,coalesce((p_booking->>'estimated_total')::bigint,0));
  v_user_phone text;
  v_discount bigint := 0;
  v_now timestamptz := now();
begin
  if length(trim(coalesce(p_booking->>'full_name','')))<2
     or length(trim(coalesce(p_booking->>'phone','')))<8
     or length(v_phone)<8
     or length(trim(coalesce(p_booking->>'service','')))<2
     or coalesce(p_booking->>'date','') !~ '^\d{4}-\d{2}-\d{2}$'
     or (p_booking->>'date')::date < current_date
     or coalesce(p_booking->>'time','') !~ '^([01]\d|2[0-3]):[0-5]\d$' then
    raise exception using errcode='22023',message='Booking details are invalid';
  end if;
  if coalesce(p_booking->>'location_type','salon') not in ('salon','home') then
    raise exception using errcode='22023',message='Invalid booking location type';
  end if;

  if nullif(p_booking->>'salon_id','') is not null then
    select * into v_salon from public.salons
    where id=(p_booking->>'salon_id')::uuid
      and website_published and status='approved' and not suspended;
    if not found then raise exception using errcode='P0002',message='Salon is not currently available for booking'; end if;
  end if;

  if nullif(p_booking->>'service_id','') is not null then
    select * into v_service from public.services
    where id=(p_booking->>'service_id')::uuid and salon_id=v_salon.id and active;
    if not found then raise exception using errcode='22023',message='Selected service is not available'; end if;
  end if;
  if nullif(p_booking->>'staff_id','') is not null then
    select * into v_staff from public.staff
    where id=(p_booking->>'staff_id')::uuid and salon_id=v_salon.id and active and booking_enabled;
    if not found then raise exception using errcode='22023',message='Selected specialist is not available'; end if;
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
    v_total:=greatest(0,v_total-(v_discount*100));
  end if;

  insert into public.bookings(
    id,salon_id,reference,full_name,phone,email,service,service_id,category,stylist,staff_id,
    date,time,booking_date,booking_time,location_type,branch,address,locality,distance_km,bridal_trial,
    notes,promo_code,estimated_total,advance_paid,advance_ref,status,source,created_by,created_at,updated_at
  ) values (
    v_id,nullif(p_booking->>'salon_id','')::uuid,
    coalesce(nullif(p_booking->>'reference',''),'BZ-'||upper(substr(encode(gen_random_bytes(6),'hex'),1,10))),
    left(trim(p_booking->>'full_name'),120),left(trim(p_booking->>'phone'),40),
    nullif(left(trim(coalesce(p_booking->>'email','')),254),''),
    left(trim(p_booking->>'service'),160),nullif(p_booking->>'service_id','')::uuid,
    left(coalesce(p_booking->>'category',''),80),left(coalesce(p_booking->>'stylist',''),120),
    nullif(p_booking->>'staff_id','')::uuid,(p_booking->>'date')::date,p_booking->>'time',
    (p_booking->>'date')::date,p_booking->>'time',coalesce(p_booking->>'location_type','salon'),
    left(coalesce(p_booking->>'branch',''),120),left(coalesce(p_booking->>'address',''),300),
    left(coalesce(p_booking->>'locality',''),150),nullif(p_booking->>'distance_km','')::numeric,
    coalesce((p_booking->>'bridal_trial')::boolean,false),left(coalesce(p_booking->>'notes',''),2000),
    v_code,v_total,0,null,'requested','public',(select auth.uid()),v_now,v_now
  ) returning * into v_booking;

  if v_code is not null then
    update public.loyalty_vouchers set used=true,used_booking_id=v_id where upper(code)=v_code;
  end if;
  return jsonb_build_object('booking',to_jsonb(v_booking),'discountApplied',v_discount);
end;
$$;
revoke all on function public.create_public_booking(jsonb) from public;
grant execute on function public.create_public_booking(jsonb) to anon,authenticated;

-- Owners can only complete their own salon bookings; points are credited exactly once.
create or replace function public.complete_salon_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings%rowtype;
  v_salon public.salons%rowtype;
  v_account public.loyalty_accounts%rowtype;
  v_points integer := 0;
  v_base integer := 0;
  v_tier text;
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
$$;
revoke all on function public.complete_salon_booking(uuid) from public,anon;
grant execute on function public.complete_salon_booking(uuid) to authenticated;

-- Claim an unlinked account after phone OTP verification; never disclose or match by typed phone alone.
create or replace function public.ensure_customer_loyalty_account(p_name text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  v_phone:=regexp_replace(v_phone,'\D','','g');
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
$$;
revoke all on function public.ensure_customer_loyalty_account(text) from public,anon;
grant execute on function public.ensure_customer_loyalty_account(text) to authenticated;
