import { db, newId, nowIso, findUserByEmail } from './db.js';

/**
 * Supabase Auth bridge.
 *
 * Identity (sign up, sign in, password reset, email confirmation) lives in
 * Supabase Auth. The browser sends the Supabase access token as
 * `Authorization: Bearer <jwt>`; we validate it against Supabase's /auth/v1/user
 * endpoint (no JWT secret needed on the server) and map it to a row in the local
 * `users` table so every existing route that reads `req.user` keeps working.
 *
 * Roles are NEVER read from Supabase metadata: new accounts are `salon_owner`,
 * and an existing local account (e.g. the seeded super admin) keeps its role.
 */

const CACHE_TTL_MS = 30_000;
const cache = new Map();

export const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
export const supabaseAnonKey = () =>
  process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';
export const supabaseConfigured = () => Boolean(supabaseUrl() && supabaseAnonKey());

async function fetchSupabaseUser(token) {
  const hit = cache.get(token);
  if (hit && hit.expires > Date.now()) return hit.user;
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: supabaseAnonKey(), Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const user = await res.json();
  if (cache.size > 500) cache.clear();
  cache.set(token, { user, expires: Date.now() + CACHE_TTL_MS });
  return user;
}

function syncLocalUser(sbUser) {
  const email = String(sbUser.email || '').trim().toLowerCase();
  if (!email) return null;
  const verifiedAt = sbUser.email_confirmed_at || sbUser.confirmed_at;
  if (!verifiedAt) return null; // unconfirmed identities are never trusted
  const meta = sbUser.user_metadata || {};
  const name = String(meta.name || meta.full_name || email.split('@')[0]).trim().slice(0, 120) || 'Salon Owner';

  let row = db.prepare('SELECT * FROM users WHERE supabase_id = ?').get(sbUser.id) || findUserByEmail(email);
  const now = nowIso();
  if (!row) {
    const id = newId();
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, email_verified, email_verified_at, supabase_id, last_login_at, created_at, updated_at)
       VALUES (?, ?, NULL, 'password', ?, 'salon_owner', 'active', 1, ?, ?, ?, ?, ?)`
    ).run(id, email, name, verifiedAt, sbUser.id, now, now, now);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  }
  if (!row.supabase_id || !row.email_verified) {
    db.prepare(
      'UPDATE users SET supabase_id = COALESCE(supabase_id, ?), email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?'
    ).run(sbUser.id, verifiedAt, now, row.id);
    row = db.prepare('SELECT * FROM users WHERE id = ?').get(row.id);
  }
  return row;
}

/** Express middleware: populate req.user from a Supabase bearer token when no cookie session exists. */
export async function loadSupabaseUser(req, res, next) {
  if (req.user || !supabaseConfigured()) return next();
  const header = req.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match || match[1].length > 4096) return next();
  try {
    const sbUser = await fetchSupabaseUser(match[1]);
    if (!sbUser) return next();
    const row = syncLocalUser(sbUser);
    if (row && row.status === 'active') {
      req.user = row;
      req.session = null;
      req.authSource = 'supabase';
    }
  } catch (err) {
    console.error('[supabase] token check failed', err.message);
  }
  return next();
}
