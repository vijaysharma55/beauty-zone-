import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import type { AuthResponse, AuthUser, MembershipPlan, Salon } from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  salon: Salon | null;
  subscription: MembershipPlan | null;
  loading: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  login: (email: string, password: string) => Promise<AuthResponse>;
  register: (name: string, email: string, password: string) => Promise<AuthResponse>;
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
  const [loading, setLoading] = useState(true);

  const apply = useCallback((data: AuthResponse | null) => {
    if (!data || !data.user) {
      setUser(null);
      setSalon(null);
      setSubscription(null);
      return;
    }
    setUser(data.user);
    setSalon(data.salon ?? null);
    setSubscription(data.subscription ?? null);
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
      const data = await api.post<AuthResponse>('/auth/login', { email, password });
      apply(data);
      return data;
    },
    [apply]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
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
      await api.post('/auth/logout');
    } finally {
      apply(null);
    }
  }, [apply]);

  const logoutAll = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
    } finally {
      apply(null);
    }
  }, [apply]);

  const setSession = useCallback((data: Partial<AuthResponse>) => {
    if (data.user !== undefined) setUser(data.user);
    if (data.salon !== undefined) setSalon(data.salon);
    if (data.subscription !== undefined) setSubscription(data.subscription);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      salon,
      subscription,
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
    [user, salon, subscription, loading, login, register, loginWithGoogle, logout, logoutAll, refresh, setSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
