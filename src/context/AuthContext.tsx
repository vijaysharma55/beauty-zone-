import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { supabase } from '../lib/supabase';
import { isAdminRole, isOwnerRole, isCustomerRole, normalizeRole } from '../lib/roles.js';
import type { AuthResponse, AuthUser, MembershipPlan, Role, Salon, SalonWorkflow } from '../types/auth';

export type RegisterResult = AuthResponse | { user: null; emailVerificationSent: true; pendingEmail: string };

/** Which front door a sign-in attempt is using. */
export type AuthPortal = 'owner' | 'admin';

interface AuthContextValue {
  user: AuthUser | null;
  salon: Salon | null;
  subscription: MembershipPlan | null;
  workflow: SalonWorkflow | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isStaff: boolean;
  role: Role | null;
  login: (email: string, password: string) => Promise<AuthResponse>;
  /** Super admin portal sign-in. Refuses salon owner accounts server-side. */
  adminLogin: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<AuthResponse | null>;
  setSession: (data: Partial<AuthResponse>) => void;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function isLocalDemoEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized === 'admin@beautyzone.app' ||
    normalized === 'owner@luminaluxe.in' ||
    /^owner(?:-[a-z0-9-]+|[0-9]+)?@jaipur\.salon$/.test(normalized)
  );
}

function isNonFallbackSupabaseError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err || '');
  const lower = raw.toLowerCase();
  const code = String((err as { code?: string })?.code || '').toLowerCase();
  return (
    lower.includes('email not confirmed') ||
    lower.includes('email not verified') ||
    lower.includes('too many requests') ||
    lower.includes('rate limit') ||
    code === 'email_not_confirmed' ||
    code === 'over_request_rate_limit'
  );
}

function portalWrongError(portal: AuthPortal): Error {
  return new Error(
    portal === 'admin'
      ? 'This account is a salon owner account. Please sign in at the salon owner portal.'
      : 'This account is a platform administrator. Please sign in at the super admin portal.'
  );
}

/** Turn raw GoTrue/network errors into copy an administrator can act on. */
function friendlyAuthError(err: unknown): Error {
  const raw = err instanceof Error ? err.message : String(err || 'Sign-in failed.');
  const lower = raw.toLowerCase();
  const code = String((err as { code?: string })?.code || '').toLowerCase();
  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid email or password') ||
    lower.includes('invalid administrator credentials') ||
    code === 'invalid_credentials'
  ) {
    return new Error('The email or password is incorrect. Please check your credentials and try again.');
  }
  if (lower.includes('email not confirmed') || lower.includes('email not verified') || code === 'email_not_confirmed') {
    return new Error('Please confirm your email address first. Check your inbox for the verification link, then sign in again.');
  }
  if (lower.includes('too many requests') || lower.includes('rate limit') || code === 'over_request_rate_limit') {
    return new Error('Too many sign-in attempts. Please wait a few minutes and try again.');
  }
  if (lower.includes('user already registered') || lower.includes('already exists') || code === 'user_already_exists') {
    return new Error('An account with this email already exists. Please sign in or reset your password.');
  }
  if (lower.includes('failed to fetch') || lower.includes('network') || lower.includes('timed out')) {
    return new Error('We could not reach the authentication service. Check your connection and try again.');
  }
  return err instanceof Error ? err : new Error(raw);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [subscription, setSubscription] = useState<MembershipPlan | null>(null);
  const [workflow, setWorkflow] = useState<SalonWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  // Dedupe is keyed by access token, so a stale session restore can never
  // satisfy a fresh sign-in (or vice versa). A single un-keyed in-flight
  // promise used to return the OLD user's role and redirect an admin to the
  // owner dashboard, or leave the app on a white screen after a race.
  const syncInFlight = useRef<Map<string, Promise<AuthResponse>>>(new Map());
  // Monotonic generation: only the most recently started sync may write state.
  // A late response from an older token/session can never overwrite a newer one.
  const latestSyncSeq = useRef(0);

  const apply = useCallback((data: AuthResponse | null) => {
    if (!data?.user) {
      setUser(null); setSalon(null); setSubscription(null); setWorkflow(null);
      return;
    }
    setUser(data.user);
    setSalon(data.salon ?? null);
    setSubscription(data.subscription ?? null);
    setWorkflow(data.workflow ?? null);
  }, []);

  /**
   * Exchanges a Supabase access token for an application session.
   *
   * `portal` selects the front door: the owner endpoint refuses administrator
   * profiles and the admin endpoint refuses salon owners, so a token can never
   * be replayed into the wrong workspace. `session` is the neutral restore path
   * used on reload (route guards still enforce the role).
   */
  const syncAccessToken = useCallback(async (
    rawToken: string,
    portal: AuthPortal | 'session' = 'session'
  ): Promise<AuthResponse> => {
    const accessToken = String(rawToken || '').trim();
    if (!accessToken) throw new Error('Sign-in did not create a valid session. Please try again.');
    const cacheKey = `${portal}:${accessToken}`;
    const pending = syncInFlight.current.get(cacheKey);
    if (pending) return pending;

    // 'session' is the neutral reload path: the neutral bridge accepts any
    // verified profile and the route guards still enforce the role.
    const endpoint =
      portal === 'session' ? '/auth/supabase-session' : `/auth/${portal}/supabase-session`;
    const sequence = ++latestSyncSeq.current;
    const task = api.post<AuthResponse>(endpoint, { accessToken })
      .then((data) => {
        if (!data?.user?.role) {
          throw new Error('Your account role could not be verified. Please contact support.');
        }
        if (sequence === latestSyncSeq.current) apply(data);
        return data;
      });
    syncInFlight.current.set(cacheKey, task);
    try {
      return await task;
    } finally {
      // Only the creator removes its own entry; otherwise a second caller's
      // early `finally` could let a duplicate request through.
      if (syncInFlight.current.get(cacheKey) === task) {
        syncInFlight.current.delete(cacheKey);
      }
    }
  }, [apply]);

  const refresh = useCallback(async () => {
    try {
      const session = await supabase.auth.getSession();
      if (session?.user?.phone && !session.user.email) {
        apply(null);
        return null;
      }
      if (session?.access_token) return await syncAccessToken(session.access_token);
      const data = await api.get<AuthResponse>('/auth/me');
      apply(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) apply(null);
      return null;
    }
  }, [apply, syncAccessToken]);

  useEffect(() => {
    let cancelled = false;
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Invalidate every in-flight sync first so a late 200 cannot resurrect
        // a signed-out session and cause a redirect loop / white screen.
        latestSyncSeq.current += 1;
        syncInFlight.current.clear();
        apply(null);
        setLoading(false);
        return;
      }
      if (session?.user?.phone && !session.user.email) {
        // Customer phone-OTP sessions belong to the rewards area, not the
        // salon-owner/admin session bridge.
        apply(null);
        return;
      }
      if (session?.access_token && [
        'SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED', 'PASSWORD_RECOVERY', 'USER_UPDATED',
      ].includes(event)) {
        void syncAccessToken(session.access_token).catch(async (err) => {
          console.error('[auth] Supabase session sync failed:', err);
          // A transient bridge failure should not silently log out a valid
          // admin. The HttpOnly cookie / verified bearer token can still carry
          // a valid application session, so try /auth/me before clearing.
          try {
            const fallback = await api.get<AuthResponse>('/auth/me');
            if (!cancelled) apply(fallback);
          } catch {
            if (!cancelled) apply(null);
          }
        });
      }
    });

    (async () => {
      try {
        const session = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user?.phone && !session.user.email) {
          apply(null);
        } else if (session?.access_token) {
          try {
            await syncAccessToken(session.access_token);
          } catch (err) {
            if (cancelled) return;
            console.error('[auth] Session restore failed:', err);
            try {
              const legacySession = await api.get<AuthResponse>('/auth/me');
              if (!cancelled) apply(legacySession);
            } catch {
              if (!cancelled) apply(null);
            }
          }
        } else {
          try {
            const legacySession = await api.get<AuthResponse>('/auth/me');
            if (!cancelled) apply(legacySession);
          } catch {
            if (!cancelled) apply(null);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[auth] Session restore failed:', err);
          apply(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, [apply, syncAccessToken]);

  /**
   * Email + password sign-in, scoped to exactly one portal.
   *
   * 1. Supabase Auth is the primary identity provider; the access token is
   *    exchanged at the portal-specific bridge endpoint, which refuses an
   *    account that belongs to the other portal.
   * 2. When Supabase is not configured/unreachable (local development), the
   *    legacy server-side password endpoint for the same portal is used. It
   *    applies the identical role isolation.
   */
  const signInToPortal = useCallback(async (portal: AuthPortal, email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const localEndpoint = portal === 'admin' ? '/auth/admin/login' : '/auth/login';

    const attemptLocalLogin = async (): Promise<AuthResponse> => {
      try {
        const data = await api.post<AuthResponse>(localEndpoint, { email: normalizedEmail, password });
        apply(data);
        return data;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'WRONG_PORTAL') {
          throw portalWrongError(portal);
        }
        throw err;
      }
    };

    // In local development / preview, try local password auth first for seeded
    // demo accounts so we don't fire a guaranteed 400 "Invalid login credentials"
    // call to Supabase before succeeding locally.
    if (!import.meta.env.PROD && isLocalDemoEmail(normalizedEmail)) {
      try {
        return await attemptLocalLogin();
      } catch (err) {
        if (err instanceof ApiError && err.status > 0 && err.status < 500) {
          throw friendlyAuthError(err);
        }
        // If local API is unreachable (status === 0) or 5xx, continue to Supabase.
      }
    }

    let supabaseError: unknown = null;
    let passwordVerifiedBySupabase = false;
    try {
      const result = await supabase.auth.signInWithPassword(normalizedEmail, password);
      if (!result.session?.access_token) {
        throw new Error('Sign-in did not create a valid session. Check your email confirmation and try again.');
      }
      passwordVerifiedBySupabase = true;
      return await syncAccessToken(result.session.access_token, portal);
    } catch (err) {
      // Once Supabase has verified the password, never mask bridge/profile
      // errors (wrong portal, disabled account, unverified email, etc.) by
      // falling back to local SQLite password auth.
      if (passwordVerifiedBySupabase) {
        if (err instanceof ApiError && (err.code === 'WRONG_PORTAL' || err.status === 403 || err.status === 409)) {
          await supabase.auth.signOut('local').catch(() => undefined);
        }
        if (err instanceof ApiError && err.code === 'WRONG_PORTAL') {
          throw portalWrongError(portal);
        }
        throw friendlyAuthError(err);
      }
      if (isNonFallbackSupabaseError(err)) {
        throw friendlyAuthError(err);
      }
      supabaseError = err;
    }

    // Local/offline fallback with the same portal isolation.
    try {
      return await attemptLocalLogin();
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) throw friendlyAuthError(supabaseError);
      if (err instanceof ApiError && err.status > 0 && err.status < 500) throw friendlyAuthError(err);
      throw friendlyAuthError(supabaseError || err);
    }
  }, [apply, syncAccessToken]);

  const login = useCallback(
    (email: string, password: string) => signInToPortal('owner', email, password),
    [signInToPortal]
  );

  /**
   * Super admin portal sign-in. Administrator accounts are refused by the owner
   * endpoint and vice versa, so this can never mint an owner session.
   */
  const adminLogin = useCallback(
    (email: string, password: string) => signInToPortal('admin', email, password),
    [signInToPortal]
  );

  const register = useCallback(async (name: string, email: string, password: string): Promise<RegisterResult> => {
    let result;
    try {
      result = await supabase.auth.signUp(email.trim().toLowerCase(), password, name.trim());
    } catch (err) {
      throw friendlyAuthError(err);
    }
    if (result.session?.access_token) return syncAccessToken(result.session.access_token, 'owner');
    apply(null);
    return { user: null, emailVerificationSent: true, pendingEmail: email.trim().toLowerCase() };
  }, [apply, syncAccessToken]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    let result;
    try {
      result = await supabase.auth.signInWithIdToken('google', credential);
    } catch (err) {
      throw friendlyAuthError(err);
    }
    if (!result.session?.access_token) throw new Error('Google sign-in did not create a valid session.');
    return syncAccessToken(result.session.access_token, 'owner');
  }, [syncAccessToken]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); }
    finally {
      latestSyncSeq.current += 1;
      syncInFlight.current.clear();
      await supabase.auth.signOut('local').catch(() => undefined);
      apply(null);
    }
  }, [apply]);

  const logoutAll = useCallback(async () => {
    try { await api.post('/auth/logout-all'); }
    finally {
      latestSyncSeq.current += 1;
      syncInFlight.current.clear();
      await supabase.auth.signOut('global').catch(() => undefined);
      apply(null);
    }
  }, [apply]);

  const setSession = useCallback((data: Partial<AuthResponse>) => {
    if (data.user !== undefined) setUser(data.user);
    if (data.salon !== undefined) setSalon(data.salon);
    if (data.subscription !== undefined) setSubscription(data.subscription);
    if (data.workflow !== undefined) setWorkflow(data.workflow ?? null);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, salon, subscription, workflow, loading,
    role: user ? normalizeRole(user.role) : null,
    isAdmin: isAdminRole(user?.role),
    isSuperAdmin: user?.role === 'super_admin',
    isOwner: isOwnerRole(user?.role),
    isCustomer: isCustomerRole(user?.role),
    isStaff: isAdminRole(user?.role) || isOwnerRole(user?.role),
    login, adminLogin, register, loginWithGoogle, logout, logoutAll, refresh, setSession,
  }), [user, salon, subscription, workflow, loading, login, adminLogin, register, loginWithGoogle, logout, logoutAll, refresh, setSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
