import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { AuthResponse, AuthUser, MembershipPlan, Salon, SalonWorkflow } from '../types/auth';

export type RegisterResult = AuthResponse | { user: null; emailVerificationSent: true; pendingEmail: string };

interface AuthContextValue {
  user: AuthUser | null;
  salon: Salon | null;
  subscription: MembershipPlan | null;
  workflow: SalonWorkflow | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  loginWithGoogle: (credential: string) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refresh: () => Promise<AuthResponse | null>;
  setSession: (data: Partial<AuthResponse>) => void;
}
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [salon, setSalon] = useState<Salon | null>(null);
  const [subscription, setSubscription] = useState<MembershipPlan | null>(null);
  const [workflow, setWorkflow] = useState<SalonWorkflow | null>(null);
  const [loading, setLoading] = useState(true);
  const syncInFlight = useRef<Promise<AuthResponse> | null>(null);

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

  const syncAccessToken = useCallback(async (accessToken: string): Promise<AuthResponse> => {
    if (syncInFlight.current) return syncInFlight.current;
    const task = api.post<AuthResponse>('/auth/supabase-session', { accessToken }).then((data) => {
      apply(data);
      return data;
    });
    syncInFlight.current = task;
    try { return await task; }
    finally { if (syncInFlight.current === task) syncInFlight.current = null; }
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
        apply(null);
        return;
      }
      if (session?.user?.phone && !session.user.email) {
        // Customer phone-OTP sessions belong to the rewards area, not the
        // salon-owner/admin session bridge.
        apply(null);
        return;
      }
      if (session?.access_token && ['SIGNED_IN', 'TOKEN_REFRESHED', 'PASSWORD_RECOVERY', 'USER_UPDATED'].includes(event)) {
        void syncAccessToken(session.access_token).catch((err) => {
          console.error('[auth] Supabase session sync failed:', err);
          apply(null);
        });
      }
    });

    (async () => {
      try {
        const session = await supabase.auth.getSession();
        if (cancelled) return;
        if (session?.user?.phone && !session.user.email) {
          apply(null);
        } else if (session?.access_token) await syncAccessToken(session.access_token);
        else {
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

  const login = useCallback(async (email: string, password: string) => {
    const result = await supabase.auth.signInWithPassword(email.trim().toLowerCase(), password);
    if (!result.session?.access_token) throw new Error('Sign-in did not create a valid session.');
    return syncAccessToken(result.session.access_token);
  }, [syncAccessToken]);

  const register = useCallback(async (name: string, email: string, password: string): Promise<RegisterResult> => {
    const result = await supabase.auth.signUp(email.trim().toLowerCase(), password, name.trim());
    if (result.session?.access_token) return syncAccessToken(result.session.access_token);
    apply(null);
    return { user: null, emailVerificationSent: true, pendingEmail: email.trim().toLowerCase() };
  }, [apply, syncAccessToken]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const result = await supabase.auth.signInWithIdToken('google', credential);
    if (!result.session?.access_token) throw new Error('Google sign-in did not create a valid session.');
    return syncAccessToken(result.session.access_token);
  }, [syncAccessToken]);

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); }
    finally {
      await supabase.auth.signOut('local').catch(() => undefined);
      apply(null);
    }
  }, [apply]);

  const logoutAll = useCallback(async () => {
    try { await api.post('/auth/logout-all'); }
    finally {
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
    isAdmin: user?.role === 'super_admin',
    isOwner: user?.role === 'salon_owner',
    login, register, loginWithGoogle, logout, logoutAll, refresh, setSession,
  }), [user, salon, subscription, workflow, loading, login, register, loginWithGoogle, logout, logoutAll, refresh, setSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
