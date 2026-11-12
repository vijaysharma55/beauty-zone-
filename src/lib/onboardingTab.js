/** Generate a per-tab identifier even on browsers without randomUUID. */
const newId = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * sessionStorage survives reloads, but a window opened by another tab starts
 * with a COPY of its opener's sessionStorage. Hold a browser lock for the tab
 * ID so a copied ID is replaced before either page writes its backup. On
 * browsers without Web Locks, use a fresh page ID and recover the previous
 * backup by scanning the owner-scoped keys instead.
 */
export async function acquireOnboardingTab(userId) {
  const key = `beautyzone.onboarding.tab:${userId}`;
  let storage = null;
  let existing = '';
  try {
    storage = window.sessionStorage;
    existing = storage.getItem(key) || '';
  } catch { /* Per-page IDs still protect other tabs. */ }
  /** Retain a tab ID across reloads when session storage is available. */
  const remember = (id) => {
    try { storage?.setItem(key, id); } catch { /* Recovery can use the backup scan. */ }
  };
  /** Use a fresh page ID if a persistent tab lock cannot be acquired. */
  const fallback = () => {
    const id = newId();
    remember(id);
    return { id, release: () => {} };
  };
  if (!navigator.locks?.request) return fallback();

  let id = /^[A-Za-z0-9-]{1,100}$/.test(existing) ? existing : newId();
  // Collision is unlikely except when sessionStorage was copied from an
  // opener. Bound retries also protects against a broken Locks implementation.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await new Promise((resolve) => {
      try {
        navigator.locks.request(`beautyzone.onboarding:${userId}:${id}`, { ifAvailable: true }, (lock) => {
          if (!lock) { resolve({ available: false }); return; }
          let release;
          const held = new Promise((done) => { release = done; });
          resolve({ available: true, release });
          return held;
        }).catch(() => resolve({ failed: true }));
      } catch { resolve({ failed: true }); }
    });
    if (result.failed) return fallback();
    if (result.available) {
      remember(id);
      return { id, release: result.release };
    }
    id = newId();
  }
  return fallback();
}
