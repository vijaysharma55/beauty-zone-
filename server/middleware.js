import { db, findUserById, findSalonByOwner, nowIso } from './db.js';
import { parseCookies, hashToken, SESSION_COOKIE, HttpError } from './security.js';

/* Security headers applied to every response. */
export function securityHeaders(req, res, next) {
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.set('X-XSS-Protection', '0');
  res.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.set(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; script-src 'self' 'unsafe-inline' https://accounts.google.com https://accounts.google.com/gsi/client; frame-src 'self' https://accounts.google.com; connect-src 'self' https://accounts.google.com; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://*.google.com https://localhost.corp.google.com:26001;"
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
    // Same-origin fetch without Origin (older clients) — fall back to custom header check.
    if (req.get('x-requested-with') === 'beautyzone') return next();
    return res.status(403).json({ error: 'Request blocked: missing origin information.' });
  }
  const host = req.get('host');
  let sourceUrl;
  try {
    sourceUrl = new URL(source);
  } catch {
    return res.status(403).json({ error: 'Request blocked: invalid origin.' });
  }
  const allowedHosts = new Set(
    [host, ...(process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean)]
  );
  const matchesHost = sourceUrl.host === host || allowedHosts.has(sourceUrl.host);
  // Dev preview proxies forward the app under *.e2b.app while Host remains the same value,
  // so an exact host match is the correct and strict check.
  if (!matchesHost) {
    return res.status(403).json({ error: 'Request blocked: cross-origin request rejected.' });
  }
  return next();
}

/* Attach req.user / req.session from the HttpOnly session cookie. */
export function loadSession(req, res, next) {
  req.user = null;
  req.session = null;
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token || token.length > 500) return next();
  try {
    const row = db
      .prepare(
        `SELECT s.id AS session_id, s.expires_at, u.*
         FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?`
      )
      .get(hashToken(token));
    if (!row) return next();
    if (new Date(row.expires_at).getTime() < Date.now()) {
      db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
      return next();
    }
    if (row.status !== 'active') return next();
    req.session = { id: row.session_id, expiresAt: row.expires_at };
    req.user = row;
    // Sliding expiry refresh (at most once per hour to limit writes).
    const remaining = new Date(row.expires_at).getTime() - Date.now();
    if (remaining < 1000 * 60 * 60 * 24 * 6) {
      const next = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();
      db.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(next, row.session_id);
    }
  } catch (err) {
    console.error('[session] lookup failed', err.message);
  }
  return next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.status !== 'active') return res.status(403).json({ error: 'Account disabled.' });
  return next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
    if (req.user.role !== role) return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    return next();
  };
}

/* Salon owners may only ever touch the salon they own. req.salon is resolved
   server-side from the session user id — never from client-supplied input. */
export function requireSalonOwner(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required.' });
  if (req.user.role !== 'salon_owner') {
    return res.status(403).json({ error: 'Only salon owners can access this resource.' });
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
    if (req.user.role === 'super_admin') return next();
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
  });
}

export function touchUserLogin(userId) {
  db.prepare('UPDATE users SET last_login_at = ?, failed_logins = 0, locked_until = NULL WHERE id = ?').run(
    nowIso(),
    userId
  );
}
