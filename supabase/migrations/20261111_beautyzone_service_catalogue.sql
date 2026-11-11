-- ============================================================================
-- BeautyZone — full service-catalogue management
--
-- Adds everything the owner's "Services & Prices" page now manages:
--
--   * `category`      — main category. Presets keep their historical lowercase
--                       key (hair, nails, makeup, skin, bridal, spa, academy,
--                       other); anything else is a custom owner category kept
--                       verbatim, so "Gel Extensions" never collapses into
--                       "nails".
--   * `subcategory`   — optional second level under the main category
--                       (e.g. "Gel Nails" / "Acrylic Nails" under Nails).
--   * `image_url`     — cover photo stored in the public `beautyzone-assets`
--                       Storage bucket (or any https URL).
--   * `notes`         — "Important notes / custom instructions" shown with the
--                       service (duration, prerequisites, client prep).
--   * `price_paise`   — already present; rates are edited in rupees in the UI.
--   * `active`        — already present; controls public website visibility.
--
-- Idempotent: safe to re-run, and safe on a project that already has the
-- baseline schema from 20261103_beautyzone_schema_baseline.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

alter table public."services" add column if not exists "subcategory" text default ''::text not null;
alter table public."services" add column if not exists "image_url" text default ''::text not null;
alter table public."services" add column if not exists "notes" text default ''::text not null;

-- Existing rows predate subcategories/images/notes: backfill empty values so
-- the API never reads NULL, and normalise legacy categories to preset keys.
update public."services"
   set "subcategory" = coalesce("subcategory", '')
 where "subcategory" is null;

update public."services"
   set "image_url" = coalesce("image_url", '')
 where "image_url" is null;

update public."services"
   set "notes" = coalesce("notes", '')
 where "notes" is null;

update public."services"
   set "category" = lower(trim("category"))
 where "category" in ('Bridal', 'Hair', 'Skin', 'Nails', 'Spa', 'Academy', 'Makeup', 'Other');

update public."services"
   set "category" = 'other'
 where "category" is null or trim("category") = '';

-- ---------------------------------------------------------------------------
-- 2. Constraints — sensible caps that mirror src/lib/serviceCategories.js
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.services'::regclass and conname = 'services_category_length_check'
  ) then
    alter table public."services"
      add constraint "services_category_length_check"
      check (char_length("category") between 1 and 60);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.services'::regclass and conname = 'services_subcategory_length_check'
  ) then
    alter table public."services"
      add constraint "services_subcategory_length_check"
      check (char_length("subcategory") <= 60);
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.services'::regclass and conname = 'services_notes_length_check'
  ) then
    alter table public."services"
      add constraint "services_notes_length_check"
      check (char_length("notes") <= 1000);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Indexes — the management page groups by category then subcategory, and
--    the public site only ever lists active services.
-- ---------------------------------------------------------------------------

create index if not exists services_salon_category_idx
  on public."services" using btree (salon_id, category, subcategory);

create index if not exists services_salon_active_category_idx
  on public."services" using btree (salon_id, active, category);

-- ---------------------------------------------------------------------------
-- 4. Row-level security
--
-- The baseline policies already scope services to the owning salon for
-- insert/update/delete and to published+approved salons for anonymous reads.
-- The new columns are covered by those row-level policies (RLS is per row,
-- not per column), so no extra policy is required. Re-assert the storage
-- policies the image upload depends on, in case this project was created
-- before the bucket existed.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'beautyzone-assets',
  'beautyzone-assets',
  true,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
  set public = true,
      file_size_limit = 10485760,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "beautyzone_assets_owner_insert" on "storage"."objects";
create policy "beautyzone_assets_owner_insert" on "storage"."objects"
  as permissive for insert to "authenticated"
  with check (
    bucket_id = 'beautyzone-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "beautyzone_assets_owner_update" on "storage"."objects";
create policy "beautyzone_assets_owner_update" on "storage"."objects"
  as permissive for update to "authenticated"
  using (
    bucket_id = 'beautyzone-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'beautyzone-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "beautyzone_assets_owner_delete" on "storage"."objects";
create policy "beautyzone_assets_owner_delete" on "storage"."objects"
  as permissive for delete to "authenticated"
  using (
    bucket_id = 'beautyzone-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "beautyzone_assets_public_read" on "storage"."objects";
create policy "beautyzone_assets_public_read" on "storage"."objects"
  as permissive for select to "anon", "authenticated"
  using (bucket_id = 'beautyzone-assets');

-- ---------------------------------------------------------------------------
-- 5. Convenience view — the catalogue grouped exactly like the dashboard.
--
--    select * from public.service_catalogue_groups
--     where salon_id = '<uuid>' order by category, subcategory;
-- ---------------------------------------------------------------------------

create or replace view public.service_catalogue_groups
  with (security_invoker = true) as
select
  s."salon_id",
  s."category",
  s."subcategory",
  count(*)::int                             as "service_count",
  count(*) filter (where s."active")::int    as "active_count",
  min(s."price_paise")                       as "min_price_paise",
  max(s."price_paise")                       as "max_price_paise",
  min(s."sort_order")                        as "sort_order"
from public."services" s
group by s."salon_id", s."category", s."subcategory";

grant select on public.service_catalogue_groups to anon, authenticated;
