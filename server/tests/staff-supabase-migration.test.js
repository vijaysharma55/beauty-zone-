import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

const OWNER = '11111111-2222-4333-8444-555555555555';
const OTHER = '22222222-3333-4444-8555-666666666666';
const ADMIN = '33333333-4444-4555-8666-777777777777';
const OWNER_SALON = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_SALON = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
let pg;

before(async () => {
  pg = new PGlite();
  await pg.exec(
    "create role anon nologin; create role authenticated nologin;" +
    "create schema auth; create schema private;" +
    "create function auth.uid() returns uuid language sql stable as $$ " +
    "select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;" +
    "create table public.profiles(id uuid primary key, role text not null, status text not null default 'active');" +
    "create table public.salons(" +
      "id uuid primary key, owner_id uuid not null unique, website_published boolean not null default false," +
      "status text not null default 'draft', suspended boolean not null default false);" +
    "create table public.salon_versions(" +
      "id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade," +
      "status text not null, submitted_by uuid, created_at timestamptz default now());" +
    "create table public.staff(" +
      "id uuid primary key default gen_random_uuid(), salon_id uuid not null references public.salons(id) on delete cascade," +
      "name text not null, role_title text not null default '', bio text not null default '', photo_url text not null default ''," +
      "specialties jsonb not null default '[]'::jsonb, active boolean not null default true," +
      "booking_enabled boolean not null default true, sort_order integer not null default 0," +
      "created_at timestamptz not null default now(), updated_at timestamptz not null default now());" +
    "create function private.is_super_admin() returns boolean language sql stable security definer " +
      "set search_path = pg_catalog, public as $$ " +
      "select exists(select 1 from public.profiles p where p.id = auth.uid() and p.role = 'super_admin' and p.status = 'active') $$;" +
    "insert into public.profiles(id,role) values " +
      "('" + OWNER + "','salon_owner'),('" + OTHER + "','salon_owner'),('" + ADMIN + "','super_admin');" +
    "insert into public.salons(id,owner_id,website_published,status,suspended) values " +
      "('" + OWNER_SALON + "','" + OWNER + "',true,'approved',false)," +
      "('" + OTHER_SALON + "','" + OTHER + "',true,'approved',false);" +
    "insert into public.salon_versions(salon_id,status,submitted_by) values " +
      "('" + OWNER_SALON + "','approved','" + OWNER + "'),('" + OTHER_SALON + "','approved','" + OTHER + "');" +
    "grant usage on schema public, auth, private to anon, authenticated;" +
    "grant execute on function auth.uid() to anon, authenticated;" +
    "grant execute on function private.is_super_admin() to authenticated;" +
    "grant select on public.profiles, public.salons, public.salon_versions to authenticated;" +
    "grant select on public.salons, public.salon_versions to anon;" +
    "alter table public.salons enable row level security;" +
    "alter table public.salon_versions enable row level security;" +
    "create policy salons_owner_or_public_select on public.salons for select to anon, authenticated " +
      "using ((website_published and status in ('approved','pending') and not suspended and exists " +
      "(select 1 from public.salon_versions v where v.salon_id=salons.id and v.status='approved')) " +
      "or owner_id=auth.uid() or private.is_super_admin());" +
    "create policy salon_versions_scoped_select on public.salon_versions for select to anon, authenticated " +
      "using ((status='approved' and exists (select 1 from public.salons s where s.id=salon_versions.salon_id " +
      "and s.website_published and s.status in ('approved','pending') and not s.suspended)) " +
      "or exists (select 1 from public.salons s where s.id=salon_versions.salon_id and s.owner_id=auth.uid()) " +
      "or private.is_super_admin());"
  );

  const migration = fs.readFileSync(
    new URL('../../supabase/migrations/20261113_beautyzone_staff_source_of_truth.sql', import.meta.url),
    'utf8'
  );
  const publicGate = fs.readFileSync(
    new URL('../../supabase/migrations/20261113_beautyzone_staff_public_approval_gate.sql', import.meta.url),
    'utf8'
  );
  const rlsFix = fs.readFileSync(
    new URL('../../supabase/migrations/20261113_beautyzone_staff_rls_recursion_fix.sql', import.meta.url),
    'utf8'
  );
  await pg.exec(migration);
  await pg.exec(migration); // Base migration is safe to re-run before the policy fix.
  await pg.exec(publicGate);
  await pg.exec(rlsFix);
});

after(async () => {
  await pg?.close();
});

async function asUser(id) {
  assert.ok([OWNER, OTHER, ADMIN].includes(id));
  await pg.exec("set role authenticated; select set_config('request.jwt.claim.sub', '" + id + "', false);");
}

async function asAnon() {
  await pg.exec("set role anon; select set_config('request.jwt.claim.sub', '', false);");
}

async function asRoot() {
  await pg.exec('reset role;');
}

function weekSchedule() {
  const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  return days.map((day) => day === 'sun'
    ? { day, startTime: '', endTime: '', closed: true }
    : { day, startTime: '10:00', endTime: '19:00', closed: false });
}

test('migration adds complete JSONB-backed staff columns and is idempotent', async () => {
  const result = await pg.query(
    "select column_name, data_type from information_schema.columns " +
    "where table_schema='public' and table_name='staff'"
  );
  const columns = new Map(result.rows.map((row) => [row.column_name, row.data_type]));
  for (const name of [
    'primary_role', 'app_access_role', 'commission_percent', 'mobile_number',
    'hide_mobile_number', 'service_ids', 'weekly_schedule', 'availability_status',
    'qualifications', 'work_photos', 'work_photos_consent', 'rating', 'review_count', 'experience'
  ]) assert.ok(columns.has(name), 'missing column ' + name);
  assert.equal(columns.get('specialties'), 'jsonb');
  assert.equal(columns.get('weekly_schedule'), 'jsonb');
  const views = await pg.query(
    "select table_name from information_schema.views where table_schema='public' and table_name='staff_public_profiles'"
  );
  assert.equal(views.rows.length, 1);
  const policies = await pg.query(
    "select policyname from pg_policies where schemaname='public' and tablename='staff'"
  );
  assert.deepEqual(policies.rows.map((row) => row.policyname).sort(), [
    'staff_owner_admin_delete',
    'staff_owner_admin_insert',
    'staff_owner_admin_select',
    'staff_owner_admin_update'
  ]);
});

test('owner can insert, read, update and delete staff only for their own salon', async () => {
  await asUser(OWNER);
  const schedule = JSON.stringify(weekSchedule());
  const result = await pg.query(
    "insert into public.staff (" +
      "salon_id,name,role_title,primary_role,app_access_role,commission_percent,mobile_number," +
      "hide_mobile_number,bio,photo_url,specialties,qualifications,work_photos,work_photos_consent," +
      "experience,active,booking_enabled,availability_status,service_ids,weekly_schedule" +
    ") values (" +
      "$1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10::jsonb,$11::jsonb,$12::jsonb,false," +
      "$13,true,true,'available',$14::jsonb,$15::jsonb" +
    ") returning *",
    [
      OWNER_SALON, 'Rhea Deshmukh', 'Senior Nail Artist', 'nail_artist', 'service_provider',
      22.5, '+919876543210', 'Nail specialist', 'https://cdn.example.test/rhea.jpg',
      JSON.stringify(['Gel Extensions', 'Nail Art']),
      JSON.stringify(['Nail Diploma']),
      JSON.stringify([{ url: 'https://cdn.example.test/work.jpg', caption: 'Set' }]),
      '6+ Years', JSON.stringify(['service-1']), schedule
    ]
  );
  const member = result.rows[0];
  assert.ok(member.id);
  assert.equal(member.salon_id, OWNER_SALON);
  assert.deepEqual(member.specialties, ['Gel Extensions', 'Nail Art']);
  assert.deepEqual(member.weekly_schedule, weekSchedule());
  assert.equal(Number(member.commission_percent), 22.5);

  const salonRead = await pg.query('select id from public.salons where owner_id=auth.uid()');
  assert.deepEqual(salonRead.rows, [{ id: OWNER_SALON }], 'owner reads their salon without recursive policies');
  const own = await pg.query('select id,name from public.staff');
  assert.deepEqual(own.rows, [{ id: member.id, name: 'Rhea Deshmukh' }]);

  await assert.rejects(
    () => pg.query("insert into public.staff(salon_id,name) values ($1,'Cross Tenant')", [OTHER_SALON]),
    /row-level security/i
  );
  await assert.rejects(
    () => pg.query("insert into public.staff(salon_id,name,commission_percent,weekly_schedule) values ($1,'Bad Commission',101,$2::jsonb)", [OWNER_SALON, schedule]),
    /staff_commission_percent_check/i
  );
  await assert.rejects(
    () => pg.query("insert into public.staff(salon_id,name,weekly_schedule) values ($1,'Bad Schedule','[]'::jsonb)", [OWNER_SALON]),
    /staff_weekly_schedule_valid_check/i
  );

  const updated = await pg.query(
    'update public.staff set role_title=$1,work_photos_consent=true where id=$2 returning role_title',
    ['Lead Nail Artist', member.id]
  );
  assert.equal(updated.rows[0].role_title, 'Lead Nail Artist');

  await asUser(OTHER);
  const otherRead = await pg.query('select id from public.staff');
  assert.deepEqual(otherRead.rows, []);
  const forgedUpdate = await pg.query(
    'update public.staff set name=$1 where id=$2 returning id',
    ['Forged', member.id]
  );
  assert.equal(forgedUpdate.rows.length, 0, 'a different salon owner cannot see or update this staff row');

  await asUser(OWNER);
  const deleted = await pg.query('delete from public.staff where id=$1 returning id', [member.id]);
  assert.equal(deleted.rows.length, 1);
  await asRoot();
});

test('public view exposes live active profiles, not private fields or unconsented work photos', async () => {
  await asUser(OWNER);
  const result = await pg.query(
    "insert into public.staff(salon_id,name,mobile_number,hide_mobile_number,commission_percent,work_photos,work_photos_consent,weekly_schedule) " +
    "values($1,'Privacy Test Stylist','+919876543210',true,30,'[{\"url\":\"https://cdn.example.test/private.jpg\"}]'::jsonb,false,$2::jsonb) returning id",
    [OWNER_SALON, JSON.stringify(weekSchedule())]
  );
  const staffId = result.rows[0].id;

  await asAnon();
  const visible = await pg.query(
    'select id,name,work_photos,work_photos_consent,hide_mobile_number from public.staff_public_profiles where id=$1',
    [staffId]
  );
  assert.equal(visible.rows.length, 1);
  assert.deepEqual(visible.rows[0].work_photos, []);
  assert.equal(visible.rows[0].work_photos_consent, false);
  assert.equal(visible.rows[0].hide_mobile_number, true);
  const publicColumns = await pg.query(
    "select column_name from information_schema.columns where table_schema='public' and table_name='staff_public_profiles'"
  );
  assert.equal(publicColumns.rows.some((row) => row.column_name === 'mobile_number'), false);
  assert.equal(publicColumns.rows.some((row) => row.column_name === 'commission_percent'), false);
  assert.equal(publicColumns.rows.some((row) => row.column_name === 'app_access_role'), false);
  await assert.rejects(
    () => pg.query('select id,mobile_number from public.staff where id=$1', [staffId]),
    /permission denied/i
  );
  await assert.rejects(
    () => pg.query("insert into public.staff(salon_id,name) values($1,'Anon Insert')", [OWNER_SALON]),
    /permission denied/i
  );

  await asRoot();
  await pg.query('update public.staff set work_photos_consent=true where id=$1', [staffId]);
  await asAnon();
  const consented = await pg.query(
    'select work_photos from public.staff_public_profiles where id=$1',
    [staffId]
  );
  assert.equal(consented.rows[0].work_photos.length, 1);
  await asRoot();
});
