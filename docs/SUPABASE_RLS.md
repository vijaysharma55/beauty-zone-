# Supabase RLS mapping (reference only)

**This project does not use Supabase.** Persistence is `node:sqlite`
(`DatabaseSync`) and tenant isolation is enforced in the application layer
(`server/middleware.js`, `server/routes/*.js`).

This document exists so that, if the store is ever migrated to Postgres/Supabase,
the guarantees are re-expressed as row-level security policies rather than being
lost. Every rule below maps 1:1 to an assertion in `server/tests/api.test.js`.

## Roles

| App concept | Postgres role | Notes |
| ----------- | ------------- | ----- |
| Anonymous visitor | `anon` | May read **approved snapshots only** |
| Salon owner | `authenticated` | `owner_id = auth.uid()` on `salons` |
| Super admin | `authenticated` + `is_super_admin()` | Read/write across all salons |

```sql
create or replace function public.is_super_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role = 'super_admin'
  );
$$;

create or replace function public.owns_salon(s uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.salons s
    where s.id = s and s.owner_id = auth.uid()
  );
$$;
```

## `salons`

```sql
alter table public.salons enable row level security;

-- Public: only live, approved, unsuspended rows.
create policy salons_public_read on public.salons
  for select to anon
  using (
    website_published
    and suspended = 0
    and status not in ('rejected', 'changes_requested')
    and exists (
      select 1 from public.salon_versions v
      where v.salon_id = salons.id and v.status = 'approved'
    )
  );

-- Owner: full access to their own row only.
create policy salons_owner_rw on public.salons
  for all to authenticated
  using (owner_id = auth.uid() or public.is_super_admin())
  with check (owner_id = auth.uid() or public.is_super_admin());
```

## `services` / `staff` (nested resources)

The critical rule: **never scope these by a client-supplied salon id.** Scope by
the join to `salons`, which is itself scoped.

```sql
create policy services_scoped on public.services
  for all to authenticated
  using (
    exists (select 1 from public.salons s
            where s.id = services.salon_id
              and (s.owner_id = auth.uid() or public.is_super_admin()))
  )
  with check (
    exists (select 1 from public.salons s
            where s.id = services.salon_id
              and (s.owner_id = auth.uid() or public.is_super_admin()))
  );

create policy services_public_read on public.services
  for select to anon
  using (
    active
    and exists (select 1 from public.salons s
                where s.id = services.salon_id
                  and s.website_published and s.suspended = 0)
  );
```

## `bookings`

```sql
-- Anyone may create a request for a *live* salon.
create policy bookings_public_insert on public.bookings
  for insert to anon, authenticated
  with check (
    exists (select 1 from public.salons s
            where s.id = bookings.salon_id
              and s.website_published and s.suspended = 0
              and exists (select 1 from public.salon_versions v
                          where v.salon_id = s.id and v.status = 'approved'))
  );

-- Read/update is owner-or-admin only. Anon can never read the inbox.
create policy bookings_owner_rw on public.bookings
  for select, update to authenticated
  using (
    exists (select 1 from public.salons s
            where s.id = bookings.salon_id
              and (s.owner_id = auth.uid() or public.is_super_admin()))
  )
  with check (
    exists (select 1 from public.salons s
            where s.id = bookings.salon_id
              and (s.owner_id = auth.uid() or public.is_super_admin()))
  );
```

## Fields that must never reach `anon`

`review_note`, `suspended_reason`, `submitted_by`, `reviewed_by`, `actor_email`,
`meta` (audit), password/session/verification hashes.

In this codebase that is handled by the explicit field whitelist in
`livePayload()` (`server/routes/public.js`) and by `serializeSalon(row, { publicView: true })`.
