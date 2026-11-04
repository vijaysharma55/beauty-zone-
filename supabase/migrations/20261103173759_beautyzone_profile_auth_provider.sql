-- Persist the sign-in provider on the application profile for accurate admin account management.
alter table public.profiles
  add column if not exists auth_provider text not null default 'password';
do $$ begin
  if not exists(select 1 from pg_constraint where conrelid='public.profiles'::regclass and conname='profiles_auth_provider_check') then
    alter table public.profiles add constraint profiles_auth_provider_check
      check(auth_provider in ('password','google','phone'));
  end if;
end $$;

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
        updated_at=now();
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public,anon,authenticated;
