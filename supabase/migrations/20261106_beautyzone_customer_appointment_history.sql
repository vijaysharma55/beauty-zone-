-- Customer appointment history (additive patch).
--
-- public.bookings already exists with the salon-operations shape (salon_id,
-- service, stylist, booking_date date, booking_time text, estimated_total, ...).
-- This migration does NOT recreate or alter any existing column. It only:
--   1. adds a nullable customer_id link to auth.users,
--   2. allows the 'no_show' status,
--   3. links bookings to a customer by VERIFIED phone number (backfill + trigger),
--   4. lets a signed-in customer SELECT only their own bookings.
--
-- Mapping used by the app (src/lib/appointmentHistory.ts):
--   service_name -> bookings.service      price      -> amount_paise/100 (else estimated_total)
--   staff_name   -> bookings.stylist      booking_at -> booking_date + booking_time
--   'upcoming'   -> derived: an active status whose booking_date is today or later

-- ---------------------------------------------------------------------------
-- 1. Ownership link.
-- ON DELETE SET NULL (not CASCADE): bookings are also the salon's own records,
-- so deleting a customer account must not erase the salon's booking history.
-- ---------------------------------------------------------------------------
alter table public.bookings
  add column if not exists customer_id uuid references auth.users(id) on delete set null;

create index if not exists bookings_customer_date_idx
  on public.bookings (customer_id, booking_date desc, created_at desc)
  where customer_id is not null;

-- ---------------------------------------------------------------------------
-- 2. Status set: keep every existing value, add 'no_show'.
-- ---------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_constraint where conrelid = 'public.bookings'::regclass and conname = 'bookings_status_check') then
    alter table public.bookings drop constraint bookings_status_check;
  end if;
  alter table public.bookings add constraint bookings_status_check
    check (status in (
      'requested', 'pending_payment', 'payment_verification_pending', 'payment_failed',
      'advance_paid', 'confirmed', 'declined', 'completed', 'cancelled', 'expired',
      'no_show'
    ));
end $$;

-- ---------------------------------------------------------------------------
-- 3. Link bookings to a customer by verified phone.
-- Helpers live in the private schema (not exposed through the Data API).
-- Normalisation matches the customer rewards migration: digits only, and a
-- 12-digit number starting with 91 is reduced to its 10-digit form.
-- ---------------------------------------------------------------------------
create or replace function private.normalize_in_phone(p_phone text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when length(d) = 12 and left(d, 2) = '91' then right(d, 10)
    else d
  end
  from (select regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g') as d) s
$$;

create or replace function private.link_booking_customer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_user_id uuid;
  v_matches int;
begin
  if new.customer_id is not null then
    return new;
  end if;

  v_phone := private.normalize_in_phone(new.phone);
  if length(v_phone) <> 10 then
    return new;
  end if;

  -- Only a confirmed phone owns bookings; skip if the number is ambiguous.
  select count(*), (array_agg(u.id))[1] into v_matches, v_user_id
  from auth.users u
  where u.phone_confirmed_at is not null
    and private.normalize_in_phone(u.phone) = v_phone;

  if v_matches = 1 then
    new.customer_id := v_user_id;
  end if;

  return new;
end;
$$;

revoke all on function private.link_booking_customer() from public, anon, authenticated;
revoke all on function private.normalize_in_phone(text) from public, anon, authenticated;

drop trigger if exists link_booking_customer on public.bookings;
create trigger link_booking_customer
  before insert on public.bookings
  for each row execute function private.link_booking_customer();

-- One-off backfill for rows that already exist (only unambiguous verified phones).
update public.bookings b
set customer_id = u.id
from auth.users u
where b.customer_id is null
  and u.phone_confirmed_at is not null
  and length(private.normalize_in_phone(b.phone)) = 10
  and private.normalize_in_phone(u.phone) = private.normalize_in_phone(b.phone)
  and (
    select count(*) from auth.users u2
    where u2.phone_confirmed_at is not null
      and private.normalize_in_phone(u2.phone) = private.normalize_in_phone(b.phone)
  ) = 1;

-- ---------------------------------------------------------------------------
-- 4. A customer can read only their own bookings. Existing owner/admin/public
-- policies are untouched; permissive policies combine with OR.
-- ---------------------------------------------------------------------------
drop policy if exists "bookings_customer_select" on public.bookings;
create policy "bookings_customer_select" on public.bookings
  as permissive for select to authenticated
  using (customer_id = (select auth.uid()));
