-- Separate customer phone-OTP identities from salon-owner identities.
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role = any (array['super_admin'::text,'salon_owner'::text,'customer'::text]));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  -- A phone OTP sign-up creates a customer identity. Email/password sign-up
  -- remains a salon-owner flow. Client-editable user_metadata is never trusted
  -- for the authorization role.
  v_role := case
    when new.phone is not null or new.app_metadata ->> 'provider' = 'phone' then 'customer'
    else 'salon_owner'
  end;
  insert into public.profiles (id,email,name,role,email_verified,updated_at)
  values (
    new.id,
    coalesce(new.email,''),
    coalesce(new.raw_user_meta_data ->> 'name',new.raw_user_meta_data ->> 'full_name',split_part(coalesce(new.email,''),'@',1), 'BeautyZone Guest'),
    v_role,
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
