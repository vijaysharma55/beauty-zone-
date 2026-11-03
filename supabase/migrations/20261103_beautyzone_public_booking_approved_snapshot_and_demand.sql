-- Booking must stay on the previous approved snapshot during a pending review; report slot demand to the UI.
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
  v_phone text := regexp_replace(coalesce(p_booking->>'phone',''),'\D','','g');
  v_total bigint := greatest(0,coalesce((p_booking->>'estimated_total')::bigint,0));
  v_user_phone text;
  v_discount bigint := 0;
  v_conflicts integer := 0;
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
    select * into v_salon from public.salons s
    where s.id=(p_booking->>'salon_id')::uuid
      and s.website_published and s.status in ('approved','pending') and not s.suspended
      and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved');
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

  if v_salon.id is not null then
    select count(*) into v_conflicts from public.bookings b
      where b.salon_id=v_salon.id and b.date=(p_booking->>'date')::date and b.time=p_booking->>'time'
        and b.status in ('requested','confirmed');
  end if;

  if v_code is not null then
    if (select auth.uid()) is null then raise exception using errcode='42501',message='Sign in and verify your mobile to use a loyalty voucher'; end if;
    select phone into v_user_phone from auth.users
      where id=(select auth.uid()) and phone_confirmed_at is not null;
    if v_user_phone is null or regexp_replace(v_user_phone,'\D','','g')<>v_phone then
      raise exception using errcode='42501',message='The booking phone must match your verified mobile number';
    end if;
    select lv.discount_amount into v_discount
    from public.loyalty_vouchers lv
    join public.loyalty_accounts la on la.id=lv.account_id
    where upper(lv.code)=v_code and la.customer_id=(select auth.uid())
      and la.phone=v_phone and not lv.used and lv.expires_at>v_now
    for update of lv;
    if not found then raise exception using errcode='P0002',message='Invalid, used or expired voucher'; end if;
    v_total:=greatest(0,v_total-v_discount);
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
  return jsonb_build_object(
    'booking',to_jsonb(v_booking),
    'discountApplied',v_discount,
    'highDemand',(v_conflicts>=2)
  );
end;
$$;
revoke all on function public.create_public_booking(jsonb) from public;
grant execute on function public.create_public_booking(jsonb) to anon,authenticated;
