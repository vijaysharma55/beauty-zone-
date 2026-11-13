-- Use character classes for literal plus and dot characters. PostgreSQL's ARE
-- parser treats backslash escapes differently from JavaScript, and the previous
-- migration's escaped forms rejected valid owner phone/email values in practice.
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
      and trim(v->>'phone') ~ '^[+]?[0-9[:space:]()-]+$' and length(digits) between 8 and 15
      and length(v->>'phone') <= 40 and length(v->>'email') <= 254
      and trim(v->>'email') ~ '^[^[:space:]@]+@[^[:space:]@]+[.][a-zA-Z]{2,}$', false);
  elsif step = 3 then
    digits := regexp_replace(coalesce(v->>'ownerPhone',''), '[^0-9]', '', 'g');
    return coalesce(
      length(coalesce(v->>'ownerName','')) <= 120 and length(coalesce(v->>'ownerPhone','')) <= 40
      and (trim(coalesce(v->>'ownerPhone','')) = '' or
        (trim(v->>'ownerPhone') ~ '^[+]?[0-9[:space:]()-]+$' and length(digits) between 8 and 15))
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
