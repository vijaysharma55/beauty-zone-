import crypto from 'node:crypto';
import { promisify } from 'node:util';
import bcrypt from 'bcryptjs';

const scrypt = promisify(crypto.scrypt);

const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, per-password salt, timing-safe compare)   */
/* ------------------------------------------------------------------ */

export function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(String(password), salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived.toString('hex')}`;
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(String(password), salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived.toString('hex')}`;
}

export function needsRehash(stored) {
  if (!stored || typeof stored !== 'string') return true;
  return !stored.startsWith('scrypt$16384$8$1$');
}

export async function verifyPassword(password, stored) {
  if (password === undefined || password === null || stored === undefined || stored === null) return false;
  const pwdStr = String(password);
  const storedStr = String(stored).trim();
  if (!storedStr) return false;

  // 1. Plain-text exact match fallback (handles legacy / seed / dev plain-text passwords)
  if (pwdStr === storedStr) {
    return true;
  }

  // 2. Bcrypt format ($2a$, $2b$, $2y$, $2x$)
  if (/^\$2[abyx]\$\d{2}\$/.test(storedStr)) {
    try {
      if (bcrypt.compareSync(pwdStr, storedStr)) {
        return true;
      }
    } catch {
      // ignore and continue
    }
  }

  // 3. Scrypt format (canonical: scrypt$N$r$p$salt$hash)
  if (storedStr.startsWith('scrypt$')) {
    const parts = storedStr.split('$');
    if (parts.length === 6 && parts[0] === 'scrypt') {
      const [, N, r, p, salt, hash] = parts;
      try {
        const derived = await scrypt(pwdStr, salt, KEY_LEN, {
          N: Number(N),
          r: Number(r),
          p: Number(p),
          maxmem: 64 * 1024 * 1024,
        });
        const expected = Buffer.from(hash, 'hex');
        if (expected.length === derived.length && crypto.timingSafeEqual(expected, derived)) {
          return true;
        }
      } catch {
        // continue
      }
    }
  }

  // 4. Hex hashes (SHA-256 or MD5)
  if (/^[a-f0-9]{64}$/i.test(storedStr)) {
    const sha256 = crypto.createHash('sha256').update(pwdStr).digest('hex');
    if (sha256.toLowerCase() === storedStr.toLowerCase()) return true;
  }
  if (/^[a-f0-9]{32}$/i.test(storedStr)) {
    const md5 = crypto.createHash('md5').update(pwdStr).digest('hex');
    if (md5.toLowerCase() === storedStr.toLowerCase()) return true;
  }

  return false;
}

/* ------------------------------------------------------------------ */
/* Session tokens: random 256-bit, only the SHA-256 hash is persisted  */
/* ------------------------------------------------------------------ */

export function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

export const SESSION_COOKIE = 'bz_session';
export const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export function parseCookies(req) {
  const header = req.headers.cookie;
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    try {
      out[key] = decodeURIComponent(value);
    } catch {
      out[key] = value;
    }
  }
  return out;
}

export function setSessionCookie(res, token, maxAgeMs = SESSION_TTL_MS) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      maxAgeMs / 1000
    )}${secure}`
  );
}

export function clearSessionCookie(res) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  res.append('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
}

/* ------------------------------------------------------------------ */
/* Basic in-memory rate limiter (per IP + bucket)                      */
/* ------------------------------------------------------------------ */

const buckets = new Map();

export function rateLimit({ windowMs = 60_000, max = 30, key = 'default' } = {}) {
  return (req, res, next) => {
    const now = Date.now();
    const id = `${key}:${req.ip || 'unknown'}`;
    const entry = buckets.get(id);
    if (!entry || entry.resetAt < now) {
      buckets.set(id, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    }
    return next();
  };
}

// Periodic cleanup so the map cannot grow unbounded.
setInterval(() => {
  const now = Date.now();
  for (const [id, entry] of buckets) {
    if (entry.resetAt < now) buckets.delete(id);
  }
}, 60_000).unref?.();

/* ------------------------------------------------------------------ */
/* Input validation helpers                                            */
/* ------------------------------------------------------------------ */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export function str(value, { min = 0, max = 500, field = 'value', required = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw new ValidationError(`${field} is required`);
    return '';
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text`);
  const trimmed = value.trim();
  if (required && trimmed.length === 0) throw new ValidationError(`${field} is required`);
  if (trimmed.length < min) throw new ValidationError(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

export function bool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === 1 || value === '1') return true;
  if (value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

export function int(value, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, field = 'value' } = {}) {
  const n = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) throw new ValidationError(`${field} must be a whole number`);
  if (n < min || n > max) throw new ValidationError(`${field} must be between ${min} and ${max}`);
  return n;
}

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}

export const SPECIAL_SYMBOLS_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

export function checkPasswordStrength(password) {
  const pwd = typeof password === 'string' ? password : '';
  const hasMinLength = pwd.length >= 8;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasLower = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = SPECIAL_SYMBOLS_RE.test(pwd);

  const errors = [];
  if (!hasMinLength) errors.push('Password must be at least 8 characters long');
  if (!hasUpper) errors.push('Password must include at least one uppercase letter (A-Z)');
  if (!hasLower) errors.push('Password must include at least one lowercase letter (a-z)');
  if (!hasNumber) errors.push('Password must include at least one number (0-9)');
  if (!hasSpecial) errors.push('Password must include at least one special symbol (e.g. !@#$%^&*)');
  if (pwd.length > 200) errors.push('Password is too long (maximum 200 characters)');

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  return {
    valid: errors.length === 0,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    score,
    errors,
  };
}

export function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new ValidationError('Password is required');
  }
  const check = checkPasswordStrength(password);
  if (!check.valid) {
    throw new ValidationError(check.errors[0]);
  }
  return password;
}

export class HttpError extends Error {
  constructor(status, message, details, code) {
    super(message);
    this.status = status;
    if (typeof details === 'string' && code === undefined) {
      // A string third argument is a machine-readable error code.
      this.code = details;
      this.details = undefined;
    } else {
      this.details = details;
      this.code = code;
    }
  }
}

export function isSafeImageUrl(value) {
  if (!value) return true;
  if (typeof value !== 'string') return false;
  if (value.length > 2_000_000) return false;
  // Allow our own upload paths and data URLs for images only; block javascript: etc.
  if (/^\/api\/uploads\/[A-Za-z0-9._-]+$/.test(value)) return true;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=\s]+$/.test(value)) return true;
  try {
    const u = new URL(value);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

export function slugify(input) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 60);
}

const RESERVED_SLUGS = new Set([
  'admin', 'api', 'login', 'logout', 'register', 'signup', 'signin', 'dashboard', 'onboarding',
  'preview', 'publish', 'settings', 'billing', 'account', 'salon', 'salons', 'www', 'app', 'assets',
  'static', 'public', 'help', 'support', 'terms', 'privacy',
]);

export function normalizeSlug(input) {
  const slug = slugify(input);
  if (slug.length < 3) throw new ValidationError('Website address must be at least 3 characters (letters, numbers, hyphens)');
  if (slug.length > 60) throw new ValidationError('Website address must be at most 60 characters');
  if (RESERVED_SLUGS.has(slug)) throw new ValidationError('That website address is reserved. Please choose another one.');
  return slug;
}

export function sanitizeText(input, max = 2000) {
  // React escapes on render; we still strip control characters and cap size.
  return String(input ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, max);
}

/* ------------------------------------------------------------------ */
/* Date of birth (mandatory at signup, private profile data)           */
/* ------------------------------------------------------------------ */

export const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;
export const DOB_MIN = '1900-01-01';

/** Today's date (UTC) as YYYY-MM-DD. */
export function todayUtc(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

/**
 * Validates a date-of-birth value.
 * - must be a real calendar date in YYYY-MM-DD form
 * - must not be in the future
 * - must not be before 1900-01-01 (guards against typos / placeholder dates)
 * Returns the normalised string, or null when optional and empty.
 */
export function validateDob(value, { required = true, field = 'Date of birth', now = new Date() } = {}) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a date in YYYY-MM-DD format`);
  const raw = value.trim();
  if (!DOB_RE.test(raw)) throw new ValidationError(`${field} must be a valid date in YYYY-MM-DD format`);
  const [y, m, d] = raw.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    throw new ValidationError(`${field} is not a real calendar date`);
  }
  if (raw < DOB_MIN) throw new ValidationError(`${field} must be on or after ${DOB_MIN}`);
  if (raw > todayUtc(now)) throw new ValidationError(`${field} cannot be in the future`);
  return raw;
}
