-- Add only the privacy-safe hide-mobile flag to the anonymous staff projection.
-- Keep it as the final column so CREATE OR REPLACE VIEW remains compatible with
-- the previously deployed public.staff_public_profiles column order.
create or replace view public.staff_public_profiles
with (security_barrier = true)
as
select
  st.id,
  st.salon_id,
  st.name,
  st.role_title,
  st.bio,
  st.photo_url,
  st.specialties,
  st.qualifications,
  case when st.work_photos_consent then st.work_photos else '[]'::jsonb end as work_photos,
  st.work_photos_consent,
  st.rating,
  st.review_count,
  st.experience,
  st.active,
  st.booking_enabled,
  st.availability_status,
  st.service_ids,
  st.weekly_schedule,
  st.sort_order,
  st.created_at,
  st.updated_at,
  st.hide_mobile_number
from public.staff st
where st.active = true
  and exists (
    select 1
    from public.salons s
    where s.id = st.salon_id
      and s.website_published = true
      and s.status in ('approved', 'pending')
      and s.suspended = false
      and exists (
        select 1
        from public.salon_versions v
        where v.salon_id = s.id
          and v.status = 'approved'
      )
  );

revoke all privileges on table public.staff_public_profiles from public, anon, authenticated;
grant select on table public.staff_public_profiles to anon;
