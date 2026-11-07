-- Admin login / RBAC repair for the deployed Beauty Zone platform.
--
-- Symptoms this migration fixes:
--   * "Your BeautyZone profile is still being created" on sign-in because the
--     auth.users -> public.profiles trigger was never installed (or an admin
--     was created before it existed).
--   * "Could not load your BeautyZone profile" (HTTP 503) because an older
--     deployed schema lacks profiles.status / profiles.date_of_birth.
--   * A valid admin signing in but landing on /dashboard instead of /admin
--     because profiles.role still has its default value 'salon_owner'.
--   * Admin screens returning 403/empty data because a table is missing an
--     explicit super_admin RLS policy.
--
-- Idempotent: safe to re-run in the Supabase SQL Editor.
-- Run this as the SQL Editor (postgres/service_role), never from the browser.

-- ---------------------------------------------------------------------------
-- 1. Profile columns the login bridge reads. Additive and idempotent.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role text not null default 'salon_owner',
  add column if not exists status text not null default 'active',
  add column if not exists email_verified boolean not null default false,
  add column if not exists date_of_birth date,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_status_check') then
    alter table public.profiles add constraint profiles_status_check check (status in ('active','disabled'));
  end if;
  -- Older deployments already have a 2-role check. Replace it in place so
  -- `admin` and `customer` profiles can be assigned without a failed write.
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check
    check (role in ('super_admin','admin','salon_owner','customer'));
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_id_fkey') then
    alter table public.profiles add constraint profiles_id_fkey foreign key (id) references auth.users(id) on delete cascade;
  end if;
end $$;

create index if not exists profiles_email_lower_idx on public.profiles (lower(btrim(email)));

-- ---------------------------------------------------------------------------
-- 2. Trusted role helper. RLS policies and server-side checks both use this.
-- ---------------------------------------------------------------------------
create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'super_admin'
      and p.status = 'active'
  );
$$;

-- Several public read policies (salons/site_sections) also call this helper for
-- the anon role, so anon needs EXECUTE. It only ever reads through auth.uid(),
-- and exposes nothing but a boolean.
grant usage on schema private to anon, authenticated, service_role;
revoke all on function private.is_super_admin() from public;
grant execute on function private.is_super_admin() to anon, authenticated, service_role;

-- The schema baseline references public.is_super_admin() from triggers but
-- never defined it. Provide the compatibility wrapper so admin write paths
-- (salon approval, publishing, subscriptions) do not error at runtime.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_super_admin();
$$;

revoke all on function public.is_super_admin() from public;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;

/** Operational admins have operational console access. */
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('super_admin','admin')
      and p.status = 'active'
  );
$$;

grant usage on schema private to anon, authenticated, service_role;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Guarantee every Supabase Auth user has a profile row.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, name, role, status, email_verified)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    'salon_owner',
    'active',
    coalesce(new.email_confirmed_at is not null, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill for accounts created before the trigger existed.
insert into public.profiles (id, email, name, role, status, email_verified)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, ''), '@', 1)),
  'salon_owner',
  'active',
  coalesce(u.email_confirmed_at is not null, false)
from auth.users u
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. RLS: the signed-in user reads only their own profile; super admins and
--    the server-only service role can read/write identity and admin data.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin on public.profiles
as permissive for select to authenticated
using (
  id = (select auth.uid())
  or (select private.is_super_admin())
);

drop policy if exists profiles_update_self_or_admin on public.profiles;
create policy profiles_update_self_or_admin on public.profiles
as permissive for update to authenticated
using (id = (select auth.uid()) or (select private.is_super_admin()))
with check (id = (select auth.uid()) or (select private.is_super_admin()));

drop policy if exists profiles_admin_insert on public.profiles;
create policy profiles_admin_insert on public.profiles
as permissive for insert to authenticated
with check ((select private.is_super_admin()));

drop policy if exists profiles_admin_delete on public.profiles;
create policy profiles_admin_delete on public.profiles
as permissive for delete to authenticated
using ((select private.is_super_admin()));

-- Explicit super_admin grants on every admin-facing table. These are additive
-- (permissive policies OR together) so existing owner/public policies remain.
do $$
declare
  t text;
  policy_name text;
begin
  foreach t in array array[
    'salons','salon_versions','services','staff','subscriptions','bookings',
    'site_sections','gallery_items','salon_packages','videos','branches',
    'platform_settings','audit_logs','waitlist','stylist_inquiries',
    'service_reviews','loyalty_accounts','loyalty_transactions','loyalty_vouchers',
    'subscription_payments'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      policy_name := 'bz_admin_all_' || t;
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', policy_name, t);
      execute format(
        'create policy %I on public.%I as permissive for all to authenticated using ((select private.is_super_admin())) with check ((select private.is_super_admin()))',
        policy_name, t
      );
      -- Operational admins can read admin data; destructive super-admin writes are gated at the API.
      execute format('drop policy if exists %I on public.%I', 'bz_admin_select_' || t, t);
      execute format(
        'create policy %I on public.%I as permissive for select to authenticated using ((select private.is_admin()))',
        'bz_admin_select_' || t, t
      );
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. One-shot, explicit role bootstrap for the four application roles.
-- ---------------------------------------------------------------------------
-- USAGE (Supabase Dashboard > SQL Editor, runs as postgres/service_role):
--   select * from private.assign_application_role('owner@email.com',  'salon_owner');
--   select * from private.assign_application_role('admin@email.com',  'admin');
--   select * from private.assign_application_role('chief@email.com',  'super_admin');
--   select * from private.bootstrap_super_admin('chief@email.com');  -- shorthand
--
-- Deliberately NOT callable by anon/authenticated browsers, so a signed-up
-- user can never promote themselves. The Express bridge also honours the
-- SUPER_ADMIN_EMAILS / ADMIN_EMAILS allowlists when a service-role key is set.
create or replace function private.assign_application_role(p_email text, p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_row public.profiles%rowtype;
begin
  if v_email = '' or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[A-Za-z]{2,}$' then
    raise exception 'A valid administrator email address is required';
  end if;
  if v_role not in ('super_admin','admin','salon_owner','customer') then
    raise exception 'Role must be super_admin, admin, salon_owner or customer';
  end if;

  update public.profiles p
     set role = v_role,
         status = 'active',
         email_verified = true,
         updated_at = now()
   where lower(btrim(coalesce(p.email, ''))) = v_email
  returning p.* into v_row;

  if not found then
    insert into public.profiles as p (id, email, name, role, status, email_verified)
    select
      u.id,
      coalesce(u.email, v_email),
      coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', split_part(coalesce(u.email, v_email), '@', 1)),
      v_role, 'active', true
    from auth.users u
    where lower(btrim(coalesce(u.email, ''))) = v_email
    on conflict (id) do update
      set role = excluded.role, status = excluded.status,
          email_verified = true, updated_at = now()
    returning p.* into v_row;
  end if;

  if not found then
    raise exception 'No Supabase Auth user or profile exists for %', v_email;
  end if;
  return v_row;
end;
$$;

revoke all on function private.assign_application_role(text, text) from public, anon, authenticated;
grant execute on function private.assign_application_role(text, text) to service_role;

create or replace function private.bootstrap_super_admin(p_email text)
returns public.profiles
language sql
security definer
set search_path = ''
as $$
  select private.assign_application_role(p_email, 'super_admin');
$$;

revoke all on function private.bootstrap_super_admin(text) from public, anon, authenticated;
grant execute on function private.bootstrap_super_admin(text) to service_role;

-- Optional verification query (read-only):
-- select id, email, role, status, email_verified from public.profiles order by role;
