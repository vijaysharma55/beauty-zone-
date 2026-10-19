import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);

const KEY_LEN = 64;
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

/* ------------------------------------------------------------------ */
/* Password hashing (scrypt, per-password salt, timing-safe compare)   */
/* ------------------------------------------------------------------ */

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(String(password), salt, KEY_LEN, SCRYPT_PARAMS);
  return `scrypt$${SCRYPT_PARAMS.N}$${SCRYPT_PARAMS.r}$${SCRYPT_PARAMS.p}$${salt}$${derived.toString('hex')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, hash] = parts;
  try {
    const derived = await scrypt(String(password), salt, KEY_LEN, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== derived.length) return false;
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
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

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
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
