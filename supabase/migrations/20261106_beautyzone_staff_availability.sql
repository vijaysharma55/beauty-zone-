-- Staff availability status migration.
-- Additive, idempotent migration keeping Supabase (PostgREST) in parity with
-- the Node/SQLite staff schema. Existing rows default to 'available'.
-- Note: RLS policies are intentionally untouched by this migration.

alter table public.staff
  add column if not exists availability_status text not null default 'available';

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid='public.staff'::regclass and conname='staff_availability_status_check') then
    alter table public.staff add constraint staff_availability_status_check
      check (availability_status in ('available', 'busy', 'on_leave'));
  end if;
end $$;
