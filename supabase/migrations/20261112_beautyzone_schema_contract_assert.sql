-- Safe schema assurance for the existing Beauty Zone production schema.
-- The app's canonical package table is public.salon_packages (not public.packages),
-- and salon/profile columns intentionally follow the platform's existing API.
-- This migration does not create parallel tables or replace established policies,
-- profile triggers, or revisioned onboarding RPCs.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

do $schema_contract$
declare
  fk record;
  expected record;
begin
  if to_regclass('public.profiles') is null
     or to_regclass('public.salons') is null
     or to_regclass('public.services') is null
     or to_regclass('public.salon_packages') is null
     or to_regclass('public.onboarding_profiles') is null then
    raise exception 'Beauty Zone schema contract failed: one or more canonical tables are missing';
  end if;

  for expected in
    select * from (values
      ('public.profiles', 'auth.users', 'id', 'id'),
      ('public.salons', 'public.profiles', 'owner_id', 'id'),
      ('public.services', 'public.salons', 'salon_id', 'id'),
      ('public.salon_packages', 'public.profiles', 'owner_id', 'id'),
      ('public.salon_packages', 'public.salons', 'salon_id', 'id')
    ) as f(source_table, target_table, source_column, target_column)
  loop
    select c.* into fk
    from pg_constraint c
    join pg_attribute src
      on src.attrelid = c.conrelid and src.attnum = any(c.conkey)
    join pg_attribute dst
      on dst.attrelid = c.confrelid and dst.attnum = any(c.confkey)
    where c.contype = 'f'
      and c.conrelid = to_regclass(expected.source_table)
      and c.confrelid = to_regclass(expected.target_table)
      and c.confdeltype = 'c'
      and src.attname = expected.source_column
      and dst.attname = expected.target_column
    limit 1;
    if not found then
      raise exception 'Beauty Zone schema contract failed: missing cascading FK %.% -> %.%',
        expected.source_table, expected.source_column, expected.target_table, expected.target_column;
    end if;
  end loop;

  if not exists (select 1 from pg_class where oid = 'public.profiles'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.salons'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.services'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.salon_packages'::regclass and relrowsecurity)
     or not exists (select 1 from pg_class where oid = 'public.onboarding_profiles'::regclass and relrowsecurity) then
    raise exception 'Beauty Zone schema contract failed: RLS must be enabled on all owner data tables';
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_select_self_or_admin')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='salons' and policyname='salons_owner_or_public_select')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='services' and policyname='services_public_read')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='salon_packages' and policyname='salon_packages_public_read')
     or not exists (select 1 from pg_policies where schemaname='public' and tablename='onboarding_profiles' and policyname='onboarding_profiles_owner_read') then
    raise exception 'Beauty Zone schema contract failed: expected owner/public RLS policies are missing';
  end if;

  if not exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'auth.users'::regclass
      and t.tgname = 'on_auth_user_created'
      and p.proname = 'handle_new_user'
      and p.prosecdef
      and not t.tgisinternal
      and t.tgenabled <> 'D'
  ) then raise exception 'Beauty Zone schema contract failed: secure auth.users profile trigger is missing or disabled'; end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='salons' and column_name='id' and column_default like '%gen_random_uuid%')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='services' and column_name='id' and column_default like '%gen_random_uuid%')
     or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='salon_packages' and column_name='id' and column_default like '%gen_random_uuid%') then
    raise exception 'Beauty Zone schema contract failed: generated UUID defaults are missing';
  end if;
end;
$schema_contract$;
