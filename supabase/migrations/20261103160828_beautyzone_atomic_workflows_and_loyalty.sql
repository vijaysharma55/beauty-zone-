-- Atomic salon onboarding, approval review, subscriptions and verified-customer loyalty.
create unique index if not exists subscriptions_one_per_salon_uidx on public.subscriptions(salon_id);
create unique index if not exists loyalty_accounts_customer_id_uidx on public.loyalty_accounts(customer_id) where customer_id is not null;

drop policy if exists subscriptions_owner_trial_insert on public.subscriptions;
create policy subscriptions_owner_trial_insert on public.subscriptions
for insert to authenticated
with check (
  status = 'trialing'
  and plan in ('trial','starter')
  and exists (select 1 from public.salons s where s.id=subscriptions.salon_id and s.owner_id=(select auth.uid()))
);

create or replace function public.submit_salon_for_approval(
  p_salon_id uuid,
  p_snapshot jsonb,
  p_content_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_salon public.salons%rowtype;
  v_user public.profiles%rowtype;
  v_service_count integer;
  v_existing public.salon_versions%rowtype;
  v_version integer;
  v_id uuid;
  v_now timestamptz := now();
begin
  select * into v_salon from public.salons
  where id=p_salon_id and owner_id=(select auth.uid())
  for update;
  if not found then raise exception using errcode='42501', message='You can only submit your own salon'; end if;

  select * into v_user from public.profiles where id=(select auth.uid());
  if not coalesce(v_user.email_verified,false) then
    raise exception using errcode='23514', message='Verify your email address before submitting for approval';
  end if;
  if v_salon.suspended then raise exception using errcode='23514', message='This salon is suspended by the platform'; end if;
  select count(*) into v_service_count from public.services where salon_id=p_salon_id and active;
  if coalesce(v_salon.name,'')='' or coalesce(v_salon.address_line,'')='' or coalesce(v_salon.city,'')=''
    or coalesce(v_salon.phone,'')='' or v_service_count=0 then
    raise exception using errcode='23514', message='Complete salon name, address, city, phone and at least one active service before submission';
  end if;
  if exists(select 1 from public.salon_versions where salon_id=p_salon_id and status='pending') then
    raise exception using errcode='23505', message='This website is already awaiting review';
  end if;
  if exists(select 1 from public.salon_versions where salon_id=p_salon_id and status='approved' and content_hash=p_content_hash)
    and v_salon.status='approved' then
    raise exception using errcode='23514', message='Nothing has changed since your last approved version';
  end if;

  select coalesce(max(version),0)+1 into v_version from public.salon_versions where salon_id=p_salon_id;
  insert into public.salon_versions(salon_id,version,status,snapshot,content_hash,submitted_at,review_note,submitted_by)
  values(p_salon_id,v_version,'pending',p_snapshot,p_content_hash,v_now,'',(select auth.uid()))
  returning * into v_existing;

  update public.salons set status='pending',submitted_at=v_now,review_note='',reviewed_at=null,updated_at=v_now
  where id=p_salon_id;
  return to_jsonb(v_existing);
end;
$$;
revoke all on function public.submit_salon_for_approval(uuid,jsonb,text) from public, anon;
grant execute on function public.submit_salon_for_approval(uuid,jsonb,text) to authenticated;

create or replace function public.review_salon_submission(
  p_version_id uuid,
  p_action text,
  p_note text default ''
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version public.salon_versions%rowtype;
  v_salon public.salons%rowtype;
  v_status text;
  v_now timestamptz := now();
  v_note text := left(trim(coalesce(p_note,'')),1000);
begin
  if not (select private.is_super_admin()) then
    raise exception using errcode='42501', message='Only a super admin may review salon submissions';
  end if;
  if p_action not in ('approve','reject','request_changes') then
    raise exception using errcode='22023', message='Invalid review action';
  end if;
  if p_action in ('reject','request_changes') and v_note='' then
    raise exception using errcode='22023', message='A review note is required for this decision';
  end if;
  select * into v_version from public.salon_versions where id=p_version_id for update;
  if not found then raise exception using errcode='P0002', message='Submission not found'; end if;
  if v_version.status <> 'pending' then raise exception using errcode='23505', message='This submission has already been reviewed'; end if;
  select * into v_salon from public.salons where id=v_version.salon_id for update;
  if not found then raise exception using errcode='P0002', message='Salon not found'; end if;

  if p_action='approve' then
    update public.salon_versions set status='superseded' where salon_id=v_salon.id and status='approved';
    v_status := 'approved';
    update public.salon_versions
      set status='approved',reviewed_at=v_now,reviewed_by=(select auth.uid()),review_note=v_note
      where id=p_version_id;
    update public.salons
      set status='approved',approved_at=v_now,reviewed_at=v_now,review_note=v_note,
          submitted_at=coalesce(submitted_at,v_version.submitted_at),updated_at=v_now
      where id=v_salon.id;
  else
    v_status := case when p_action='reject' then 'rejected' else 'changes_requested' end;
    update public.salon_versions
      set status=v_status,reviewed_at=v_now,reviewed_by=(select auth.uid()),review_note=v_note
      where id=p_version_id;
    update public.salons
      set status=v_status,reviewed_at=v_now,review_note=v_note,website_published=false,updated_at=v_now
      where id=v_salon.id;
  end if;

  select * into v_version from public.salon_versions where id=p_version_id;
  select * into v_salon from public.salons where id=v_salon.id;
  return jsonb_build_object('version',to_jsonb(v_version),'salon',to_jsonb(v_salon));
end;
$$;
revoke all on function public.review_salon_submission(uuid,text,text) from public, anon;
grant execute on function public.review_salon_submission(uuid,text,text) to authenticated;

create or replace function public.verify_subscription_payment(p_payment_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment public.subscription_payments%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_now timestamptz := now();
begin
  if not (select private.is_super_admin()) then
    raise exception using errcode='42501', message='Only a super admin can verify subscription payments';
  end if;
  select * into v_payment from public.subscription_payments where id=p_payment_id for update;
  if not found then raise exception using errcode='P0002', message='Payment record not found'; end if;
  if v_payment.status='verified' then
    select * into v_subscription from public.subscriptions where salon_id=v_payment.salon_id;
    return jsonb_build_object('payment',to_jsonb(v_payment),'subscription',to_jsonb(v_subscription),'alreadyVerified',true);
  end if;
  if v_payment.status<>'pending' then raise exception using errcode='23514', message='Only pending payments can be verified'; end if;

  update public.subscription_payments set status='verified',verified_by=(select auth.uid()),verified_at=v_now,updated_at=v_now
  where id=p_payment_id returning * into v_payment;

  insert into public.subscriptions(salon_id,plan,status,current_period_end)
  values(v_payment.salon_id,v_payment.plan,'active',coalesce(v_payment.period_end,v_now+interval '30 days'))
  on conflict(salon_id) do update
    set plan=excluded.plan,status='active',current_period_end=excluded.current_period_end,updated_at=v_now
  returning * into v_subscription;

  return jsonb_build_object('payment',to_jsonb(v_payment),'subscription',to_jsonb(v_subscription),'alreadyVerified',false);
end;
$$;
revoke all on function public.verify_subscription_payment(uuid) from public, anon;
grant execute on function public.verify_subscription_payment(uuid) to authenticated;

-- Verified phone-auth customers can only create/read/redeem their own loyalty account.
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
  select phone, email into v_phone,v_email from auth.users
  where id=v_user_id and phone_confirmed_at is not null;
  if v_phone is null then
    raise exception using errcode='42501', message='Verify your mobile number with Supabase phone OTP before using customer loyalty';
  end if;
  v_phone := regexp_replace(v_phone,'\D','','g');
  if length(v_phone)<8 then raise exception using errcode='22023', message='Verified phone number is invalid'; end if;

  select * into v_account from public.loyalty_accounts where customer_id=v_user_id for update;
  if found then return to_jsonb(v_account); end if;

  v_member := 'VIP-' || right(v_phone,4) || '-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
  insert into public.loyalty_accounts(owner_id,customer_id,phone,name,member_id,tier,total_points,lifetime_points,visits_count)
  values(null,v_user_id,v_phone,left(coalesce(nullif(trim(p_name),''),split_part(coalesce(v_email,''),'@',1),'BeautyZone Guest'),120),v_member,'silver',100,100,0)
  on conflict do nothing
  returning * into v_account;
  if v_account.id is null then
    select * into v_account from public.loyalty_accounts where customer_id=v_user_id or phone=v_phone;
  else
    insert into public.loyalty_transactions(account_id,phone,service_title,bill_amount,points,transaction_type,type,description)
    values(v_account.id,v_phone,'Welcome Loyalty Bonus',0,100,'bonus','bonus','Welcome gift for joining BeautyZone VIP Rewards');
  end if;
  if v_account.id is null or v_account.customer_id is distinct from v_user_id then
    raise exception using errcode='23505', message='This verified mobile number is already linked to another loyalty account';
  end if;
  return to_jsonb(v_account);
end;
$$;
revoke all on function public.ensure_customer_loyalty_account(text) from public, anon;
grant execute on function public.ensure_customer_loyalty_account(text) to authenticated;

create or replace function public.redeem_customer_loyalty_reward(p_offer_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
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
  select * into v_account from public.loyalty_accounts where customer_id=v_user_id and phone=regexp_replace(v_phone,'\D','','g') for update;
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
$$;
revoke all on function public.redeem_customer_loyalty_reward(text) from public, anon;
grant execute on function public.redeem_customer_loyalty_reward(text) to authenticated;
