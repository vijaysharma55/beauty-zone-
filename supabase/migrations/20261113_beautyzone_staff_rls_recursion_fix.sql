-- Break recursive RLS dependencies between salons, salon_versions and staff.
-- SECURITY DEFINER helpers run with the migration owner and a locked search_path,
-- so policy checks do not recursively re-enter the policies they are evaluating.

create or replace function private.owns_salon(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.salons s
    where s.id = p_salon_id
      and s.owner_id = auth.uid()
  )
$$;

create or replace function private.is_salon_publicly_approved(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.salons s
    where s.id = p_salon_id
      and s.website_published = true
      and s.status in ('approved', 'pending')
      and s.suspended = false
      and exists (
        select 1
        from public.salon_versions v
        where v.salon_id = s.id
          and v.status = 'approved'
      )
  )
$$;

create or replace function private.can_manage_salon_staff(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.owns_salon(p_salon_id)
      or private.is_super_admin()
$$;

revoke all privileges on function private.owns_salon(uuid) from public;
revoke all privileges on function private.is_salon_publicly_approved(uuid) from public;
revoke all privileges on function private.can_manage_salon_staff(uuid) from public;

grant execute on function private.owns_salon(uuid) to anon, authenticated;
grant execute on function private.is_salon_publicly_approved(uuid) to anon, authenticated;
grant execute on function private.can_manage_salon_staff(uuid) to authenticated;

-- The old policies queried each other through salon_versions and salons.
drop policy if exists salons_owner_or_public_select on public.salons;
create policy salons_owner_or_public_select
  on public.salons for select to anon, authenticated
  using (
    private.is_salon_publicly_approved(id)
    or private.owns_salon(id)
    or private.is_super_admin()
  );

drop policy if exists salon_versions_owner_insert on public.salon_versions;
create policy salon_versions_owner_insert
  on public.salon_versions for insert to authenticated
  with check (
    status = 'pending'
    and submitted_by = auth.uid()
    and private.owns_salon(salon_id)
  );

drop policy if exists salon_versions_scoped_select on public.salon_versions;
create policy salon_versions_scoped_select
  on public.salon_versions for select to anon, authenticated
  using (
    (status = 'approved' and private.is_salon_publicly_approved(salon_id))
    or private.owns_salon(salon_id)
    or private.is_super_admin()
  );

-- Staff policy must not SELECT from public.salons under its own RLS policy.
drop policy if exists staff_owner_admin_select on public.staff;
drop policy if exists staff_owner_admin_insert on public.staff;
drop policy if exists staff_owner_admin_update on public.staff;
drop policy if exists staff_owner_admin_delete on public.staff;

create policy staff_owner_admin_select
  on public.staff for select to authenticated
  using (private.can_manage_salon_staff(salon_id));

create policy staff_owner_admin_insert
  on public.staff for insert to authenticated
  with check (private.can_manage_salon_staff(salon_id));

create policy staff_owner_admin_update
  on public.staff for update to authenticated
  using (private.can_manage_salon_staff(salon_id))
  with check (private.can_manage_salon_staff(salon_id));

create policy staff_owner_admin_delete
  on public.staff for delete to authenticated
  using (private.can_manage_salon_staff(salon_id));
