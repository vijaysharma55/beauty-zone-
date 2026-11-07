-- Nexora SalonOS landing page: demo-request leads.
-- Additive and idempotent. Does not touch any existing table or policy.
--
-- Visitors (anon / authenticated) may INSERT a lead whose status is 'new'.
-- Only the platform super-admin can read, update or delete leads.
-- The browser inserts with `Prefer: return=minimal`, so no SELECT policy is
-- needed for visitors (see src/lib/demoLead.ts).

create table if not exists public.demo_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  phone       text not null,
  salon_name  text not null,
  outlets     text not null,
  city        text not null,
  source      text not null default 'nexora-salonos-landing',
  status      text not null default 'new'
);

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_name_check') then
    alter table public.demo_requests add constraint demo_requests_name_check
      check (char_length(btrim(name)) between 2 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_phone_check') then
    -- normalised 10-digit Indian mobile number (no +91 / leading 0)
    alter table public.demo_requests add constraint demo_requests_phone_check
      check (phone ~ '^[6-9][0-9]{9}$');
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_salon_name_check') then
    alter table public.demo_requests add constraint demo_requests_salon_name_check
      check (char_length(btrim(salon_name)) between 2 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_city_check') then
    alter table public.demo_requests add constraint demo_requests_city_check
      check (char_length(btrim(city)) between 2 and 100);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_outlets_check') then
    alter table public.demo_requests add constraint demo_requests_outlets_check
      check (outlets in ('1', '2-5', '6-20', '20+'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_source_check') then
    alter table public.demo_requests add constraint demo_requests_source_check
      check (char_length(source) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.demo_requests'::regclass and conname = 'demo_requests_status_check') then
    alter table public.demo_requests add constraint demo_requests_status_check
      check (status in ('new', 'contacted', 'demo_booked', 'closed'));
  end if;
end $$;

create index if not exists demo_requests_created_at_idx on public.demo_requests (created_at desc);

alter table public.demo_requests enable row level security;

drop policy if exists "demo_requests_public_insert" on public.demo_requests;
create policy "demo_requests_public_insert" on public.demo_requests
  as permissive for insert to anon, authenticated
  with check (status = 'new');

drop policy if exists "demo_requests_admin_select" on public.demo_requests;
create policy "demo_requests_admin_select" on public.demo_requests
  as permissive for select to authenticated
  using ((select private.is_super_admin()));

drop policy if exists "demo_requests_admin_update" on public.demo_requests;
create policy "demo_requests_admin_update" on public.demo_requests
  as permissive for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists "demo_requests_admin_delete" on public.demo_requests;
create policy "demo_requests_admin_delete" on public.demo_requests
  as permissive for delete to authenticated
  using ((select private.is_super_admin()));

-- Explicit grants so behaviour does not depend on the project's default privileges.
grant insert on public.demo_requests to anon, authenticated;
grant select, update, delete on public.demo_requests to authenticated;
