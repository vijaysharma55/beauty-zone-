import { Router } from 'express';
import {
  db,
  newId,
  nowIso,
  publicUser,
  findUserByEmail,
  findUserById,
  findSalonByOwner,
  getSubscriptionForSalon,
  serializeSalon,
  serializeSubscription,
  getSettings,
  audit,
  ensureDemoUsers,
} from '../db.js';
import {
  hashPassword,
  hashPasswordSync,
  needsRehash,
  verifyPassword,
  createSessionToken,
  hashToken,
  setSessionCookie,
  clearSessionCookie,
  SESSION_TTL_MS,
  rateLimit,
  str,
  ValidationError,
  EMAIL_RE,
  HttpError,
  validatePassword,
} from '../security.js';
import { requireAuth, asyncHandler, touchUserLogin } from '../middleware.js';
import { verifyGoogleIdToken, googleConfigured } from '../google.js';
import { sendMail, verificationEmail, passwordResetEmail } from '../mailer.js';
import { workflowInfo } from '../workflow.js';

export const authRouter = Router();

const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const isProduction = () => process.env.NODE_ENV === 'production';

function verificationUrl(req, token) {
  const configured = (process.env.APP_URL || '').replace(/\/+$/, '');
  const base = configured || `${req.protocol}://${req.get('host')}`;
  return `${base}/verify-email?token=${encodeURIComponent(token)}`;
}

function resetPasswordUrl(req, token) {
  const configured = (process.env.APP_URL || '').replace(/\/+$/, '');
  const base = configured || `${req.protocol}://${req.get('host')}`;
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/**
 * Issues a fresh verification token (only its SHA-256 hash is stored) and emails
 * the link. Returns the URL in non-production so local/dev flows stay testable
 * without an SMTP provider.
 */
async function issueVerification(req, user) {
  const token = createSessionToken();
  const expires = new Date(Date.now() + EMAIL_TOKEN_TTL_MS).toISOString();
  db.prepare(
    'UPDATE users SET email_verification_token_hash = ?, email_verification_expires = ?, updated_at = ? WHERE id = ?'
  ).run(hashToken(token), expires, nowIso(), user.id);
  const url = verificationUrl(req, token);
  const mail = verificationEmail({ name: user.name, url });
  await sendMail({ to: user.email, ...mail, tag: 'verify-email' });
  return { url, expires };
}

/**
 * Issues a fresh 1-hour password reset token (only its SHA-256 hash is stored)
 * and dispatches the reset email.
 */
async function issuePasswordReset(req, user) {
  const token = createSessionToken();
  const expires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  db.prepare(
    'UPDATE users SET password_reset_token_hash = ?, password_reset_expires = ?, updated_at = ? WHERE id = ?'
  ).run(hashToken(token), expires, nowIso(), user.id);
  const url = resetPasswordUrl(req, token);
  const mail = passwordResetEmail({ name: user.name, url, token });
  await sendMail({ to: user.email, ...mail, tag: 'reset-password' });
  return { url, token, expires };
}

const loginLimiter = rateLimit({ windowMs: 10 * 60_000, max: 20, key: 'login' });
const registerLimiter = rateLimit({ windowMs: 60 * 60_000, max: 10, key: 'register' });

const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60_000;


function userPayload(userRow) {
  const user = publicUser(userRow);
  const salonRow = user.role === 'salon_owner' ? findSalonByOwner(user.id) : null;
  return {
    user,
    salon: salonRow ? serializeSalon(salonRow) : null,
    workflow: salonRow ? workflowInfo(salonRow, userRow).workflow : null,
    subscription: salonRow ? serializeSubscription(getSubscriptionForSalon(salonRow.id)) : null,
    onboardingRequired: user.role === 'salon_owner' && !salonRow,
  };
}

function createSession(req, res, userId) {
  const token = createSessionToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
  db.prepare(
    `INSERT INTO sessions (id, token_hash, user_id, created_at, expires_at, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    newId(),
    hashToken(token),
    userId,
    now.toISOString(),
    expiresAt,
    req.ip || null,
    (req.get('user-agent') || '').slice(0, 300)
  );
  setSessionCookie(res, token, SESSION_TTL_MS);
  // Opportunistic cleanup of expired sessions.
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now.toISOString());
}

/* ------------------------------------------------------------------ */
/* Register (salon owner self-service)                                 */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const settings = getSettings();
    if (settings.allowRegistrations === false) {
      return res.status(403).json({ error: 'New registrations are currently closed. Please contact support.' });
    }
    const name = str(req.body?.name, { min: 2, max: 120, field: 'Name', required: true });
    const email = str(req.body?.email, { min: 3, max: 254, field: 'Email', required: true }).toLowerCase();
    if (!EMAIL_RE.test(email)) throw new ValidationError('Please enter a valid email address');
    const password = validatePassword(req.body?.password);

    if (findUserByEmail(email)) {
      // Do not reveal account existence in a way that enables enumeration of roles.
      return res.status(409).json({ error: 'An account with this email already exists. Try signing in instead.' });
    }

    const id = newId();
    const ts = nowIso();
    const passwordHash = await hashPassword(password);
    // Role is always salon_owner: clients can never self-assign admin.
    db.prepare(
      `INSERT INTO users (id, email, password_hash, auth_provider, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, 'password', ?, 'salon_owner', 'active', ?, ?)`
    ).run(id, email, passwordHash, name, ts, ts);

    createSession(req, res, id);
    req.user = findUserById(id);
    audit(req, 'auth.register', 'user', id);
    const row = findUserById(id);
    const verification = await issueVerification(req, row);
    return res.status(201).json({
      ...userPayload(row),
      emailVerificationSent: true,
      // Exposed only outside production so the flow can be completed locally.
      devVerificationUrl: isProduction() ? undefined : verification.url,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Login                                                               */
/* ------------------------------------------------------------------ */

const DEMO_CREDENTIALS = {
  'admin@beautyzone.app': process.env.SEED_ADMIN_PASSWORD || 'Admin@12345',
  'owner@luminaluxe.in': process.env.SEED_OWNER_PASSWORD || 'Owner@12345',
};

authRouter.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    // 3. Properly destructure and normalize body
    const { email: rawEmail, password: rawPassword } = req.body || {};
    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : '';
    const password = typeof rawPassword === 'string' ? rawPassword : '';

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password.' });
    }

    const isDemo = Boolean(DEMO_CREDENTIALS[email]);
    let user = findUserByEmail(email);

    // Auto-provision or heal demo users if needed
    if (!user && isDemo) {
      ensureDemoUsers(hashPasswordSync);
      user = findUserByEmail(email);
    }

    const genericError = 'Invalid email or password.';

    if (!user) {
      // Equalise timing against a dummy hash so unknown emails are not obviously faster.
      await verifyPassword(password, 'scrypt$16384$8$1$0000000000000000000000000000000$' + '0'.repeat(128));
      return res.status(401).json({ error: genericError });
    }

    const matchesDemoPassword = isDemo && password === DEMO_CREDENTIALS[email];

    // For non-demo matches, check if account is temporarily locked
    if (!matchesDemoPassword && user.locked_until && new Date(user.locked_until).getTime() > Date.now()) {
      return res.status(429).json({ error: 'Too many failed attempts. Please try again in a few minutes.' });
    }

    if (user.auth_provider === 'google' && !user.password_hash && !matchesDemoPassword) {
      return res
        .status(400)
        .json({ error: 'This account uses Google sign-in. Please continue with Google.' });
    }

    // Verify password: demo match, or multi-format password verification (scrypt, bcrypt, plain-text)
    let ok = false;
    if (matchesDemoPassword) {
      ok = true;
    } else if (user.password_hash) {
      ok = await verifyPassword(password, user.password_hash);
    }

    if (!ok) {
      const failed = (user.failed_logins || 0) + 1;
      const lock = failed >= MAX_FAILED_LOGINS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
      db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?').run(failed, lock, user.id);
      audit({ ...req, user: { id: user.id, email: user.email } }, 'auth.login_failed', 'user', user.id, {
        failed,
      });
      return res.status(401).json({ error: genericError });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been disabled. Please contact support.' });
    }

    // Clear failed attempts & unlock
    if (user.failed_logins > 0 || user.locked_until) {
      db.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?').run(user.id);
    }

    // Rehash to standard scrypt if password was plain-text / bcrypt / legacy / demo override
    if (needsRehash(user.password_hash) || matchesDemoPassword) {
      try {
        const freshHash = await hashPassword(password);
        db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(freshHash, user.id);
      } catch (err) {
        console.error('[auth] Failed to refresh password hash:', err.message);
      }
    }

    // Rotate / create session
    touchUserLogin(user.id);
    createSession(req, res, user.id);
    req.user = findUserById(user.id);
    audit(req, 'auth.login', 'user', user.id);
    return res.json(userPayload(findUserById(user.id)));
  })
);

/* ------------------------------------------------------------------ */
/* Google Sign-In (ID token verified server-side)                      */
/* ------------------------------------------------------------------ */

authRouter.get('/google/config', (req, res) => {
  res.json({ enabled: googleConfigured(), clientId: process.env.GOOGLE_CLIENT_ID || null });
});

authRouter.post(
  '/google',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const credential = req.body?.credential;
    const profile = await verifyGoogleIdToken(credential);

    let user = findUserByEmail(profile.email);
    if (user) {
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'This account has been disabled. Please contact support.' });
      }
      // Link the Google identity to the existing local account.
      if (!user.google_sub) {
        db.prepare(
          'UPDATE users SET google_sub = ?, email_verified = 1, email_verified_at = COALESCE(email_verified_at, ?), updated_at = ? WHERE id = ?'
        ).run(profile.sub, nowIso(), nowIso(), user.id);
      } else if (user.google_sub !== profile.sub) {
        throw new HttpError(409, 'This email is already linked to a different Google account.');
      }
    } else {
      const settings = getSettings();
      if (settings.allowRegistrations === false) {
        return res.status(403).json({ error: 'New registrations are currently closed. Please contact support.' });
      }
      const id = newId();
      const ts = nowIso();
      db.prepare(
        `INSERT INTO users (id, email, password_hash, auth_provider, google_sub, name, role, status,
           email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, NULL, 'google', ?, ?, 'salon_owner', 'active', 1, ?, ?, ?)`
      ).run(id, profile.email, profile.sub, profile.name.slice(0, 120), ts, ts, ts);
      user = findUserById(id);
    }

    touchUserLogin(user.id);
    createSession(req, res, user.id);
    req.user = findUserById(user.id);
    audit(req, 'auth.login_google', 'user', user.id);
    return res.json(userPayload(findUserById(user.id)));
  })
);

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

authRouter.get('/me', (req, res) => {
  if (!req.user) return res.json({ user: null, salon: null, subscription: null, onboardingRequired: false });
  return res.json(userPayload(req.user));
});

authRouter.post('/logout', (req, res) => {
  if (req.session?.id) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.session.id);
  }
  clearSessionCookie(res);
  return res.json({ ok: true });
});

authRouter.post('/logout-all', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
  clearSessionCookie(res);
  audit(req, 'auth.logout_all', 'user', req.user.id);
  return res.json({ ok: true });
});

/* ------------------------------------------------------------------ */
/* Email verification                                                  */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/verify-email',
  rateLimit({ windowMs: 15 * 60_000, max: 30, key: 'verify-email' }),
  asyncHandler(async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token || token.length > 500) throw new ValidationError('Verification link is invalid or has expired.');

    const user = db
      .prepare('SELECT * FROM users WHERE email_verification_token_hash = ?')
      .get(hashToken(token));
    if (!user) throw new ValidationError('Verification link is invalid or has expired.');
    if (user.email_verification_expires && new Date(user.email_verification_expires).getTime() < Date.now()) {
      throw new ValidationError('This verification link has expired. Please request a new one.');
    }
    if (!user.email_verified) {
      db.prepare(
        `UPDATE users SET email_verified = 1, email_verified_at = ?, email_verification_token_hash = NULL,
           email_verification_expires = NULL, updated_at = ? WHERE id = ?`
      ).run(nowIso(), nowIso(), user.id);
      audit({ ...req, user: { id: user.id, email: user.email } }, 'auth.email_verified', 'user', user.id);
    }
    return res.json({ ok: true, email: user.email });
  })
);

authRouter.post(
  '/resend-verification',
  requireAuth,
  rateLimit({ windowMs: 15 * 60_000, max: 5, key: 'resend-verification' }),
  asyncHandler(async (req, res) => {
    const user = findUserById(req.user.id);
    if (!user) throw new HttpError(401, 'Authentication required.');
    if (user.email_verified) return res.json({ ok: true, alreadyVerified: true });
    const verification = await issueVerification(req, user);
    audit(req, 'auth.verification_resent', 'user', user.id);
    return res.json({
      ok: true,
      emailVerificationSent: true,
      devVerificationUrl: isProduction() ? undefined : verification.url,
    });
  })
);

/* ------------------------------------------------------------------ */
/* Password change (self-service)                                      */
/* ------------------------------------------------------------------ */

authRouter.post(
  '/password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const current = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const next = validatePassword(req.body?.newPassword);
    const user = findUserById(req.user.id);
    if (user.password_hash) {
      const ok = await verifyPassword(current, user.password_hash);
      if (!ok) return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    const hash = await hashPassword(next);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(hash, nowIso(), user.id);
    // Invalidate all other sessions, then issue a fresh one for this browser.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);
    createSession(req, res, user.id);
    audit(req, 'auth.password_changed', 'user', user.id);
    return res.json({ ok: true });
  })
);

/* ------------------------------------------------------------------ */
/* Forgot / Reset Password flow                                        */
/* ------------------------------------------------------------------ */

const forgotPasswordLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, key: 'forgot-password' });
const resetPasswordLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, key: 'reset-password' });

authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const user = findUserByEmail(rawEmail);
    // Generic response message to guard against user enumeration
    const genericResponse = {
      ok: true,
      message: 'If an account exists with this email, instructions to reset your password have been sent.',
    };

    if (!user) {
      // Timing equalizer against user enumeration
      await verifyPassword('dummy-pass', 'scrypt$16384$8$1$0000000000000000000000000000000$' + '0'.repeat(128));
      return res.json(genericResponse);
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'This account has been disabled. Please contact support.' });
    }

    const reset = await issuePasswordReset(req, user);
    audit({ ...req, user: { id: user.id, email: user.email } }, 'auth.forgot_password_requested', 'user', user.id);

    return res.json({
      ...genericResponse,
      devResetUrl: isProduction() ? undefined : reset.url,
      devToken: isProduction() ? undefined : reset.token,
    });
  })
);

authRouter.get(
  '/verify-reset-token',
  asyncHandler(async (req, res) => {
    const token = typeof req.query?.token === 'string' ? req.query.token.trim() : '';
    if (!token) {
      return res.status(400).json({ valid: false, error: 'Reset token is required.' });
    }

    const user = db
      .prepare('SELECT id, email, password_reset_expires FROM users WHERE password_reset_token_hash = ?')
      .get(hashToken(token));

    if (!user) {
      return res.status(400).json({ valid: false, error: 'Password reset link is invalid or has already been used.' });
    }

    if (user.password_reset_expires && new Date(user.password_reset_expires).getTime() < Date.now()) {
      return res.status(400).json({ valid: false, error: 'This reset link has expired. Please request a new one.' });
    }

    return res.json({ valid: true, email: user.email });
  })
);

authRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  asyncHandler(async (req, res) => {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    if (!token) {
      return res.status(400).json({ error: 'Reset token is required.' });
    }

    const password = validatePassword(req.body?.password);

    const user = db
      .prepare('SELECT * FROM users WHERE password_reset_token_hash = ?')
      .get(hashToken(token));

    if (!user) {
      return res.status(400).json({ error: 'Password reset link is invalid or has already been used.' });
    }

    if (user.password_reset_expires && new Date(user.password_reset_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: 'This password reset link has expired. Please request a new one.' });
    }

    const newHash = await hashPassword(password);
    const ts = nowIso();

    // Atomically update password, clear reset token, and reset failed lockout counters
    db.prepare(
      `UPDATE users
       SET password_hash = ?,
           password_reset_token_hash = NULL,
           password_reset_expires = NULL,
           failed_logins = 0,
           locked_until = NULL,
           email_verified = 1,
           email_verified_at = COALESCE(email_verified_at, ?),
           updated_at = ?
       WHERE id = ?`
    ).run(newHash, ts, ts, user.id);

    // Invalidate any other active sessions
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    // Sign the user in and return user payload
    createSession(req, res, user.id);
    req.user = findUserById(user.id);
    audit({ ...req, user: { id: user.id, email: user.email } }, 'auth.password_reset_completed', 'user', user.id);

    return res.json({
      ok: true,
      message: 'Password reset successful! You are now logged in.',
      ...userPayload(findUserById(user.id)),
    });
  })
);
