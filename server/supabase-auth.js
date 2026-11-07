/**
 * Trusted Supabase identity + RBAC resolution for the Express API.
 *
 * Why this module exists
 * ----------------------
 * The deployed app runs on Vercel serverless functions. Sessions were stored
 * only in the ephemeral /tmp SQLite `sessions` table, so a cold start could
 * wipe the row that the `bz_session` cookie points at. The login itself then
 * looked successful, but the very next `/api/admin/*` call returned 401 and the
 * dashboard bounced the admin back to /login.
 *
 * This module gives the API a stateless fallback: every request already carries
 * `Authorization: Bearer <supabase access token>` (see src/lib/api.ts). We
 * verify that token directly against Supabase Auth, resolve the role from the
 * *trusted* `public.profiles` row (never from user metadata or a local SQLite
 * row), and mirror the identity into the local `users` table so every legacy
 * route keeps working. Successful verifications are cached briefly in memory.
 */
import { db, nowIso, findUserByEmail, findUserById } from './db.js';
import { EMAIL_RE, hashToken, HttpError, validateDob } from './security.js';
import { SUPER_ADMIN, ADMIN, APPLICATION_ROLES, normalizeRole } from './roles.js';
import { selectWithFallback, withSelect } from './postgrest.js';

const DEFAULT_PROJECT_URL = 'https://botkjeikjzhnbxnowdkl.supabase.co';
const DEFAULT_PUBLISHABLE_KEY = 'sb_publishable_f2nHVHcAdrlosQbZwAAxnQ_vnHQuuv0';
const VERIFY_CACHE_TTL_MS = 30_000;
const SUPABASE_TIMEOUT_MS = 8_000;
const verifyCache = new Map();

export function supabaseConfig() {
  return {
    projectUrl: (process.env.SUPABASE_URL || DEFAULT_PROJECT_URL).replace(/\/+$/, ''),
    publishableKey:
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      DEFAULT_PUBLISHABLE_KEY,
    // Server-only. Never expose this to the browser or a VITE_* variable.
    serviceRoleKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      '',
  };
}

/**
 * Explicit, deployment-configured admin allowlist. It is only ever compared to
 * the *verified* Supabase identity email, and it only ever promotes the trusted
 * `public.profiles` row via the service-role key. It is not a client input and
 * it cannot be used to self-assign admin from a signup form.
 */
function emailAllowlist(value) {
  return new Set(
    String(value || '')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => EMAIL_RE.test(entry))
  );
}

export function superAdminAllowlist() {
  return emailAllowlist(process.env.SUPER_ADMIN_EMAILS);
}

/** Deployment-configured operational admins (read-mostly console access). */
export function adminAllowlist() {
  return emailAllowlist(process.env.ADMIN_EMAILS);
}

async function requestJson(url, { method = 'GET', headers = {}, body } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(SUPABASE_TIMEOUT_MS),
    });
  } catch {
    throw new HttpError(503, 'Could not reach the authentication service. Please try again.');
  }
  const text = await response.text().catch(() => '');
  let data = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 300) }; }
  }
  return { ok: response.ok, status: response.status, data };
}

function restHeaders(key, token) {
  return { apikey: key, Authorization: `Bearer ${token || key}` };
}

const PROFILE_SELECT_VARIANTS = [
  { select: 'id,email,name,role,status,date_of_birth,email_verified' },
  { select: 'id,email,name,role,status,date_of_birth', defaults: { email_verified: false } },
  { select: 'id,email,name,role,status', defaults: { date_of_birth: null, email_verified: false } },
  {
    select: 'id,email,name,role',
    defaults: { status: 'active', date_of_birth: null, email_verified: false },
  },
];

/**
 * Read the trusted profile through progressively smaller `select` lists so a
 * deployed schema missing `status`, `date_of_birth` or `email_verified` never
 * turns a valid sign-in into 409/500. Falls back to the server-only service
 * role when RLS hides the row from the user's own token.
 */
async function readProfile(config, accessToken, userId) {
  const base = `${config.projectUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&limit=1`;
  const run = (key, token) => selectWithFallback(
    PROFILE_SELECT_VARIANTS,
    async (select) => {
      const result = await requestJson(withSelect(base, select), {
        headers: restHeaders(key, token),
      });
      if (!result.ok) {
        const error = new Error(
          result.data?.message || result.data?.hint || `Profile query failed (${result.status})`
        );
        error.status = result.status;
        error.code = result.data?.code;
        throw error;
      }
      return Array.isArray(result.data) ? result.data : [];
    },
    { label: 'public.profiles', onDegrade: () => {} }
  );

  let outcome = await run(config.publishableKey, accessToken);
  let elevated = false;
  if (!outcome.rows.length && config.serviceRoleKey) {
    outcome = await run(config.serviceRoleKey, config.serviceRoleKey);
    elevated = outcome.rows.length > 0;
  }
  return { row: outcome.rows[0] || null, elevated, degraded: outcome.degraded };
}

/**
 * The auth.users -> public.profiles trigger can be missing on a deployed
 * project. Repair it through the service role so a valid Supabase admin is not
 * trapped in an endless "profile is still being created" error.
 */
async function repairProfile(config, identity, email, name) {
  if (!config.serviceRoleKey) return null;
  const headers = {
    ...restHeaders(config.serviceRoleKey, config.serviceRoleKey),
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  };
  const attempts = [
    { id: identity.id, email, name, role: 'salon_owner', status: 'active', email_verified: true },
    // Older schemas may not have status/email_verified yet.
    { id: identity.id, email, name, role: 'salon_owner' },
  ];
  for (const body of attempts) {
    const result = await requestJson(`${config.projectUrl}/rest/v1/profiles`, {
      method: 'POST', headers, body: [body],
    });
    if (result.ok) {
      const row = Array.isArray(result.data) ? result.data[0] : null;
      if (row) return row;
    }
  }
  return null;
}

/** Promote only an allowlisted, verified identity by updating the trusted row. */
async function promoteAllowlistedAdmin(config, identity, targetRole) {
  if (!config.serviceRoleKey) return false;
  const result = await requestJson(
    `${config.projectUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(identity.id)}`,
    {
      method: 'PATCH',
      headers: {
        ...restHeaders(config.serviceRoleKey, config.serviceRoleKey),
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: { role: targetRole, status: 'active' },
    }
  );
  return result.ok;
}

function normalizeDob(rawDob) {
  if (!rawDob) return null;
  try { return validateDob(String(rawDob), { required: false }); } catch { return null; }
}

/**
 * Verify a Supabase access token and return a fully trusted identity/role.
 * Throws HttpError with an actionable message on every failure path.
 */
export async function verifySupabaseAccessToken(accessToken, { fresh = false } = {}) {
  if (typeof accessToken !== 'string' || !accessToken.trim() || accessToken.length > 8192) {
    throw new HttpError(401, 'A valid Supabase access token is required.');
  }
  const token = accessToken.trim();
  const cacheKey = hashToken(token);
  // The login bridge always re-verifies: a role/status change must take effect
  // on the very next sign-in. Protected-route requests use the short cache.
  if (!fresh) {
    const cached = verifyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
  }
  // Opportunistic cache pruning (avoid unbounded growth on a long-lived node).
  if (verifyCache.size > 500) {
    for (const [key, value] of verifyCache) {
      if (value.expiresAt <= Date.now()) verifyCache.delete(key);
    }
  }

  const config = supabaseConfig();

  const identityResult = await requestJson(`${config.projectUrl}/auth/v1/user`, {
    headers: restHeaders(config.publishableKey, token),
  });
  if (!identityResult.ok) {
    throw new HttpError(401, 'Your sign-in session is invalid or has expired. Please sign in again.');
  }
  const identity = identityResult.data || {};
  const email = typeof identity.email === 'string' ? identity.email.trim().toLowerCase() : '';
  if (identity.phone && !identity.email) {
    // Customer phone-OTP sessions are valid Supabase identities but have no
    // application role. Cache the negative result so public pages do not
    // re-verify the same token on every request.
    if (!fresh) verifyCache.set(cacheKey, { value: null, expiresAt: Date.now() + VERIFY_CACHE_TTL_MS });
    return null;
  }
  if (!identity.id || !EMAIL_RE.test(email)) {
    throw new HttpError(401, 'Supabase did not return a verified account identity.');
  }
  if (!identity.email_confirmed_at && !identity.confirmed_at) {
    throw new HttpError(403, 'Verify your email address before opening the salon dashboard.');
  }

  const name = String(
    identity.user_metadata?.name || identity.user_metadata?.full_name || email.split('@')[0]
  ).slice(0, 120);

  let { row: profile } = await readProfile(config, token, identity.id);
  if (!profile) profile = await repairProfile(config, identity, email, name);
  if (!profile || profile.id !== identity.id) {
    throw new HttpError(
      409,
      'Your BeautyZone profile is missing. Run supabase/migrations/20261107_beautyzone_admin_login_rbac.sql, or set SUPABASE_SERVICE_ROLE_KEY so the API can create it.'
    );
  }
  const profileEmail = String(profile.email || '').trim().toLowerCase();
  if (profileEmail && profileEmail !== email) {
    throw new HttpError(403, 'Your Supabase identity does not match its BeautyZone profile.');
  }
  const profileStatus = profile.status === undefined ? 'active' : String(profile.status);
  if (profileStatus !== 'active') {
    throw new HttpError(403, 'This BeautyZone account has been disabled. Please contact support.');
  }

  const rawRole = String(profile.role ?? '').trim();
  if (!rawRole) {
    throw new HttpError(403, 'Your account does not have an approved application role.');
  }
  // Shared vocabulary: super_admin, admin, salon_owner, customer. Legacy
  // spellings (owner, administrator, ...) are normalized, never trusted raw.
  let role = normalizeRole(rawRole);
  if (!APPLICATION_ROLES.includes(role)) {
    throw new HttpError(403, 'Your account does not have an approved application role.');
  }

  // Deployment-configured bootstrap: keep profiles.role the single authority.
  // We update the trusted row with the service role, then re-read it, so the
  // local SQLite role can never be the source of an admin grant.
  const targetRole = superAdminAllowlist().has(email) && role !== SUPER_ADMIN
    ? SUPER_ADMIN
    : adminAllowlist().has(email) && role !== ADMIN && role !== SUPER_ADMIN
      ? ADMIN
      : null;
  if (targetRole) {
    const promoted = await promoteAllowlistedAdmin(config, identity, targetRole);
    if (!promoted) {
      throw new HttpError(
        409,
        'This email is configured as an administrator, but the profile could not be updated. Set SUPABASE_SERVICE_ROLE_KEY or run the admin bootstrap SQL.'
      );
    }
    const refreshed = await readProfile(config, token, identity.id);
    const refreshedRole = String(refreshed.row?.role ?? '').trim();
    if (refreshedRole && APPLICATION_ROLES.includes(normalizeRole(refreshedRole))) {
      role = normalizeRole(refreshedRole);
    }
    if (refreshed.row) profile = refreshed.row;
  }

  const provider = identity.app_metadata?.provider === 'google' ? 'google' : 'password';
  const providerId = Array.isArray(identity.identities)
    ? identity.identities.find((item) => item.provider === 'google')?.id || null
    : null;

  const value = {
    identityId: identity.id,
    email,
    name: String(profile.name || name).slice(0, 120),
    role,
    status: profileStatus,
    provider,
    providerId,
    emailVerified: Boolean(identity.email_confirmed_at || identity.confirmed_at),
    dob: normalizeDob(profile.date_of_birth || identity.user_metadata?.date_of_birth || null),
  };
  if (!fresh) verifyCache.set(cacheKey, { value, expiresAt: Date.now() + VERIFY_CACHE_TTL_MS });
  return value;
}

/**
 * Mirror the verified identity into the local SQLite `users` table.
 * The trusted Supabase role always wins; a stale local super_admin row can
 * never elevate a salon_owner profile (regression guard for A-02).
 */
export function syncLocalUser(verified, { touchLogin = false } = {}) {
  let localUser = db.prepare('SELECT * FROM users WHERE supabase_uid = ?').get(verified.identityId);
  if (!localUser) localUser = findUserByEmail(verified.email);
  const ts = nowIso();

  if (localUser) {
    if (localUser.supabase_uid && localUser.supabase_uid !== verified.identityId) {
      throw new HttpError(409, 'This email is already linked to another sign-in identity.');
    }
    const needsUpdate =
      localUser.supabase_uid !== verified.identityId ||
      localUser.email?.toLowerCase() !== verified.email ||
      localUser.name !== verified.name ||
      localUser.role !== verified.role ||
      localUser.auth_provider !== verified.provider ||
      Number(localUser.email_verified || 0) !== (verified.emailVerified ? 1 : 0) ||
      (touchLogin && !localUser.last_login_at);
    if (needsUpdate) {
      db.prepare(
        `UPDATE users SET supabase_uid = ?, email = ?, name = ?, role = ?, auth_provider = ?,
           google_sub = COALESCE(?, google_sub), email_verified = ?,
           email_verified_at = CASE WHEN ? = 1 THEN COALESCE(email_verified_at, ?) ELSE NULL END,
           date_of_birth = COALESCE(?, date_of_birth), status = 'active',
           failed_logins = 0, locked_until = NULL, updated_at = ? WHERE id = ?`
      ).run(
        verified.identityId, verified.email, verified.name, verified.role, verified.provider,
        verified.providerId, verified.emailVerified ? 1 : 0,
        verified.emailVerified ? 1 : 0, ts, verified.dob, ts, localUser.id
      );
      localUser = findUserById(localUser.id);
    }
  } else {
    db.prepare(
      `INSERT INTO users (id, supabase_uid, email, password_hash, auth_provider, google_sub, name, role, status,
         email_verified, email_verified_at, date_of_birth, created_at, updated_at)
       VALUES (?, ?, ?, NULL, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
    ).run(
      verified.identityId, verified.identityId, verified.email, verified.provider, verified.providerId,
      verified.name, verified.role, verified.emailVerified ? 1 : 0,
      verified.emailVerified ? ts : null, verified.dob, ts, ts
    );
    localUser = findUserById(verified.identityId);
  }

  if (!localUser || localUser.status !== 'active') {
    throw new HttpError(403, 'This account has been disabled. Please contact support.');
  }
  if (touchLogin) {
    db.prepare('UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = NULL WHERE id = ?')
      .run(ts, localUser.id);
    localUser = findUserById(localUser.id);
  }
  return localUser;
}

/** Invalidate a token's short-lived verification cache entry (logout/demotion). */
export function forgetVerifiedToken(accessToken) {
  if (typeof accessToken === 'string' && accessToken) verifyCache.delete(hashToken(accessToken.trim()));
}

export function clearVerificationCache() {
  verifyCache.clear();
}
