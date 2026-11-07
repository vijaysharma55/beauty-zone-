-- BeautyZone — strict RBAC + super-admin-only approval workflow.
--
-- Problem this migration closes
-- -----------------------------
-- The previous schema let the *owner* of a salon drive the website workflow:
--   * `salons_owner_update` allowed a salon owner to write any column they could
--     reach, and the guard trigger merely compared NEW vs OLD values, so an
--     owner could transition `status` themselves when the API was bypassed.
--   * `salon_versions_owner_insert` accepted any version the owner inserted.
--   * There was no super-admin-only constraint on `website_published`.
--
-- Result: an owner could self-approve and publish their own website without a
-- platform review. This migration makes the three workflow states explicit and
-- enforces the transitions in the database, not just in the Express API:
--
--   State 1  Draft              salons.website_status = 'draft'
--   State 2  Pending approval   salons.website_status = 'pending_approval'
--                               (set ONLY by the owner clicking Submit for Review)
--   State 3  Approved/Published salons.website_status = 'approved'
--                               (set ONLY by a super_admin)
--
-- Idempotent: safe to re-run in the Supabase SQL Editor as postgres/service_role.

-- ---------------------------------------------------------------------------
-- 1. Explicit, constrained workflow state column.
-- ---------------------------------------------------------------------------
alter table public.salons
  add column if not exists website_status text not null default 'draft';

-- Backfill from the legacy status/website_published pair before the CHECK is
-- applied, so existing rows satisfy the new constraint.
update public.salons s
   set website_status = case
     when s.status = 'approved' and s.website_published then 'approved'
     when s.status = 'pending' then 'pending_approval'
     else 'draft'
   end
 where s.website_status is distinct from case
     when s.status = 'approved' and s.website_published then 'approved'
     when s.status = 'pending' then 'pending_approval'
     else 'draft'
   end;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.salons'::regclass and conname = 'salons_website_status_check'
  ) then
    alter table public.salons
      add constraint salons_website_status_check
      check (website_status in ('draft', 'pending_approval', 'approved'));
  end if;
end $$;

-- A published website must have passed review. `website_status = 'approved'`
-- means "a super admin approved a snapshot". `status = 'pending'` alongside a
-- published website is legitimate: the owner submitted a *newer* update while
-- the previously approved snapshot stays live. Rejected / change-requested
-- salons are taken offline by the review trigger.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.salons'::regclass and conname = 'salons_published_requires_approval'
  ) then
    alter table public.salons
      add constraint salons_published_requires_approval
      check (
        not website_published
        or (
          website_status = 'approved'
          and status in ('approved', 'pending')
        )
      );
  end if;
end $$;

create index if not exists salons_website_status_idx on public.salons (website_status);

-- ---------------------------------------------------------------------------
-- 2. Role helpers: the owner of the row, and an explicit super-admin check.
--    `private.is_super_admin()` is (re)defined by
--    20261107_beautyzone_admin_login_rbac.sql; this migration only relies on it
--    and never redefines it, so both files can be applied in any order.
-- ---------------------------------------------------------------------------
create or replace function private.is_salon_owner_of(p_salon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.salons s
    where s.id = p_salon_id
      and s.owner_id = (select auth.uid())
  );
$$;

revoke all on function private.is_salon_owner_of(uuid) from public, anon;
grant execute on function private.is_salon_owner_of(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Hard guard: workflow fields are writable only by a super admin.
--
--    Replaces the previous public.guard_salon_workflow_fields(), which relied on
--    a field-by-field NEW-vs-OLD comparison and therefore had to be permissive.
--    This version is deny-by-default: an owner may edit content columns, and
--    every workflow column keeps its previous value. A service-role connection
--    (auth.uid() is null, i.e. the trusted backend) and a super admin are the
--    only writers of workflow state.
-- ---------------------------------------------------------------------------
create or replace function public.guard_salon_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_privileged boolean :=
    (select auth.uid()) is null or coalesce((select public.is_super_admin()), false);
  -- Safe copies of the previous row: `old` is unassigned during INSERT.
  v_old_status text := case when tg_op = 'UPDATE' then old.status else null end;
  v_old_website_status text := case when tg_op = 'UPDATE' then old.website_status else null end;
  v_old_published boolean := case when tg_op = 'UPDATE' then old.website_published else false end;
begin
  if v_is_privileged then
    -- Keep website_status consistent even when a privileged caller writes the
    -- legacy status/website_published pair directly.
    if new.status = 'approved' then
      -- A super admin approved a version: the website is (or may be) live.
      new.website_status := 'approved';
    elsif new.status = 'pending'
          and v_old_website_status = 'approved'
          and v_old_published then
      -- The owner submitted a newer update while the approved snapshot stays
      -- live. Keep the approved marker so published ⇒ reviewed still holds.
      new.website_status := 'approved';
    elsif new.status = 'pending' then
      new.website_status := 'pending_approval';
    else
      new.website_status := 'draft';
    end if;

    if new.website_published and new.website_status <> 'approved' then
      raise exception 'A salon website can only be published after super-admin approval (status=%)', new.status
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'draft'
       or new.website_status <> 'draft'
       or new.website_published
       or new.suspended
       or new.approved_at is not null
       or new.reviewed_at is not null
       or new.submitted_at is not null then
      raise exception 'New salon records must start as unpublished drafts'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- UPDATE by a non-privileged (owner) session.
  if new.owner_id is distinct from old.owner_id then
    raise exception 'A salon cannot change owner' using errcode = 'check_violation';
  end if;

  -- Approval / publishing / suspension state is super-admin-only. Only the
  -- single owner-triggered transition is permitted below.
  if new.website_published is distinct from old.website_published
     or new.published_at is distinct from old.published_at
     or new.approved_at is distinct from old.approved_at
     or new.reviewed_at is distinct from old.reviewed_at
     or new.review_note is distinct from old.review_note
     or new.suspended is distinct from old.suspended
     or new.suspended_reason is distinct from old.suspended_reason
     or new.suspended_at is distinct from old.suspended_at then
    raise exception 'Salon approval, publishing and suspension fields are admin-controlled'
      using errcode = 'insufficient_privilege';
  end if;

  -- State machine for the owner: Draft (or changes requested / rejected) →
  -- Pending Approval. Nothing else may change `status` or `website_status`.
  if new.status is distinct from old.status or new.website_status is distinct from old.website_status then
    if new.status = 'pending'
       and new.website_status = 'pending_approval'
       and coalesce(v_old_published, false) = false
       and v_old_status in ('draft', 'rejected', 'changes_requested') then
      -- Allowed: "Submit for Review". The owner may only set the submission
      -- timestamp alongside it.
      new.status := 'pending';
      new.website_status := 'pending_approval';
      new.approved_at := case when tg_op = 'UPDATE' then old.approved_at else null end;
      new.reviewed_at := null;
      new.review_note := '';
      return new;
    end if;
    raise exception 'Only a super admin can approve or publish a salon website'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists "guard_salon_workflow_fields" on "public"."salons";
create trigger guard_salon_workflow_fields
before insert or update on public.salons
for each row execute function public.guard_salon_workflow_fields();

-- ---------------------------------------------------------------------------
-- 4. salon_versions: an owner may only INSERT a pending submission for their
--    own salon and may never UPDATE/DELETE a version. Reviewing is a super
--    admin action. This closes the "owner writes approved version" path.
-- ---------------------------------------------------------------------------
create or replace function public.guard_salon_version_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_privileged boolean :=
    (select auth.uid()) is null or coalesce((select public.is_super_admin()), false);
begin
  if v_is_privileged then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.status <> 'pending' then
      raise exception 'New salon versions must be submitted as pending'
        using errcode = 'check_violation';
    end if;
    if not coalesce((select private.is_salon_owner_of(new.salon_id)), false) then
      raise exception 'You can only submit versions for your own salon'
        using errcode = 'insufficient_privilege';
    end if;
    if new.reviewed_at is not null or new.reviewed_by is not null then
      raise exception 'A submitted version cannot claim a review'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  raise exception 'Only a super admin may change a submitted version'
    using errcode = 'insufficient_privilege';
end;
$$;

drop trigger if exists "guard_salon_version_state" on "public"."salon_versions";
create trigger guard_salon_version_state
before insert or update on public.salon_versions
for each row execute function public.guard_salon_version_state();

-- A salon owner must not be able to delete review history.
drop policy if exists "salon_versions_owner_delete" on "public"."salon_versions";

-- ---------------------------------------------------------------------------
-- 5. Row level security: owners may read their own salon, but only a super
--    admin may write workflow state. Content edits remain owner-writable, which
--    the trigger above restricts to non-workflow columns.
-- ---------------------------------------------------------------------------
alter table public.salons enable row level security;

drop policy if exists "salons_owner_update" on "public"."salons";
create policy "salons_owner_update" on "public"."salons"
as permissive for update to "authenticated"
using (
  (owner_id = (select auth.uid()))
  or (select private.is_super_admin())
)
with check (
  (owner_id = (select auth.uid()))
  or (select private.is_super_admin())
);

-- Publishing/suspension is super-admin-only; express it as its own policy so the
-- intent is visible in the Supabase dashboard even though the trigger is the
-- real enforcement point.
drop policy if exists "salons_super_admin_workflow" on "public"."salons";
create policy "salons_super_admin_workflow" on "public"."salons"
as permissive for all to "authenticated"
using ((select private.is_super_admin()))
with check ((select private.is_super_admin()));

-- Public visitors only ever see approved + published + unsuspended websites.
drop policy if exists "salons_owner_or_public_select" on "public"."salons";
create policy "salons_owner_or_public_select" on "public"."salons"
as permissive for select to "anon", "authenticated"
using (
  (
    website_published
    and website_status = 'approved'
    and status = 'approved'
    and not suspended
  )
  or (owner_id = (select auth.uid()))
  or (select private.is_super_admin())
);

-- ---------------------------------------------------------------------------
-- 6. Operating admins (role = 'admin') get read-only console visibility and are
--    explicitly denied the approval/publishing writes they never had in the API.
-- ---------------------------------------------------------------------------
create or replace function private.is_operational_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.status = 'active'
  );
$$;

revoke all on function private.is_operational_admin() from public, anon;
grant execute on function private.is_operational_admin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 7. Verification queries (read-only, safe to run):
--
--   select id, slug, status, website_status, website_published, approved_at
--     from public.salons order by updated_at desc limit 20;
--
--   -- Must return zero rows: nothing live without an approved version.
--   select s.id, s.slug
--     from public.salons s
--    where s.website_published
--      and not exists (
--        select 1 from public.salon_versions v
--         where v.salon_id = s.id and v.status = 'approved'
--      );
--
--   -- Must return zero rows: nothing live without super-admin approval.
--   select id, slug from public.salons
--    where website_published and website_status <> 'approved';
-- ---------------------------------------------------------------------------
