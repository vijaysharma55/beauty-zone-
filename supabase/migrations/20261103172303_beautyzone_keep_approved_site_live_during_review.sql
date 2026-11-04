-- Preserve the last approved public site while an owner's new version is under review.
drop policy if exists salons_owner_or_public_select on public.salons;
create policy salons_owner_or_public_select on public.salons
for select to anon,authenticated using (
  (website_published and status in ('approved','pending') and not suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=salons.id and v.status='approved'))
  or owner_id=(select auth.uid())
  or (select private.is_super_admin())
);

drop policy if exists salon_versions_public_read on public.salon_versions;
create policy salon_versions_public_read on public.salon_versions
for select to anon,authenticated using (
  status='approved' and exists(select 1 from public.salons s where s.id=salon_versions.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended)
);

drop policy if exists services_owner_or_public_select on public.services;
create policy services_owner_or_public_select on public.services
for select to anon,authenticated using (
  (active and exists(select 1 from public.salons s where s.id=services.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved')))
  or exists(select 1 from public.salons s where s.id=services.salon_id
    and (s.owner_id=(select auth.uid()) or (select private.is_super_admin())))
);

drop policy if exists staff_owner_or_public_select on public.staff;
create policy staff_owner_or_public_select on public.staff
for select to anon,authenticated using (
  (active and exists(select 1 from public.salons s where s.id=staff.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved')))
  or exists(select 1 from public.salons s where s.id=staff.salon_id
    and (s.owner_id=(select auth.uid()) or (select private.is_super_admin())))
);

drop policy if exists branches_public_read on public.branches;
create policy branches_public_read on public.branches
for select to anon,authenticated using (
  active and salon_id is not null and exists(select 1 from public.salons s where s.id=branches.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
  or (owner_id is not null and (select private.is_super_admin()))
);

drop policy if exists gallery_items_public_read on public.gallery_items;
create policy gallery_items_public_read on public.gallery_items
for select to anon,authenticated using (
  active and salon_id is not null and exists(select 1 from public.salons s where s.id=gallery_items.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
  or (owner_id is not null and (select private.is_super_admin()))
);

drop policy if exists salon_packages_public_read on public.salon_packages;
create policy salon_packages_public_read on public.salon_packages
for select to anon,authenticated using (
  active and salon_id is not null and exists(select 1 from public.salons s where s.id=salon_packages.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
  or (owner_id is not null and (select private.is_super_admin()))
);

drop policy if exists videos_public_read on public.videos;
create policy videos_public_read on public.videos
for select to anon,authenticated using (
  active and salon_id is not null and exists(select 1 from public.salons s where s.id=videos.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
  or (owner_id is not null and (select private.is_super_admin()))
);

drop policy if exists service_reviews_public_approved_select on public.service_reviews;
create policy service_reviews_public_approved_select on public.service_reviews
for select to anon,authenticated using (
  status='approved' and exists(select 1 from public.salons s where s.id=service_reviews.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
);

drop policy if exists service_reviews_public_insert on public.service_reviews;
create policy service_reviews_public_insert on public.service_reviews
for insert to anon,authenticated with check (
  exists(select 1 from public.salons s where s.id=service_reviews.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
);

drop policy if exists stylist_inquiries_public_insert on public.stylist_inquiries;
create policy stylist_inquiries_public_insert on public.stylist_inquiries
for insert to anon,authenticated with check (
  exists(select 1 from public.salons s where s.id=stylist_inquiries.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
);

drop policy if exists waitlist_public_insert on public.waitlist;
create policy waitlist_public_insert on public.waitlist
for insert to anon,authenticated with check (
  (salon_id is null and status='pending')
  or exists(select 1 from public.salons s where s.id=waitlist.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved'))
);

drop policy if exists bookings_public_insert on public.bookings;
create policy bookings_public_insert on public.bookings
for insert to anon,authenticated with check (
  status='requested' and source='public' and advance_paid=0
  and (created_by is null or created_by=(select auth.uid()))
  and (salon_id is null or exists(select 1 from public.salons s where s.id=bookings.salon_id
    and s.website_published and s.status in ('approved','pending') and not s.suspended
    and exists(select 1 from public.salon_versions v where v.salon_id=s.id and v.status='approved')))
  and (service_id is null or exists(select 1 from public.services sv
    where sv.id=bookings.service_id and sv.salon_id=bookings.salon_id and sv.active))
  and (staff_id is null or exists(select 1 from public.staff st
    where st.id=bookings.staff_id and st.salon_id=bookings.salon_id and st.active and st.booking_enabled))
);
