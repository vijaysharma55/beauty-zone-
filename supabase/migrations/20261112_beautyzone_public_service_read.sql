-- Public storefronts may read only active services belonging to salons whose
-- current approved snapshot is publicly published and not suspended.
-- Owner/admin access remains governed by the existing owner-scoped policies.
drop policy if exists services_public_read on public.services;
create policy services_public_read on public.services
  as permissive for select to anon, authenticated
  using (
    active
    and exists (
      select 1
      from public.salons s
      where s.id = services.salon_id
        and s.website_published
        and s.status in ('approved', 'pending')
        and not s.suspended
        and exists (
          select 1
          from public.salon_versions v
          where v.salon_id = s.id
            and v.status = 'approved'
        )
    )
  );
