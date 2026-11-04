create or replace function public.is_salon_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_slug !~ '^[a-z0-9](?:[a-z0-9-]{1,58}[a-z0-9])$' or position('--' in p_slug)>0 then false
    else not exists(select 1 from public.salons where slug=lower(p_slug))
  end;
$$;
revoke all on function public.is_salon_slug_available(text) from public;
grant execute on function public.is_salon_slug_available(text) to anon,authenticated;
