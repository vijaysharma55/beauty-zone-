import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Field, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { homeForUser } from './LoginPage';
import type { AuthResponse } from '../../types/auth';

const rules = [
  (v: string) => v.length >= 8,
  (v: string) => /[A-Z]/.test(v),
  (v: string) => /[a-z]/.test(v),
  (v: string) => /[0-9]/.test(v),
];

/** Password reset for Supabase Auth: the emailed link opens this page with a recovery session. */
export const SupabaseResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [ready, setReady] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) setReady(true);
    });
    // The recovery link may already have been exchanged before this effect ran.
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setReady((prev) => prev ?? Boolean(data.session));
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rules.every((r) => r(password))) {
      setError('Use at least 8 characters with an uppercase letter, a lowercase letter and a number.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await supabase!.auth.updateUser({ password });
      if (updateError) throw new Error(updateError.message);
      setDone(true);
      const data = await api.get<AuthResponse>('/auth/me');
      if (data.user) {
        setSession(data);
        setTimeout(() => navigate(homeForUser(data), { replace: true }), 1200);
      } else {
        setTimeout(() => navigate('/login', { replace: true }), 1200);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create new password"
      subtitle="Choose a strong new password for your account."
      footer={
        <Link to="/login" className="font-semibold text-[#8a641f] hover:underline">
          Back to sign in
        </Link>
      }
    >
      {done ? (
        <div className="space-y-3 py-4 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
          <h3 className="font-serif text-xl font-bold text-slate-900">Password updated!</h3>
          <p className="text-sm text-slate-600">Taking you to your workspace…</p>
        </div>
      ) : ready === false ? (
        <div className="space-y-3 text-sm text-slate-700">
          <p>This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="font-semibold text-[#8a641f] hover:underline">
            Request a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Field label="New password" htmlFor="new-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password" required>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={busy || ready !== true}>
            {busy ? 'Saving…' : ready === null ? 'Verifying link…' : 'Update password'}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
