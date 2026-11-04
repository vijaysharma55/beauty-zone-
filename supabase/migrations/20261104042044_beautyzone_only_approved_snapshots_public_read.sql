-- Public salon websites consume the immutable approved salon_versions snapshot.
-- Mutable working rows must never be readable through anon PostgREST while a salon is pending review.
drop policy if exists services_owner_or_public_select on public.services;
create policy services_owner_admin_select
on public.services for select to authenticated
using (exists (
  select 1 from public.salons s
  where s.id=services.salon_id
    and (s.owner_id=(select auth.uid()) or (select private.is_super_admin()))
));

drop policy if exists staff_owner_or_public_select on public.staff;
create policy staff_owner_admin_select
on public.staff for select to authenticated
using (exists (
  select 1 from public.salons s
  where s.id=staff.salon_id
    and (s.owner_id=(select auth.uid()) or (select private.is_super_admin()))
));

drop policy if exists gallery_items_public_read on public.gallery_items;
create policy gallery_items_owner_admin_select
on public.gallery_items for select to authenticated
using (
  owner_id=(select auth.uid())
  or (select private.is_super_admin())
  or exists (
    select 1 from public.salons s
    where s.id=gallery_items.salon_id and s.owner_id=(select auth.uid())
  )
);

drop policy if exists videos_public_read on public.videos;
create policy videos_owner_admin_select
on public.videos for select to authenticated
using (
  owner_id=(select auth.uid())
  or (select private.is_super_admin())
  or exists (
    select 1 from public.salons s
    where s.id=videos.salon_id and s.owner_id=(select auth.uid())
  )
);

drop policy if exists branches_public_read on public.branches;
create policy branches_owner_admin_select
on public.branches for select to authenticated
using (
  owner_id=(select auth.uid())
  or (select private.is_super_admin())
  or exists (
    select 1 from public.salons s
    where s.id=branches.salon_id and s.owner_id=(select auth.uid())
  )
);

-- Explicitly remove the public SELECT grant; authenticated users remain RLS-scoped.
revoke select on public.services,public.staff,public.gallery_items,public.videos,public.branches from anon;
grant select on public.services,public.staff,public.gallery_items,public.videos,public.branches to authenticated,service_role;
