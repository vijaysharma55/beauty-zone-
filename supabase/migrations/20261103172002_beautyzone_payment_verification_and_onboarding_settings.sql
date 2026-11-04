-- Tighten manual payment verification and make plan defaults honor admin settings.
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
  if v_payment.amount_paise<=0 or nullif(trim(v_payment.provider_reference),'') is null then
    raise exception using errcode='23514', message='A positive amount and payment reference are required before verification';
  end if;
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
revoke all on function public.verify_subscription_payment(uuid) from public,anon;
grant execute on function public.verify_subscription_payment(uuid) to authenticated;

create or replace function public.create_salon_onboarding(p_data jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_profile public.profiles%rowtype;
  v_salon public.salons%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_name text := left(trim(coalesce(p_data->>'name','')),120);
  v_slug text := lower(trim(coalesce(p_data->>'slug','')));
  v_now timestamptz := now();
  v_trial_days integer;
  v_default_plan text;
begin
  if v_uid is null then raise exception using errcode='42501',message='Sign in before creating a salon'; end if;
  select * into v_profile from public.profiles where id=v_uid;
  if not found or v_profile.role <> 'salon_owner' or v_profile.status <> 'active' then
    raise exception using errcode='42501',message='Only active salon-owner accounts can complete onboarding';
  end if;
  if v_name='' or length(v_name)<2 then raise exception using errcode='22023',message='Salon name must contain at least two characters'; end if;
  if v_slug !~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' or position('--' in v_slug)>0 then
    raise exception using errcode='22023',message='Choose a valid salon website address';
  end if;
  if exists(select 1 from public.salons where owner_id=v_uid) then
    raise exception using errcode='23505',message='You have already completed salon onboarding';
  end if;
  if exists(select 1 from public.salons where slug=v_slug) then
    raise exception using errcode='23505',message='That salon website address is already taken';
  end if;

  select coalesce((value #>> '{}')::integer,14) into v_trial_days from public.platform_settings where key='trialDays';
  v_trial_days:=greatest(0,least(coalesce(v_trial_days,14),365));
  select coalesce(value #>> '{}','starter') into v_default_plan from public.platform_settings where key='defaultPlan';
  if v_default_plan not in ('trial','starter','pro','elite') then v_default_plan:='starter'; end if;

  insert into public.salons(
    owner_id,name,slug,tagline,description,logo_url,cover_image,gallery,
    phone,email,whatsapp,address_line,city,state,postal_code,country,map_url,
    instagram,facebook,hero_title,hero_subtitle,theme,website_published,status,
    template_id,timings,owner_name,owner_phone,onboarding_completed,created_at,updated_at
  ) values (
    v_uid,v_name,v_slug,left(coalesce(p_data->>'tagline',''),200),left(coalesce(p_data->>'description',''),4000),
    coalesce(p_data->>'logoUrl',''),coalesce(p_data->>'coverImage',''),coalesce(p_data->'gallery','[]'::jsonb),
    left(coalesce(p_data->>'phone',''),40),coalesce(p_data->>'email',v_profile.email,''),
    left(coalesce(p_data->>'whatsapp',''),40),left(coalesce(p_data->>'addressLine',''),300),
    left(coalesce(p_data->>'city',''),100),left(coalesce(p_data->>'state',''),100),
    left(coalesce(p_data->>'postalCode',''),20),coalesce(p_data->>'country','India'),
    left(coalesce(p_data->>'mapUrl',''),500),left(coalesce(p_data->>'instagram',''),200),
    left(coalesce(p_data->>'facebook',''),200),left(coalesce(nullif(p_data->>'heroTitle',''),v_name),200),
    left(coalesce(p_data->>'heroSubtitle',''),500),coalesce(p_data->'theme','{}'::jsonb),false,'draft',
    case when p_data->>'templateId' in ('luxe','minimal','noir','blush') then p_data->>'templateId' else 'luxe' end,
    coalesce(p_data->'timings','[]'::jsonb),left(coalesce(p_data->>'ownerName',v_profile.name,''),120),
    left(coalesce(p_data->>'ownerPhone',p_data->>'phone',''),40),true,v_now,v_now
  ) returning * into v_salon;
  insert into public.subscriptions(salon_id,plan,status,current_period_end,created_at,updated_at)
  values(v_salon.id,v_default_plan,'trialing',v_now+(v_trial_days||' days')::interval,v_now,v_now)
  returning * into v_subscription;
  return jsonb_build_object('salon',to_jsonb(v_salon),'subscription',to_jsonb(v_subscription));
end;
$$;
revoke all on function public.create_salon_onboarding(jsonb) from public,anon;
grant execute on function public.create_salon_onboarding(jsonb) to authenticated;
