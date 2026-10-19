import crypto from 'node:crypto';
import { HttpError } from './security.js';

const GOOGLE_CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);

let certCache = { keys: null, fetchedAt: 0 };
const CERT_TTL_MS = 60 * 60 * 1000;

function base64UrlDecode(input) {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function parseJwt(token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(400, 'Invalid Google credential');
  const [headerB64, payloadB64, signatureB64] = parts;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Invalid Google credential');
  }
  return {
    header,
    payload,
    signingInput: Buffer.from(`${headerB64}.${payloadB64}`),
    signature: base64UrlDecode(signatureB64),
  };
}

async function getGoogleKeys(force = false) {
  const fresh = Date.now() - certCache.fetchedAt < CERT_TTL_MS;
  if (!force && fresh && certCache.keys) return certCache.keys;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const resp = await fetch(GOOGLE_CERTS_URL, { signal: controller.signal });
    if (!resp.ok) throw new Error(`cert fetch failed: ${resp.status}`);
    const body = await resp.json();
    certCache = { keys: body.keys || [], fetchedAt: Date.now() };
    return certCache.keys;
  } catch (err) {
    if (certCache.keys?.length) return certCache.keys;
    throw new HttpError(503, 'Unable to reach Google sign-in services right now. Please use email and password.');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Verifies a Google Identity Services ID token (JWT) end-to-end:
 * signature against Google's published JWKS, issuer, audience, expiry and email_verified.
 * Returns { sub, email, name, picture }.
 */
export async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new HttpError(503, 'Google sign-in is not configured on this server.');
  }
  if (!idToken || typeof idToken !== 'string' || idToken.length > 10_000) {
    throw new HttpError(400, 'Missing Google credential');
  }

  const { header, payload, signingInput, signature } = parseJwt(idToken);
  if (header.alg !== 'RS256' || !header.kid) {
    throw new HttpError(401, 'Unsupported Google credential');
  }

  const verifyWithKeys = async (keys) => {
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    return crypto.verify('RSA-SHA256', signingInput, key, signature);
  };

  let keys = await getGoogleKeys();
  let valid = await verifyWithKeys(keys);
  if (!valid) {
    keys = await getGoogleKeys(true);
    valid = await verifyWithKeys(keys);
  }
  if (!valid) throw new HttpError(401, 'Google credential signature is invalid');

  const nowSec = Math.floor(Date.now() / 1000);
  if (!GOOGLE_ISSUERS.has(payload.iss)) throw new HttpError(401, 'Unexpected Google token issuer');
  if (payload.aud !== clientId) throw new HttpError(401, 'Google token was issued for a different application');
  if (typeof payload.exp !== 'number' || payload.exp < nowSec - 30) {
    throw new HttpError(401, 'Google credential has expired');
  }
  if (typeof payload.iat === 'number' && payload.iat > nowSec + 300) {
    throw new HttpError(401, 'Google credential is not yet valid');
  }
  if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') {
    throw new HttpError(401, 'Google account email is not verified');
  }

  return {
    sub: String(payload.sub),
    email: String(payload.email).toLowerCase(),
    name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : String(payload.email).split('@')[0],
    picture: typeof payload.picture === 'string' ? payload.picture : '',
  };
}

export function googleConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID);
}
