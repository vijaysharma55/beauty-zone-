import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { AuthResponse, AuthUser, MembershipPlan, Salon, SalonWorkflow } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  salon: Salon | null;
  subscription: MembershipPlan | null;
  workflow: SalonWorkflow | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  /** Resolves to null when Supabase requires the user to confirm their email first. */
  register: (name: string, email: string, password: string) => Promise<AuthResponse | null>;
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

  const apply = useCallback((data: AuthResponse | null) => {
    if (!data || !data.user) {
      setUser(null);
      setSalon(null);
      setSubscription(null);
      setWorkflow(null);
      return;
    }
    setUser(data.user);
    setSalon(data.salon ?? null);
    setSubscription(data.subscription ?? null);
    setWorkflow(data.workflow ?? null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<AuthResponse>('/auth/me');
      apply(data);
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) apply(null);
      return null;
    }
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<AuthResponse>('/auth/me');
        if (!cancelled) apply(data);
      } catch {
        // Unauthenticated visitors simply get the public site.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (supabase) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new ApiError(
            error.status ?? 400,
            /email not confirmed/i.test(error.message)
              ? 'Please confirm your email first — check your inbox for the confirmation link.'
              : /invalid login credentials/i.test(error.message)
                ? 'Incorrect email or password.'
                : error.message
          );
        }
        const data = await api.get<AuthResponse>('/auth/me');
        if (!data.user) throw new ApiError(401, 'Could not start your session. Please try again.');
        apply(data);
        return data;
      }
      const data = await api.post<AuthResponse>('/auth/login', { email, password });
      apply(data);
      return data;
    },
    [apply]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      if (supabase) {
        const { data: signUp, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: `${window.location.origin}/login` },
        });
        if (error) throw new ApiError(error.status ?? 400, error.message);
        // Supabase returns an obfuscated user with no identities for an already-registered email.
        if (signUp.user && signUp.user.identities?.length === 0) {
          throw new ApiError(409, 'An account with this email already exists. Please sign in instead.');
        }
        if (!signUp.session) return null; // email confirmation required
        const data = await api.get<AuthResponse>('/auth/me');
        apply(data);
        return data;
      }
      const data = await api.post<AuthResponse>('/auth/register', { name, email, password });
      apply(data);
      return data;
    },
    [apply]
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const data = await api.post<AuthResponse>('/auth/google', { credential });
      apply(data);
      return data;
    },
    [apply]
  );

  const logout = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut();
      await api.post('/auth/logout');
    } finally {
      apply(null);
    }
  }, [apply]);

  const logoutAll = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut({ scope: 'global' });
      await api.post('/auth/logout-all');
    } finally {
      apply(null);
    }
  }, [apply]);

  const setSession = useCallback((data: Partial<AuthResponse>) => {
    if (data.user !== undefined) setUser(data.user);
    if (data.salon !== undefined) setSalon(data.salon);
    if (data.subscription !== undefined) setSubscription(data.subscription);
    if (data.workflow !== undefined) setWorkflow(data.workflow ?? null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      salon,
      subscription,
      workflow,
      loading,
      isAdmin: user?.role === 'super_admin',
      isOwner: user?.role === 'salon_owner',
      login,
      register,
      loginWithGoogle,
      logout,
      logoutAll,
      refresh,
      setSession,
    }),
    [
      user,
      salon,
      subscription,
      workflow,
      loading,
      login,
      register,
      loginWithGoogle,
      logout,
      logoutAll,
      refresh,
      setSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
