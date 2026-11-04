-- Expose only non-sensitive onboarding defaults to an authenticated salon owner.
create or replace function private.get_onboarding_defaults()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trial_days integer := 14;
  v_default_plan text := 'starter';
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.profiles p
    where p.id=(select auth.uid()) and p.role='salon_owner' and p.status='active'
  ) then
    raise exception using errcode='42501',message='Only active salon-owner accounts can read onboarding defaults';
  end if;
  select greatest(0,least(coalesce((value #>> '{}')::integer,14),365))
    into v_trial_days from public.platform_settings where key='trialDays';
  select coalesce(value #>> '{}','starter')
    into v_default_plan from public.platform_settings where key='defaultPlan';
  if v_default_plan not in ('trial','starter') then v_default_plan:='starter'; end if;
  return jsonb_build_object('trialDays',coalesce(v_trial_days,14),'defaultPlan',v_default_plan);
end;
$$;
revoke all on function private.get_onboarding_defaults() from public,anon,authenticated;
grant execute on function private.get_onboarding_defaults() to authenticated;

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
  v_defaults jsonb;
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

  v_defaults:=private.get_onboarding_defaults();
  v_trial_days:=greatest(0,least(coalesce((v_defaults->>'trialDays')::integer,14),365));
  v_default_plan:=coalesce(v_defaults->>'defaultPlan','starter');

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
