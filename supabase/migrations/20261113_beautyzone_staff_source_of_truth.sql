-- BeautyZone staff persistence migration.
-- public.staff is the sole operational source of truth after this migration.
-- Ownership is inherited through staff.salon_id -> salons.id -> salons.owner_id;
-- owner_id is deliberately never accepted from the browser or stored redundantly.

alter table public.salons
  add column if not exists staff_migrated_at timestamptz;

alter table public.staff
  add column if not exists primary_role text not null default '',
  add column if not exists app_access_role text not null default 'service_provider',
  add column if not exists commission_percent numeric(5,2) not null default 15,
  add column if not exists mobile_number text not null default '',
  add column if not exists hide_mobile_number boolean not null default false,
  add column if not exists service_ids jsonb not null default '[]'::jsonb,
  add column if not exists weekly_schedule jsonb not null default '[]'::jsonb,
  add column if not exists availability_status text not null default 'available',
  add column if not exists qualifications jsonb not null default '[]'::jsonb,
  add column if not exists work_photos jsonb not null default '[]'::jsonb,
  add column if not exists work_photos_consent boolean not null default false,
  add column if not exists rating numeric,
  add column if not exists review_count integer not null default 0,
  add column if not exists experience text not null default '';

create or replace function private.staff_weekly_schedule_is_valid(p_schedule jsonb)
returns boolean
language sql
immutable
parallel safe
set search_path = pg_catalog, public
as $$
  select case
    when p_schedule is null or jsonb_typeof(p_schedule) <> 'array' then false
    when jsonb_array_length(p_schedule) <> 7 then false
    else (
      select
        count(*) = 7
        and count(distinct value->>'day') = 7
        and coalesce(bool_or(value->'closed' = 'false'::jsonb), false)
        and bool_and(coalesce((
          jsonb_typeof(value) = 'object'
          and value->>'day' in ('mon','tue','wed','thu','fri','sat','sun')
          and jsonb_typeof(value->'closed') = 'boolean'
          and case
            when value->'closed' = 'true'::jsonb then
              coalesce(value->>'startTime', '') = ''
              and coalesce(value->>'endTime', '') = ''
            when value->'closed' = 'false'::jsonb then
              coalesce(value->>'startTime', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
              and coalesce(value->>'endTime', '') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
              and value->>'startTime' < value->>'endTime'
            else false
          end
        ), false))
      from jsonb_array_elements(p_schedule) as entries(value)
    )
  end
$$;

-- Backfill newly-added columns for existing staff before applying constraints.
update public.staff
set
  primary_role = coalesce(primary_role, ''),
  app_access_role = case
    when app_access_role in ('manager','service_provider','receptionist') then app_access_role
    else 'service_provider'
  end,
  commission_percent = coalesce(commission_percent, 15),
  mobile_number = coalesce(mobile_number, ''),
  hide_mobile_number = coalesce(hide_mobile_number, false),
  specialties = case when jsonb_typeof(specialties) = 'array' then specialties else '[]'::jsonb end,
  service_ids = case when jsonb_typeof(service_ids) = 'array' then service_ids else '[]'::jsonb end,
  weekly_schedule = case
    when private.staff_weekly_schedule_is_valid(weekly_schedule) then weekly_schedule
    else '[
      {"day":"mon","startTime":"10:00","endTime":"20:00","closed":false},
      {"day":"tue","startTime":"10:00","endTime":"20:00","closed":false},
      {"day":"wed","startTime":"10:00","endTime":"20:00","closed":false},
      {"day":"thu","startTime":"10:00","endTime":"20:00","closed":false},
      {"day":"fri","startTime":"10:00","endTime":"20:00","closed":false},
      {"day":"sat","startTime":"10:00","endTime":"20:00","closed":false},
      {"day":"sun","startTime":"","endTime":"","closed":true}
    ]'::jsonb
  end,
  availability_status = case
    when availability_status in ('available','busy','on_leave','off_duty') then availability_status
    else 'available'
  end,
  qualifications = case when jsonb_typeof(qualifications) = 'array' then qualifications else '[]'::jsonb end,
  work_photos = case when jsonb_typeof(work_photos) = 'array' then work_photos else '[]'::jsonb end,
  work_photos_consent = coalesce(work_photos_consent, false),
  review_count = greatest(coalesce(review_count, 0), 0),
  experience = coalesce(experience, '');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_commission_percent_check'
  ) then
    alter table public.staff
      add constraint staff_commission_percent_check
      check (commission_percent >= 0 and commission_percent <= 100);
  end if;

  alter table public.staff drop constraint if exists staff_availability_status_check;
  alter table public.staff
    add constraint staff_availability_status_check
    check (availability_status in ('available', 'busy', 'on_leave', 'off_duty'));

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_app_access_role_check'
  ) then
    alter table public.staff
      add constraint staff_app_access_role_check
      check (app_access_role in ('manager', 'service_provider', 'receptionist'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_primary_role_check'
  ) then
    alter table public.staff
      add constraint staff_primary_role_check
      check (primary_role in ('', 'senior_stylist', 'junior_stylist', 'hair_dresser', 'makeup_artist', 'nail_artist', 'spa_therapist', 'salon_manager', 'receptionist'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_rating_range_check'
  ) then
    alter table public.staff
      add constraint staff_rating_range_check
      check (rating is null or (rating >= 0 and rating <= 5));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_service_ids_array_check'
  ) then
    alter table public.staff
      add constraint staff_service_ids_array_check
      check (jsonb_typeof(service_ids) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_weekly_schedule_array_check'
  ) then
    alter table public.staff
      add constraint staff_weekly_schedule_array_check
      check (jsonb_typeof(weekly_schedule) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_specialties_array_check'
  ) then
    alter table public.staff
      add constraint staff_specialties_array_check
      check (jsonb_typeof(specialties) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_qualifications_array_check'
  ) then
    alter table public.staff
      add constraint staff_qualifications_array_check
      check (jsonb_typeof(qualifications) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_work_photos_array_check'
  ) then
    alter table public.staff
      add constraint staff_work_photos_array_check
      check (jsonb_typeof(work_photos) = 'array');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_weekly_schedule_valid_check'
  ) then
    alter table public.staff
      add constraint staff_weekly_schedule_valid_check
      check (private.staff_weekly_schedule_is_valid(weekly_schedule));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_mobile_number_check'
  ) then
    alter table public.staff
      add constraint staff_mobile_number_check
      check (mobile_number = '' or mobile_number ~ '^\+91[6-9][0-9]{9}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_review_count_nonnegative_check'
  ) then
    alter table public.staff
      add constraint staff_review_count_nonnegative_check
      check (review_count >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_name_length_check'
  ) then
    alter table public.staff
      add constraint staff_name_length_check
      check (char_length(btrim(name)) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.staff'::regclass and conname = 'staff_salon_id_fkey'
  ) then
    alter table public.staff
      add constraint staff_salon_id_fkey
      foreign key (salon_id) references public.salons(id) on delete cascade;
  end if;
end
$$;

create index if not exists staff_salon_sort_created_idx
  on public.staff (salon_id, sort_order, created_at);
create index if not exists staff_salon_availability_idx
  on public.staff (salon_id, active, availability_status);

alter table public.staff enable row level security;

-- Owner and super-admin reads/writes are scoped to the salon owned by auth.uid().
drop policy if exists staff_owner_admin_select on public.staff;
drop policy if exists staff_owner_admin_insert on public.staff;
drop policy if exists staff_owner_admin_update on public.staff;
drop policy if exists staff_owner_admin_delete on public.staff;
drop policy if exists staff_public_live_select on public.staff;

create policy staff_owner_admin_select
  on public.staff for select to authenticated
  using (
    exists (
      select 1 from public.salons s
      where s.id = staff.salon_id
        and (s.owner_id = auth.uid() or private.is_super_admin())
    )
  );

create policy staff_owner_admin_insert
  on public.staff for insert to authenticated
  with check (
    exists (
      select 1 from public.salons s
      where s.id = staff.salon_id
        and (s.owner_id = auth.uid() or private.is_super_admin())
    )
  );

create policy staff_owner_admin_update
  on public.staff for update to authenticated
  using (
    exists (
      select 1 from public.salons s
      where s.id = staff.salon_id
        and (s.owner_id = auth.uid() or private.is_super_admin())
    )
  )
  with check (
    exists (
      select 1 from public.salons s
      where s.id = staff.salon_id
        and (s.owner_id = auth.uid() or private.is_super_admin())
    )
  );

create policy staff_owner_admin_delete
  on public.staff for delete to authenticated
  using (
    exists (
      select 1 from public.salons s
      where s.id = staff.salon_id
        and (s.owner_id = auth.uid() or private.is_super_admin())
    )
  );

-- Anonymous clients read through a security-barrier view, not the base table.
-- The view filters unpublished salons and strips unconsented work photos.
-- The private mobile, commission and app-access fields are never exposed.
revoke all privileges on table public.staff from public, anon, authenticated;

create or replace view public.staff_public_profiles
with (security_barrier = true)
as
select
  st.id,
  st.salon_id,
  st.name,
  st.role_title,
  st.bio,
  st.photo_url,
  st.specialties,
  st.qualifications,
  case when st.work_photos_consent then st.work_photos else '[]'::jsonb end as work_photos,
  st.work_photos_consent,
  st.rating,
  st.review_count,
  st.experience,
  st.active,
  st.booking_enabled,
  st.availability_status,
  st.service_ids,
  st.weekly_schedule,
  st.sort_order,
  st.created_at,
  st.updated_at,
  st.hide_mobile_number
from public.staff st
where st.active = true
  and exists (
    select 1 from public.salons s
    where s.id = st.salon_id
      and s.website_published = true
      and s.status in ('approved', 'pending')
      and s.suspended = false
  );

revoke all privileges on table public.staff_public_profiles from public, anon, authenticated;
grant select on table public.staff_public_profiles to anon;
grant select, insert, update, delete on table public.staff to authenticated;
