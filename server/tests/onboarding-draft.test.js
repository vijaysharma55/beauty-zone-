import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OnboardingDraftSync } from '../../src/lib/onboardingDraft.js';
import { checkDraftTransition, defaultOnboardingDraft, onboardingStepSchemas, safeOnboardingStep } from '../../src/lib/onboardingSchema.js';

const clone = (value) => JSON.parse(JSON.stringify(value));
function memoryStorage() {
  const map = new Map();
  return {
    get length() { return map.size; }, key: (index) => [...map.keys()][index] ?? null,
    getItem: (key) => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
  };
}
function fakeRemote() {
  let row = null;
  const calls = [];
  return {
    calls,
    get row() { return clone(row); },
    seed(value) { row = clone(value); },
    async read() { return clone(row); },
    async save(draft, expectedRevision) {
      calls.push(clone(draft));
      if ((row?.revision || 0) !== expectedRevision) throw Object.assign(new Error('conflict'), { code: 'ONBOARDING_CONFLICT' });
      const error = checkDraftTransition(row?.draft || null, draft);
      if (error) throw new Error(error);
      row = { draft: clone(draft), revision: expectedRevision + 1, completed: false, updatedAt: new Date().toISOString() };
      return clone(row);
    },
    async resolve(draft, expectedRevision) {
      if ((row?.revision || 0) !== expectedRevision) throw Object.assign(new Error('conflict'), { code: 'ONBOARDING_CONFLICT' });
      row = { draft: clone(draft), revision: expectedRevision + 1, completed: false, updatedAt: new Date().toISOString() };
      return clone(row);
    },
  };
}
function controller(storage, remote, key = 'owner:tab-a', options = {}) {
  let shown = null;
  let state = null;
  const sync = new OnboardingDraftSync({
    key, backupPrefix: 'owner:', storage, remote, delay: 60_000,
    onDraft: (draft) => { shown = draft; }, onState: (next) => { state = next; }, ...options,
  });
  return { sync, get shown() { return shown; }, get state() { return state; } };
}
const draftWith = (draft, values) => ({ ...draft, values: { ...draft.values, ...values } });

test('validation and resume clamp enforce all prerequisites and sensible hours', () => {
  const draft = defaultOnboardingDraft({ name: 'Owner', email: 'owner@example.com' });
  assert.equal(safeOnboardingStep({ ...draft, currentStep: 4 }), 1);
  assert.equal(onboardingStepSchemas[0].safeParse({ ...draft.values, name: 'Studio', slug: 'admin', tagline: 'Glow', description: 'A salon' }).success, false);
  assert.equal(onboardingStepSchemas[1].safeParse({ ...draft.values, addressLine: '1 Main', city: 'Jaipur', state: 'Rajasthan', phone: 'hello', email: 'nope' }).success, false);
  assert.equal(onboardingStepSchemas[2].safeParse({ ...draft.values, logoUrl: 'javascript:alert(1)', coverImage: 'https://example.com/h.jpg' }).success, false);
  const bad = clone(draft.values);
  bad.timings[0].close = '09:00';
  assert.equal(onboardingStepSchemas[3].safeParse(bad).success, false);
  bad.timings.forEach((day) => { day.closed = true; });
  assert.equal(onboardingStepSchemas[3].safeParse(bad).success, false);
});

test('typing is backed up immediately and restored after reload before the debounce', async () => {
  const storage = memoryStorage();
  const remote = fakeRemote();
  const first = controller(storage, remote);
  const initial = defaultOnboardingDraft({ email: 'owner@example.com' });
  await first.sync.initialize(initial);
  const edited = draftWith(initial, { name: 'A work in progress', tagline: 'New words' });
  first.sync.update(edited);
  assert.equal(JSON.parse(storage.getItem('owner:tab-a')).draft.values.name, 'A work in progress');
  first.sync.dispose();
  assert.equal(remote.row, null);
  const reopened = controller(storage, remote);
  await reopened.sync.initialize(initial);
  assert.equal(reopened.shown.values.name, 'A work in progress');
  await reopened.sync.flush();
  assert.equal(remote.row.draft.values.tagline, 'New words');
  assert.equal(reopened.state.status, 'saved');
  reopened.sync.dispose();
});

test('serializes in-flight saves and does not let an older response overwrite newer typing', async () => {
  const storage = memoryStorage();
  const base = fakeRemote();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let first = true;
  const remote = { ...base, read: base.read, resolve: base.resolve, save: async (...args) => {
    if (first) { first = false; await gate; }
    return base.save(...args);
  } };
  const c = controller(storage, remote);
  const initial = defaultOnboardingDraft();
  await c.sync.initialize(initial);
  c.sync.update(draftWith(initial, { name: 'First' }));
  const saving = c.sync.flush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  c.sync.update(draftWith(initial, { name: 'Second' }));
  release();
  await saving;
  assert.deepEqual(base.calls.map((item) => item.values.name), ['First', 'Second']);
  assert.equal(base.row.draft.values.name, 'Second');
  assert.equal(JSON.parse(storage.getItem('owner:tab-a')).dirty, false);
  c.sync.dispose();
});

test('a lost response is reconciled after reload without discarding newer local changes', async () => {
  const storage = memoryStorage();
  const base = fakeRemote();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const failing = { read: base.read, resolve: base.resolve, async save(...args) {
    const result = await base.save(...args);
    await gate;
    throw new Error('connection dropped after commit');
  } };
  const c = controller(storage, failing);
  const initial = defaultOnboardingDraft();
  await c.sync.initialize(initial);
  c.sync.update(draftWith(initial, { name: 'First' }));
  const saving = c.sync.flush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  c.sync.update(draftWith(initial, { name: 'Newest' }));
  release();
  await assert.rejects(saving, /connection dropped/);
  c.sync.dispose();
  const reopened = controller(storage, base);
  await reopened.sync.initialize(initial);
  assert.equal(reopened.shown.values.name, 'Newest');
  await reopened.sync.flush();
  assert.equal(base.row.draft.values.name, 'Newest');
  assert.equal(base.row.revision, 2);
  reopened.sync.dispose();
});

test('an acknowledgement from an unmounted page cannot overwrite the new page backup', async () => {
  const storage = memoryStorage();
  const base = fakeRemote();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const delayed = { read: base.read, resolve: base.resolve, async save(...args) {
    const result = await base.save(...args);
    await gate;
    return result;
  } };
  const initial = defaultOnboardingDraft();
  const old = controller(storage, delayed);
  await old.sync.initialize(initial);
  old.sync.update(draftWith(initial, { name: 'Before reload' }));
  const pending = old.sync.flush();
  await new Promise((resolve) => setTimeout(resolve, 0));
  old.sync.dispose();
  const current = controller(storage, base);
  await current.sync.initialize(initial);
  current.sync.update(draftWith(initial, { name: 'After reload' }));
  release();
  await pending;
  assert.equal(JSON.parse(storage.getItem('owner:tab-a')).draft.values.name, 'After reload');
  await current.sync.flush();
  assert.equal(base.row.draft.values.name, 'After reload');
  current.sync.dispose();
});

test('separate tabs keep independent backups and require an explicit conflict choice', async () => {
  const storage = memoryStorage();
  const remote = fakeRemote();
  const initial = defaultOnboardingDraft();
  const a = controller(storage, remote, 'owner:tab-a');
  const b = controller(storage, remote, 'owner:tab-b');
  await a.sync.initialize(initial);
  await b.sync.initialize(initial);
  a.sync.update(draftWith(initial, { name: 'First tab' }));
  b.sync.update(draftWith(initial, { name: 'Second tab' }));
  assert.equal(JSON.parse(storage.getItem('owner:tab-a')).draft.values.name, 'First tab');
  assert.equal(JSON.parse(storage.getItem('owner:tab-b')).draft.values.name, 'Second tab');
  await a.sync.flush();
  await assert.rejects(b.sync.flush(), /conflict/);
  assert.equal(b.state.status, 'conflict');
  assert.equal(remote.row.draft.values.name, 'First tab');
  await b.sync.resolveConflict('local');
  assert.equal(remote.row.draft.values.name, 'Second tab');
  assert.equal(b.state.status, 'saved');
  a.sync.dispose(); b.sync.dispose();
});

test('a newly opened tab can recover an abandoned unsynced device backup', async () => {
  const storage = memoryStorage();
  const remote = fakeRemote();
  const initial = defaultOnboardingDraft();
  const old = controller(storage, remote, 'owner:old');
  await old.sync.initialize(initial);
  old.sync.update(draftWith(initial, { name: 'Recovered salon' }));
  old.sync.dispose();
  const fresh = controller(storage, remote, 'owner:new');
  await fresh.sync.initialize(initial);
  assert.equal(fresh.shown.values.name, 'Recovered salon');
  await fresh.sync.flush();
  assert.equal(remote.row.draft.values.name, 'Recovered salon');
  assert.equal(storage.getItem('owner:old'), null, 'recovered backup removed only after confirmed save');
  fresh.sync.dispose();
});

test('offline edits stay backed up and the wizard cannot advance until saving succeeds', async () => {
  const storage = memoryStorage();
  const online = fakeRemote();
  const initial = defaultOnboardingDraft();
  const c = controller(storage, online);
  await c.sync.initialize(initial);
  const identity = draftWith(initial, { name: 'Studio', slug: 'studio', tagline: 'Glow', description: 'A great salon' });
  c.sync.update(identity);
  await c.sync.flush();
  c.sync.dispose();
  const offline = { ...online, read: async () => { throw new Error('offline'); }, save: async () => { throw new Error('offline'); } };
  const reopened = controller(storage, offline);
  await reopened.sync.initialize(initial);
  assert.equal(reopened.state.status, 'error');
  const edited = draftWith(identity, { tagline: 'Still here' });
  reopened.sync.update(edited);
  await assert.rejects(reopened.sync.moveTo(2), /offline/);
  assert.equal(reopened.sync.draft.currentStep, 1);
  assert.equal(JSON.parse(storage.getItem('owner:tab-a')).draft.values.tagline, 'Still here');
  reopened.sync.remote = online;
  await reopened.sync.moveTo(2);
  assert.equal(online.row.draft.currentStep, 2);
  assert.equal(online.row.draft.values.tagline, 'Still here');
  reopened.sync.dispose();
});

test('a remote reset after initial load does not erase later unsynced edits', async () => {
  const storage = memoryStorage();
  const remote = fakeRemote();
  const original = draftWith(defaultOnboardingDraft(), { name: 'Original' });
  remote.seed({ draft: original, revision: 1, completed: false });
  const c = controller(storage, remote);
  await c.sync.initialize(defaultOnboardingDraft());
  c.sync.update(draftWith(original, { name: 'Newest after reset' }));
  remote.seed(null);
  c.sync.remoteKnown = false;
  await c.sync.flush();
  assert.equal(remote.row.draft.values.name, 'Newest after reset');
  assert.equal(c.sync.draft.values.name, 'Newest after reset');
  c.sync.dispose();
});

test('an invalid saved prerequisite rewinds through legal single-step transitions', async () => {
  const storage = memoryStorage();
  const remote = fakeRemote();
  const invalid = { ...defaultOnboardingDraft(), currentStep: 4 };
  remote.seed({ draft: invalid, revision: 7, completed: false });
  const c = controller(storage, remote);
  await c.sync.initialize(defaultOnboardingDraft());
  assert.equal(c.shown.currentStep, 1);
  await c.sync.flush();
  assert.deepEqual(remote.calls.map((draft) => draft.currentStep), [3, 2, 1]);
  assert.equal(remote.row.draft.currentStep, 1);
  c.sync.dispose();
});
