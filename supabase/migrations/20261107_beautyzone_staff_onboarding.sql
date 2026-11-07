-- Staff onboarding migration: identity, roles, app access, commission,
-- service mapping and the weekly schedule roster.
--
-- Additive, idempotent and safe to re-run against a live project. Mirrors the
-- SQLite schema in server/db.js + server/migrations.js so both stores expose the
-- exact same staff fields to the dashboard and the API validators.
--
-- RLS policies are intentionally untouched: these columns are read/written by
-- existing owner-scoped staff policies.

alter table public.staff
  -- Professional title (see src/lib/staffRoles.js STAFF_PRIMARY_ROLES).
  add column if not exists primary_role text not null default '',
  -- System permission level (manager | service_provider | receptionist).
  add column if not exists app_access_role text not null default 'service_provider',
  -- Commission share of service revenue, 0–100 (default 15%).
  add column if not exists commission_percent numeric(5,2) not null default 15,
  -- Private contact details. `hide_mobile_number` keeps the number out of
  -- public/staff lists; public payloads never carry it regardless.
  add column if not exists mobile_number text not null default '',
  add column if not exists hide_mobile_number boolean not null default false,
  -- Assigned catalogue services (empty array = whole catalogue).
  add column if not exists service_ids jsonb not null default '[]'::jsonb,
  -- Weekly roster: [{ day, startTime, endTime, closed }, …] for mon→sun.
  add column if not exists weekly_schedule jsonb not null default '[]'::jsonb;

-- Availability status gains the 'off_duty' state used by the onboarding form.
do $$ begin
  if exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_availability_status_check'
  ) then
    alter table public.staff drop constraint staff_availability_status_check;
  end if;
  alter table public.staff add constraint staff_availability_status_check
    check (availability_status in ('available', 'busy', 'on_leave', 'off_duty'));
end $$;

-- App access vocabulary guard.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_app_access_role_check'
  ) then
    alter table public.staff add constraint staff_app_access_role_check
      check (app_access_role in ('manager', 'service_provider', 'receptionist'));
  end if;
end $$;

-- Primary role guard ('' is allowed for legacy rows not yet classified).
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_primary_role_check'
  ) then
    alter table public.staff add constraint staff_primary_role_check
      check (primary_role in (
        '', 'senior_stylist', 'junior_stylist', 'hair_dresser', 'makeup_artist',
        'nail_artist', 'spa_therapist', 'salon_manager', 'receptionist'
      ));
  end if;
end $$;

-- Commission must stay a valid percentage.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_commission_percent_check'
  ) then
    alter table public.staff add constraint staff_commission_percent_check
      check (commission_percent >= 0 and commission_percent <= 100);
  end if;
end $$;

-- JSON shape guards: both columns must always hold arrays.
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_service_ids_array_check'
  ) then
    alter table public.staff add constraint staff_service_ids_array_check
      check (jsonb_typeof(service_ids) = 'array');
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_weekly_schedule_array_check'
  ) then
    alter table public.staff add constraint staff_weekly_schedule_array_check
      check (jsonb_typeof(weekly_schedule) = 'array');
  end if;
end $$;

-- Normalise any legacy rows before the guards above take effect on reads.
update public.staff
   set app_access_role = 'service_provider'
 where app_access_role is null
    or app_access_role not in ('manager', 'service_provider', 'receptionist');

update public.staff set commission_percent = 15 where commission_percent is null;
update public.staff set mobile_number = '' where mobile_number is null;
update public.staff set hide_mobile_number = false where hide_mobile_number is null;
update public.staff set service_ids = '[]'::jsonb where jsonb_typeof(service_ids) is distinct from 'array';
update public.staff set weekly_schedule = '[]'::jsonb where jsonb_typeof(weekly_schedule) is distinct from 'array';

-- Staff lookup by app access role (manager/staff list views).
create index if not exists staff_salon_app_access_idx
  on public.staff using btree (salon_id, app_access_role);
