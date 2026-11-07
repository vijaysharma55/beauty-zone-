/**
 * Pure redirect-loop detection for route guards.
 *
 * React Router will happily bounce `/dashboard -> /dashboard` forever when two
 * guards disagree. Keeping the history in a module-level ring buffer means the
 * guard survives component remounts without writing to sessionStorage on every
 * navigation (important at scale).
 */
const WINDOW_MS = 8_000;
const MAX_IDENTICAL_REDIRECTS = 2;
const MAX_REDIRECTS = 5;

/** @typedef {{ from: string, to: string, at: number }} RedirectEvent */

/**
 * @param {RedirectEvent[]} history
 * @param {string} from
 * @param {string} to
 * @param {number} [now]
 * @returns {{ history: RedirectEvent[], blocked: boolean, reason: string | null }}
 */
export function evaluateRedirect(history, from, to, now = Date.now()) {
  const recent = (Array.isArray(history) ? history : []).filter(
    (event) => event && now - event.at < WINDOW_MS
  );
  const next = [...recent, { from, to, at: now }];

  if (from === to) {
    return { history: next, blocked: true, reason: 'SAME_PATH' };
  }
  const identical = next.filter((event) => event.from === from && event.to === to).length;
  if (identical > MAX_IDENTICAL_REDIRECTS) {
    return { history: next, blocked: true, reason: 'REPEATED_REDIRECT' };
  }
  if (next.length > MAX_REDIRECTS) {
    return { history: next, blocked: true, reason: 'REDIRECT_STORM' };
  }
  return { history: next, blocked: false, reason: null };
}

/** Singleton history used by <ProtectedRoute />. */
let currentHistory = /** @type {RedirectEvent[]} */ ([]);

/**
 * Record a redirect and report whether it should be blocked.
 * @param {string} from @param {string} to
 */
export function noteRedirect(from, to) {
  const result = evaluateRedirect(currentHistory, from, to);
  currentHistory = result.history;
  return result;
}

/** Called after a successful, non-redirect render (fresh navigation). */
export function resetRedirectHistory() { currentHistory = []; }

/** Exposed for tests / diagnostics. */
export function getRedirectHistory() { return [...currentHistory]; }
