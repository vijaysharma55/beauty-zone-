import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acquireOnboardingTab } from '../../src/lib/onboardingTab.js';

function storage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) };
}
function locks() {
  const held = new Set();
  return {
    request(name, options, callback) {
      assert.equal(options.ifAvailable, true);
      if (held.has(name)) return Promise.resolve(callback(null));
      held.add(name);
      try { return Promise.resolve(callback({ name })).finally(() => held.delete(name)); }
      catch (error) { held.delete(name); return Promise.reject(error); }
    },
  };
}

test('copied opener sessionStorage gets a different backup key; a reload retains its own key', async () => {
  const oldWindow = globalThis.window;
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: locks() } });
    const firstStorage = storage();
    globalThis.window = { sessionStorage: firstStorage };
    const first = await acquireOnboardingTab('owner');
    const copiedStorage = storage({ 'beautyzone.onboarding.tab:owner': first.id });
    globalThis.window = { sessionStorage: copiedStorage };
    const second = await acquireOnboardingTab('owner');
    assert.notEqual(second.id, first.id);
    assert.equal(copiedStorage.getItem('beautyzone.onboarding.tab:owner'), second.id);
    first.release();
    await new Promise((resolve) => setImmediate(resolve));
    globalThis.window = { sessionStorage: firstStorage };
    const reloaded = await acquireOnboardingTab('owner');
    assert.equal(reloaded.id, first.id);
    second.release();
    reloaded.release();
  } finally {
    globalThis.window = oldWindow;
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else delete globalThis.navigator;
  }
});

test('without Web Locks each page gets a fresh key for safe backup recovery', async () => {
  const oldWindow = globalThis.window;
  const oldNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {} });
    globalThis.window = { sessionStorage: storage() };
    const first = await acquireOnboardingTab('owner');
    const second = await acquireOnboardingTab('owner');
    assert.notEqual(first.id, second.id);
    first.release(); second.release();
  } finally {
    globalThis.window = oldWindow;
    if (oldNavigator) Object.defineProperty(globalThis, 'navigator', oldNavigator);
    else delete globalThis.navigator;
  }
});
