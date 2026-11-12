-- Owner-scoped, revisioned onboarding drafts. Apply after the baseline, RBAC,
-- atomic salon-onboarding and asset-bucket migrations. Incomplete drafts never
-- create a salon, subscription, or publicly visible website.
create table if not exists public.onboarding_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  current_step smallint not null default 1 check (current_step between 1 and 4),
  revision bigint not null default 1 check (revision > 0),
  completed boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.onboarding_profiles enable row level security;
revoke all on public.onboarding_profiles from public, anon, authenticated;
grant select on public.onboarding_profiles to authenticated;
drop policy if exists onboarding_profiles_owner_read on public.onboarding_profiles;
create policy onboarding_profiles_owner_read on public.onboarding_profiles
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid())
      and p.role = 'salon_owner' and p.status = 'active')
  );

-- Validation is repeated in the API with the shared Zod schema. These checks
-- also protect the database RPC when called directly, outside the wizard.
create or replace function private.onboarding_step_valid(v jsonb, step integer)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  entry jsonb;
  seen text[] := array[]::text[];
  open_days integer := 0;
  digits text;
begin
  if jsonb_typeof(v) is distinct from 'object' then return false; end if;
  if step = 1 then
    return coalesce(
      length(trim(v->>'name')) between 2 and 120 and length(v->>'name') <= 120
      and (v->>'slug') ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$'
      and position('--' in (v->>'slug')) = 0
      and (v->>'slug') <> all(array['admin','api','login','logout','register','signup','signin','dashboard','onboarding','preview','publish','settings','billing','account','salon','salons','www','app','assets','static','public','help','support','terms','privacy'])
      and length(trim(v->>'tagline')) >= 1 and length(v->>'tagline') <= 160
      and length(trim(v->>'description')) >= 1 and length(v->>'description') <= 3000, false);
  elsif step = 2 then
    digits := regexp_replace(coalesce(v->>'phone',''), '[^0-9]', '', 'g');
    return coalesce(
      length(trim(v->>'addressLine')) >= 1 and length(v->>'addressLine') <= 300
      and length(trim(v->>'city')) >= 1 and length(v->>'city') <= 100
      and length(trim(v->>'state')) >= 1 and length(v->>'state') <= 100
      and trim(v->>'phone') ~ '^\+?[0-9[:space:]()-]+$' and length(digits) between 8 and 15
      and length(v->>'phone') <= 40 and length(v->>'email') <= 254
      and trim(v->>'email') ~ '^[^[:space:]@]+@[^[:space:]@]+\.[a-zA-Z]{2,}$', false);
  elsif step = 3 then
    digits := regexp_replace(coalesce(v->>'ownerPhone',''), '[^0-9]', '', 'g');
    return coalesce(
      length(coalesce(v->>'ownerName','')) <= 120 and length(coalesce(v->>'ownerPhone','')) <= 40
      and (trim(coalesce(v->>'ownerPhone','')) = '' or
        (trim(v->>'ownerPhone') ~ '^\+?[0-9[:space:]()-]+$' and length(digits) between 8 and 15))
      and length(v->>'logoUrl') <= 2048 and length(v->>'coverImage') <= 2048
      and trim(v->>'logoUrl') ~* '^(https?://[^[:space:]/?#]+[^[:space:]]*|/(api/uploads|images)/[A-Za-z0-9._-]+)$'
      and trim(v->>'coverImage') ~* '^(https?://[^[:space:]/?#]+[^[:space:]]*|/(api/uploads|images)/[A-Za-z0-9._-]+)$', false);
  elsif step = 4 then
    if coalesce(v->>'templateId','') not in ('luxe','minimal','noir','blush')
       or jsonb_typeof(v->'timings') is distinct from 'array' then return false; end if;
    if jsonb_array_length(v->'timings') <> 7 then return false; end if;
    for entry in select value from jsonb_array_elements(v->'timings') loop
      if coalesce(entry->>'day','') not in ('mon','tue','wed','thu','fri','sat','sun')
         or (entry->>'day') = any(seen) or jsonb_typeof(entry->'closed') is distinct from 'boolean'
         or jsonb_typeof(entry->'open') is distinct from 'string'
         or jsonb_typeof(entry->'close') is distinct from 'string'
         or length(entry->>'open') > 5 or length(entry->>'close') > 5 then return false; end if;
      seen := array_append(seen, entry->>'day');
      if entry->>'closed' = 'false' then
        open_days := open_days + 1;
        if (entry->>'open') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
           or (entry->>'close') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
           or (entry->>'open') >= (entry->>'close') then return false; end if;
      end if;
    end loop;
    return open_days > 0;
  end if;
  return false;
end;
$$;
revoke all on function private.onboarding_step_valid(jsonb, integer) from public, anon, authenticated;

-- A deliberately narrow lookup: it reveals only whether a handle is occupied,
-- including unpublished salons, never another owner's profile or salon fields.
create or replace function private.onboarding_slug_availability(p_slug text)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  available boolean;
begin
  if p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$' or position('--' in p_slug) > 0
     or p_slug = any(array['admin','api','login','logout','register','signup','signin','dashboard','onboarding','preview','publish','settings','billing','account','salon','salons','www','app','assets','static','public','help','support','terms','privacy']) then
    return jsonb_build_object('available', false, 'reason', 'Choose a valid, non-reserved website address.');
  end if;
  select not exists (select 1 from public.salons where slug = p_slug) into available;
  return jsonb_build_object('available', available, 'reason', case when available then null else 'This address is already in use.' end);
end;
$$;
revoke all on function private.onboarding_slug_availability(text) from public, anon, authenticated;

-- Supabase owners retain the role-checked RPC used by revisioned draft saves.
create or replace function public.onboarding_slug_available(p_slug text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and role = 'salon_owner' and status = 'active') then
    raise exception using errcode = '42501', message = 'Only active salon owners can check an onboarding address';
  end if;
  return private.onboarding_slug_availability(p_slug);
end;
$$;
revoke all on function public.onboarding_slug_available(text) from public, anon;
grant execute on function public.onboarding_slug_available(text) to authenticated;

-- Cookie-only legacy owners have no auth.uid(). This anonymous RPC exposes only
-- availability, not table access or owner data. Limit direct gateway calls too.
create or replace function public.onboarding_slug_available_for_local(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select private.onboarding_slug_availability(p_slug);
$$;
revoke all on function public.onboarding_slug_available_for_local(text) from public, authenticated;
grant execute on function public.onboarding_slug_available_for_local(text) to anon;

-- The revision comparison and upsert occur in one transaction. Direct table
-- writes are not granted, so stale tabs cannot bypass this compare-and-swap.
create or replace function public.save_onboarding_draft(p_data jsonb, p_current_step integer, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  old_row public.onboarding_profiles%rowtype;
  new_row public.onboarding_profiles%rowtype;
  editable text[];
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and role = 'salon_owner' and status = 'active') then
    raise exception using errcode = '42501', message = 'Only active salon owners can save onboarding';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_current_step is null or p_current_step not between 1 and 4
     or jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'values') is distinct from 'object'
     or jsonb_typeof(p_data->'slugTouched') is distinct from 'boolean' or pg_column_size(p_data) > 20000 then
    raise exception using errcode = '22023', message = 'Invalid onboarding draft';
  end if;
  select * into old_row from public.onboarding_profiles where user_id = uid for update;
  if found then
    if old_row.completed then raise exception using errcode = '23514', message = 'ONBOARDING_COMPLETED'; end if;
    if old_row.revision <> p_expected_revision then raise exception using errcode = '40001', message = 'ONBOARDING_CONFLICT'; end if;
    if p_current_step - old_row.current_step > 1 then
      raise exception using errcode = '22023', message = 'Complete each onboarding step in order';
    end if;
    if p_current_step <> old_row.current_step then
      if p_data is distinct from old_row.data then
        raise exception using errcode = '22023', message = 'Save changes before moving between steps';
      end if;
      if p_current_step > old_row.current_step and not private.onboarding_step_valid(old_row.data->'values', old_row.current_step) then
        raise exception using errcode = '22023', message = 'Complete the required fields before continuing';
      end if;
      if p_current_step = 2 and old_row.current_step = 1 and
         not (public.onboarding_slug_available(old_row.data->'values'->>'slug')->>'available')::boolean then
        raise exception using errcode = '23505', message = 'That salon website address is already taken';
      end if;
    else
      editable := case old_row.current_step
        when 1 then array['name','slug','tagline','description']
        when 2 then array['addressLine','city','state','phone','email']
        when 3 then array['ownerName','ownerPhone','logoUrl','coverImage']
        else array['templateId','timings'] end;
      if ((p_data->'values') - editable) is distinct from ((old_row.data->'values') - editable)
         or (old_row.current_step <> 1 and p_data->'slugTouched' is distinct from old_row.data->'slugTouched') then
        raise exception using errcode = '22023', message = 'Only the current onboarding step can be edited';
      end if;
    end if;
  else
    if p_expected_revision <> 0 then raise exception using errcode = '40001', message = 'ONBOARDING_CONFLICT'; end if;
    if p_current_step <> 1 then raise exception using errcode = '22023', message = 'Start with salon identity'; end if;
  end if;

  insert into public.onboarding_profiles(user_id, data, current_step, revision, completed, updated_at)
  values(uid, p_data, p_current_step, 1, false, clock_timestamp())
  on conflict(user_id) do update set data = excluded.data, current_step = excluded.current_step,
    revision = public.onboarding_profiles.revision + 1, updated_at = clock_timestamp()
  where public.onboarding_profiles.revision = p_expected_revision and not public.onboarding_profiles.completed
  returning * into new_row;
  if not found then raise exception using errcode = '40001', message = 'ONBOARDING_CONFLICT'; end if;
  return to_jsonb(new_row);
end;
$$;
revoke all on function public.save_onboarding_draft(jsonb, integer, bigint) from public, anon;
grant execute on function public.save_onboarding_draft(jsonb, integer, bigint) to authenticated;

-- A conflict is never silently overwritten. This separate compare-and-swap is
-- invoked only when the owner explicitly chooses the device copy; prerequisites
-- still have to be valid for the step to which the draft will be restored.
create or replace function public.resolve_onboarding_draft(p_data jsonb, p_current_step integer, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  old_row public.onboarding_profiles%rowtype;
  new_row public.onboarding_profiles%rowtype;
  step integer;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and role = 'salon_owner' and status = 'active') then
    raise exception using errcode = '42501', message = 'Only active salon owners can restore onboarding';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_current_step is null or p_current_step not between 1 and 4
     or jsonb_typeof(p_data) is distinct from 'object' or jsonb_typeof(p_data->'values') is distinct from 'object'
     or jsonb_typeof(p_data->'slugTouched') is distinct from 'boolean' or pg_column_size(p_data) > 20000 then
    raise exception using errcode = '22023', message = 'Invalid onboarding draft';
  end if;
  if p_current_step > 1 then
    for step in 1..(p_current_step - 1) loop
      if not private.onboarding_step_valid(p_data->'values', step) then
        raise exception using errcode = '22023', message = 'Complete the preceding steps before restoring this draft';
      end if;
    end loop;
  end if;
  select * into old_row from public.onboarding_profiles where user_id = uid for update;
  if not found or old_row.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'ONBOARDING_CONFLICT';
  end if;
  if old_row.completed then raise exception using errcode = '23514', message = 'ONBOARDING_COMPLETED'; end if;
  if p_current_step > old_row.current_step then
    raise exception using errcode = '22023', message = 'Restore at the saved step and continue in order';
  end if;
  insert into public.onboarding_profiles(user_id, data, current_step, revision, completed, updated_at)
  values(uid, p_data, p_current_step, 1, false, clock_timestamp())
  on conflict(user_id) do update set data = excluded.data, current_step = excluded.current_step,
    revision = public.onboarding_profiles.revision + 1, updated_at = clock_timestamp()
  where public.onboarding_profiles.revision = p_expected_revision and not public.onboarding_profiles.completed
  returning * into new_row;
  if not found then raise exception using errcode = '40001', message = 'ONBOARDING_CONFLICT'; end if;
  return to_jsonb(new_row);
end;
$$;
revoke all on function public.resolve_onboarding_draft(jsonb, integer, bigint) from public, anon;
grant execute on function public.resolve_onboarding_draft(jsonb, integer, bigint) to authenticated;

-- Creates salon + subscription and marks the draft complete atomically. A retry
-- after a dropped response returns the original records instead of duplicating.
create or replace function public.complete_salon_onboarding(p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  draft public.onboarding_profiles%rowtype;
  salon public.salons%rowtype;
  subscription public.subscriptions%rowtype;
  result jsonb;
  step integer;
begin
  if uid is null or not exists (select 1 from public.profiles where id = uid and role = 'salon_owner' and status = 'active') then
    raise exception using errcode = '42501', message = 'Only active salon owners can complete onboarding';
  end if;
  select * into draft from public.onboarding_profiles where user_id = uid for update;
  if not found then raise exception using errcode = '22023', message = 'Save your onboarding draft first'; end if;
  if draft.completed then
    select * into salon from public.salons where owner_id = uid;
    if not found then raise exception using errcode = '23514', message = 'Completed salon could not be found'; end if;
    select * into subscription from public.subscriptions where salon_id = salon.id;
    return jsonb_build_object('salon', to_jsonb(salon), 'subscription', to_jsonb(subscription));
  end if;
  if p_expected_revision is null or draft.revision <> p_expected_revision then
    raise exception using errcode = '40001', message = 'ONBOARDING_CONFLICT';
  end if;
  if draft.current_step <> 4 then raise exception using errcode = '22023', message = 'Complete each onboarding step in order'; end if;
  for step in 1..4 loop
    if not private.onboarding_step_valid(draft.data->'values', step) then
      raise exception using errcode = '22023', message = 'Complete all required onboarding fields';
    end if;
  end loop;
  if not (public.onboarding_slug_available(draft.data->'values'->>'slug')->>'available')::boolean then
    raise exception using errcode = '23505', message = 'That salon website address is already taken';
  end if;
  result := public.create_salon_onboarding((draft.data->'values') || jsonb_build_object(
    'name', trim(draft.data->'values'->>'name'),
    'tagline', trim(draft.data->'values'->>'tagline'),
    'description', trim(draft.data->'values'->>'description'),
    'addressLine', trim(draft.data->'values'->>'addressLine'),
    'city', trim(draft.data->'values'->>'city'), 'state', trim(draft.data->'values'->>'state'),
    'phone', trim(draft.data->'values'->>'phone'), 'email', trim(draft.data->'values'->>'email'),
    'ownerName', trim(coalesce(draft.data->'values'->>'ownerName','')),
    'ownerPhone', trim(coalesce(draft.data->'values'->>'ownerPhone','')),
    'logoUrl', trim(draft.data->'values'->>'logoUrl'), 'coverImage', trim(draft.data->'values'->>'coverImage')
  ));
  update public.onboarding_profiles set completed = true, revision = revision + 1, updated_at = clock_timestamp()
  where user_id = uid;
  return result;
end;
$$;
revoke all on function public.complete_salon_onboarding(bigint) from public, anon;
grant execute on function public.complete_salon_onboarding(bigint) to authenticated;
-- All authenticated completion now goes through the saved, validated draft.
revoke execute on function public.create_salon_onboarding(jsonb) from authenticated;
