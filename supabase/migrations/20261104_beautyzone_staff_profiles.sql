-- Staff profile enrichment & work-photo consent migration.
-- Additive, idempotent migration keeping Supabase (PostgREST) in parity with
-- the Node/SQLite staff schema.

alter table public.staff
  add column if not exists rating numeric,
  add column if not exists review_count integer not null default 0,
  add column if not exists experience text not null default '',
  add column if not exists qualifications jsonb not null default '[]'::jsonb,
  add column if not exists work_photos jsonb not null default '[]'::jsonb,
  add column if not exists work_photos_consent boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.staff'::regclass and conname='staff_rating_range_check') then
    alter table public.staff add constraint staff_rating_range_check
      check (rating is null or (rating >= 0 and rating <= 5));
  end if;
end $$;
