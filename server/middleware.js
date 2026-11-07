import { db, findUserById, findSalonByOwner, nowIso } from './db.js';
import { parseCookies, hashToken, SESSION_COOKIE, HttpError } from './security.js';
import { verifySupabaseAccessToken, syncLocalUser } from './supabase-auth.js';
import { isAdminRole } from './roles.js';

/* Security headers applied to every response. */
export function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-XSS-Protection', '0');
  res.set('Permissions-Policy', 'camera=(), microphone=(self), geolocation=()');
  res.set(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' data: blob: https:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://accounts.google.com/gsi/client https://checkout.razorpay.com; frame-src 'self' https: https://accounts.google.com https://api.razorpay.com https://checkout.razorpay.com; connect-src 'self' https: wss:; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.google.com https://*.run.app https://*.aistudio.google https://*.cloud.google.com https://localhost.corp.google.com:26001;"
  );
  if (process.env.NODE_ENV === 'production') {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/* CSRF defence for cookie-authenticated writes: verify the request Origin/Referer
   matches the Host the request was sent to (plus an explicit allowlist). */
export function csrfProtection(req, res, next) {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return next();

  const origin = req.get('origin');
  const referer = req.get('referer');
  let refererOrigin = null;
  if (referer) {
    try {
      refererOrigin = new URL(referer).origin;
    } catch {
      refererOrigin = null;
    }
  }
  const source = origin || refererOrigin;
  if (!source) {
    // A cookie-authenticated mutation without Origin/Referer is unsafe unless it
    // carries our same-origin custom header (which forces a browser preflight cross-site).
    const hasSessionCookie = Boolean(parseCookies(req)[SESSION_COOKIE]);
    if (hasSessionCookie && req.get('x-requested-with') !== 'beautyzone') {
      return res.status(403).json({ error: 'Request blocked: request origin could not be verified.' });
    }
    return next();
  }
  const host = req.get('host');
  const forwardedHost = req.get('x-forwarded-host');
  let sourceUrl;
  try {
    sourceUrl = new URL(source);
  } catch {
    return next();
  }
  const allowedHosts = new Set(
    [
      host,
      forwardedHost,
      ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean),
    ]
  );
  const matchesHost =
    sourceUrl.host === host ||
    (forwardedHost && sourceUrl.host === forwardedHost) ||
    allowedHosts.has(sourceUrl.host) ||
    sourceUrl.host.endsWith('.run.app') ||
    sourceUrl.host.endsWith('.aistudio.google') ||
    sourceUrl.host.endsWith('.google.com') ||
    sourceUrl.host.endsWith('.e2b.app') ||
    sourceUrl.host.endsWith('.beautyzone.app') ||
    sourceUrl.hostname === 'localhost' ||
    sourceUrl.hostname === '127.0.0.1';

  if (!matchesHost) {
    return res.status(403).json({ error: 'Request blocked: cross-origin request rejected.' });
  }
  return next();
}

/**
 * Attach req.user / req.session from the HttpOnly session cookie, with a
 * stateless Supabase bearer-token fallback.
 *
 * Vercel serverless instances have an ephemeral /tmp filesystem, so the SQLite
 * `sessions` row referenced by the cookie can disappear between requests. The
 * browser always sends `Authorization: Bearer <supabase access token>` (see
 * src/lib/api.ts); verifying it here keeps /api/admin/* and /api/auth/me
 * working across cold starts. The role comes from the trusted Supabase profile,
 * never from the client or a stale local row.
 */
export function loadSession(req, res, next) {
  req.user = null;
  req.session = null;
  req.authMethod = null;

  // 1. Warm-instance fast path: HttpOnly cookie + SQLite session row.
  let cookieUser = null;
  const cookieToken = parseCookies(req)[SESSION_COOKIE];
  if (cookieToken && cookieToken.length <= 500) {
    try {
      const row = db
        .prepare(
          `SELECT s.id AS session_id, s.expires_at, u.*
           FROM sessions s JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = ?`
        )
        .get(hashToken(cookieToken));
      if (row && new Date(row.expires_at).getTime() >= Date.now() && row.status === 'active') {
        req.session = { id: row.session_id, expiresAt: row.expires_at };
        cookieUser = row;
        req.user = row;
        req.authMethod = 'cookie';
        // Sliding expiry refresh (at most once per hour to limit writes).
        const remaining = new Date(row.expires_at).getTime() - Date.now();
        if (remaining < 1000 * 60 * 60 * 24 * 6) {
          const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
          db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(expires, row.session_id);
        }
      } else if (row && new Date(row.expires_at).getTime() < Date.now()) {
        db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
      }
    } catch (err) {
      console.error('[session] cookie lookup failed', err.message);
    }
  }

  // 2. Stateless, authoritative path: verify the Supabase access token.
  // Runs even when a cookie exists, so a stale/demoted local role can never
  // outlive the trusted public.profiles role. Cached for 30s per token.
  const authHeader = req.get('authorization') || '';
  const bearer = /^Bearer\s+(.+)$/i.exec(authHeader)?.[1]?.trim();
  if (!bearer || bearer.length > 8192) return next();

  void (async () => {
    try {
      const verified = await verifySupabaseAccessToken(bearer);
      if (verified) {
        const localUser = syncLocalUser(verified);
        if (!localUser || localUser.status !== 'active') throw new HttpError(403, 'Account disabled.');
        req.user = localUser;
        req.authMethod = cookieUser ? 'cookie+bearer' : 'bearer';
        req.supabaseIdentity = verified;
      } else {
        // Phone-only customer session: keep any existing cookie identity.
        req.user = cookieUser;
        req.authMethod = cookieUser ? 'cookie' : null;
      }
    } catch (err) {
      // Keep a valid cookie session on a transient Supabase outage; a missing
      // cookie means protected routes correctly answer 401 via requireAuth.
      req.user = cookieUser;
      req.authMethod = cookieUser ? 'cookie' : null;
      if (!cookieUser && err?.status && err.status >= 500) {
        console.error('[session] bearer verification failed', err.message);
      }
    } finally {
      next();
    }
  })();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
  if (req.user.status !== 'active') return res.status(403).json({ error: 'Account disabled.', code: 'ACCOUNT_DISABLED' });
  return next();
}

/** Explicit role gate. Role is always the server-resolved profile role. */
export function requireRole(...allowedRoles) {
  const roles = allowedRoles.flat().filter(Boolean);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.', code: 'AUTH_REQUIRED' });
    if (req.user.status !== 'active') return res.status(403).json({ error: 'Account disabled.', code: 'ACCOUNT_DISABLED' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action.', code: 'FORBIDDEN_ROLE' });
    }
    return next();
  };
}

/**
 * Named convenience gate for the entire super-admin surface.
 *
 * Only `super_admin` passes. It is used for every approval, publishing,
 * suspension, role-grant and platform-setting route, so an operational `admin`
 * (read-only console access) or a `salon_owner` can never approve a website.
 */
export const requireSuperAdmin = requireRole('super_admin');

/**
 * Approval authority gate.
 *
 * Separate from requireSuperAdmin so the intent is explicit at call sites:
 * reviewing submissions and publishing websites is super-admin-only. The salon
 * owner router never mounts this guard, and the owner publish endpoints were
 * removed, so an owner has no approval capability anywhere in the API.
 */
export const requireApprovalAuthority = requireSuperAdmin;

/* Salon owners may only ever touch the salon they own. req.salon is resolved
   server-side from the session user id — never from client-supplied input. */
export function requireSalonOwner(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'salon_owner') {
    return res.status(403).json({ error: 'Only salon owners can access this resource.', code: 'FORBIDDEN_ROLE' });
  }
  const salon = findSalonByOwner(req.user.id);
  if (!salon) {
    return res.status(409).json({ error: 'Complete salon onboarding first.', code: 'ONBOARDING_REQUIRED' });
  }
  req.salon = salon;
  return next();
}

/* Ownership guard for any route that carries a salon id in the path.
   Super admins pass; owners only pass when the id matches their own salon. */
export function requireSalonAccess(paramName = 'salonId') {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    const salonId = req.params[paramName];
    if (!salonId) return res.status(400).json({ error: 'Missing salon id' });
    if (isAdminRole(req.user.role)) return next();
    if (req.user.role === 'salon_owner') {
      const salon = findSalonByOwner(req.user.id);
      if (!salon) return res.status(403).json({ error: 'No salon is linked to this account.' });
      if (salon.id !== salonId) {
        return res.status(403).json({ error: 'You can only access your own salon.' });
      }
      req.salon = salon;
      return next();
    }
    return res.status(403).json({ error: 'Forbidden' });
  };
}

export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Not found' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  const status = err.status || (err instanceof HttpError ? err.status : 500);
  if (status >= 500) console.error('[api] error', err);
  if (res.headersSent) return;
  res.status(status).json({
    error: status >= 500 ? 'Something went wrong. Please try again.' : err.message,
    ...(err.code ? { code: err.code } : {}),
  });
}

export function touchUserLogin(userId) {
  db.prepare('UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = NULL WHERE id = ?').run(
    nowIso(),
    userId
  );
}
