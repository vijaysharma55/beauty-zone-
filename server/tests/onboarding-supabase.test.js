import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { defaultOnboardingDraft } from '../../src/lib/onboardingSchema.js';

const OWNER = '11111111-2222-4333-8444-555555555555';
const OTHER = '22222222-3333-4444-8555-666666666666';
let pg;

before(async () => {
  pg = new PGlite();
  await pg.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema private;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth, public to authenticated;
    grant execute on function auth.uid() to authenticated;
    create table public.profiles(id uuid primary key, email text, name text, role text, status text);
    grant select on public.profiles to authenticated;
    create table public.salons(
      id uuid primary key default gen_random_uuid(), owner_id uuid unique not null, name text not null, slug text unique not null,
      tagline text not null default '', description text not null default '', logo_url text not null default '', cover_image text not null default '',
      gallery jsonb not null default '[]', phone text not null default '', email text not null default '', whatsapp text not null default '',
      address_line text not null default '', city text not null default '', state text not null default '', postal_code text not null default '',
      country text not null default 'India', map_url text not null default '', instagram text not null default '', facebook text not null default '',
      hero_title text not null default '', hero_subtitle text not null default '', theme jsonb not null default '{}',
      website_published boolean not null default false, status text not null default 'draft', template_id text not null default 'luxe',
      timings jsonb not null default '[]', owner_name text not null default '', owner_phone text not null default '',
      onboarding_completed boolean not null default false, created_at timestamptz default now(), updated_at timestamptz default now()
    );
    create table public.subscriptions(
      id uuid primary key default gen_random_uuid(), salon_id uuid unique not null references public.salons(id),
      plan text not null, status text not null, current_period_end timestamptz, created_at timestamptz, updated_at timestamptz
    );
    insert into auth.users values ('${OWNER}'), ('${OTHER}');
    insert into public.profiles values ('${OWNER}','owner@example.com','Owner','salon_owner','active'),
      ('${OTHER}','other@example.com','Other','salon_owner','active');
  `);
  await pg.exec(fs.readFileSync(new URL('../../supabase/migrations/20261103_beautyzone_atomic_salon_onboarding.sql', import.meta.url), 'utf8'));
  const migration = fs.readFileSync(new URL('../../supabase/migrations/20261111_beautyzone_onboarding_persistence.sql', import.meta.url), 'utf8');
  await pg.exec(migration);
  await pg.exec(migration); // Safe to apply again.
});
after(async () => { await pg?.close(); });

async function asUser(user) {
  await pg.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${user}', false);`);
}
async function root() { await pg.exec('reset role'); }
async function save(draft, revision) {
  const data = { values: draft.values, slugTouched: draft.slugTouched };
  const result = await pg.query('select public.save_onboarding_draft($1::jsonb, $2, $3) as row', [JSON.stringify(data), draft.currentStep, revision]);
  return result.rows[0].row;
}
const update = (draft, fields) => ({ ...draft, values: { ...draft.values, ...fields } });

test('Supabase migration enforces owner isolation, linear saved steps and idempotent completion', async () => {
  await asUser(OWNER);
  let draft = defaultOnboardingDraft({ email: 'owner@example.com', name: 'Owner' });
  await assert.rejects(() => save({ ...draft, currentStep: 2 }, 0), /Start with salon identity/i);
  let row = await save(draft, 0);
  assert.equal(row.user_id, OWNER);
  assert.equal(row.revision, 1);
  await assert.rejects(() => save({ ...draft, currentStep: 3 }, 1), /step in order/i);
  await assert.rejects(() => save({ ...draft, currentStep: 2 }, 1), /required fields/i);
  await assert.rejects(() => save(update(draft, { city: 'Not yet' }), 1), /current onboarding step/i);
  await assert.rejects(() => save(draft, 0), /ONBOARDING_CONFLICT/);

  await asUser(OTHER);
  assert.equal((await pg.query('select * from public.onboarding_profiles')).rows.length, 0);
  await assert.rejects(() => pg.exec(`update public.onboarding_profiles set data = '{}'::jsonb`), /permission denied/i);
  await root();
  await pg.exec(`insert into public.salons(owner_id,name,slug) values ('${OTHER}','Hidden Draft','hidden-draft')`);
  await asUser(OWNER);
  const hidden = await pg.query("select public.onboarding_slug_available('hidden-draft') as availability");
  assert.equal(hidden.rows[0].availability.available, false, 'unpublished salons still reserve their slug');

  draft = update(draft, { name: 'Rose Studio', slug: 'rose-studio', tagline: 'A little more glow', description: 'A welcoming salon for everyone.' });
  row = await save(draft, 1);
  draft = { ...draft, currentStep: 2 };
  row = await save(draft, row.revision);
  draft = update(draft, { addressLine: '1 Main Road', city: 'Jaipur', state: 'Rajasthan', phone: '+91 98765 43210', email: 'hello@example.com' });
  row = await save(draft, row.revision);
  draft = { ...draft, currentStep: 3 };
  row = await save(draft, row.revision);
  draft = update(draft, { logoUrl: 'https://example.com/logo.png', coverImage: 'https://example.com/hero.jpg' });
  row = await save(draft, row.revision);
  draft = { ...draft, currentStep: 4 };
  row = await save(draft, row.revision);

  await assert.rejects(() => pg.query('select public.complete_salon_onboarding($1)', [row.revision - 1]), /ONBOARDING_CONFLICT/);
  const result = await pg.query('select public.complete_salon_onboarding($1) as result', [row.revision]);
  assert.equal(result.rows[0].result.salon.slug, 'rose-studio');
  assert.equal(result.rows[0].result.salon.onboarding_completed, true);
  assert.equal(result.rows[0].result.subscription.status, 'trialing');
  const retried = await pg.query('select public.complete_salon_onboarding($1) as result', [row.revision]);
  assert.equal(retried.rows[0].result.salon.id, result.rows[0].result.salon.id);
  await assert.rejects(() => save(draft, row.revision + 1), /ONBOARDING_COMPLETED/);
  await assert.rejects(() => pg.query('select public.create_salon_onboarding($1::jsonb)', ['{}']), /permission denied/i);
  await root();
  assert.equal((await pg.query(`select count(*)::int as n from public.salons where owner_id='${OWNER}'`)).rows[0].n, 1);
});
