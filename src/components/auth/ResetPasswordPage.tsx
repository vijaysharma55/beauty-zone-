import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Field, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import { api, errorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { AuthResponse } from '../../types/auth';

const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountEmail, setAccountEmail] = useState('');
  const [localToken, setLocalToken] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const tokenParam = params.get('token')?.trim() || '';
        if (tokenParam) {
          const verified = await api.get<{ valid: boolean; email?: string; error?: string }>(
            `/auth/verify-reset-token?token=${encodeURIComponent(tokenParam)}`
          );
          if (cancelled) return;
          if (verified?.valid) {
            setLocalToken(tokenParam);
            setSessionReady(true);
            setAccountEmail(verified.email || '');
          } else {
            setError(verified?.error || 'This reset link is invalid or expired. Request a new link and open it on this device.');
          }
          return;
        }

        const recovered = await supabase.auth.recoverSessionFromUrl();
        const session = recovered || await supabase.auth.getSession();
        if (cancelled) return;
        setSessionReady(Boolean(session));
        setAccountEmail(session?.user?.email || '');
        if (!session) {
          setError(params.get('error_description') || 'This reset link is invalid or expired. Request a new link and open it on this device.');
        }
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const metCount = [hasMinLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
  const strengthLabel = !password ? 'Not entered' : metCount <= 2 ? 'Weak' : metCount === 3 ? 'Fair' : metCount === 4 ? 'Good' : 'Strong';

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!sessionReady) {
      setError('Your reset link is not active. Request a fresh password reset email.');
      return;
    }
    if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
      setError('Password must include 8 characters, uppercase, lowercase, a number and a special symbol.');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      if (localToken) {
        const result = await api.post<AuthResponse & { ok?: boolean }>('/auth/reset-password', {
          token: localToken,
          password,
        });
        if (result?.user) {
          setSession(result);
        }
      } else {
        await supabase.auth.updateUser({ password });
      }
      setSuccess(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create a new password"
      subtitle={accountEmail ? 'Set a new password for ' + accountEmail : 'Choose a strong password for your BeautyZone account.'}
      footer={
        <div className="text-center text-xs text-slate-600">
          Remember your password? <Link to="/login" className="font-semibold text-[#8a641f] hover:underline">Back to sign in</Link>
        </div>
      }
    >
      {checking ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-600">Checking your secure reset link…</div>
      ) : success ? (
        <div className="space-y-5 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></div>
          <h3 className="font-serif text-xl font-bold text-slate-900">Password updated</h3>
          <p className="text-sm text-slate-600">Your password has been changed. Sign in using your new password.</p>
          <Button variant="gold" className="w-full" onClick={() => navigate('/login', { replace: true })}>Continue to sign in</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span>
            </div>
          )}
          {!sessionReady && !error && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <ShieldCheck className="mr-1 inline h-4 w-4" /> Open the secure password reset link from your email first.
            </div>
          )}
          <Field label="New password" htmlFor="new-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required value={password}
                onChange={(event) => { setPassword(event.target.value); setError(''); }} placeholder="Enter a strong password" className="pl-9 pr-10" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">Strength: {strengthLabel} · {metCount}/5 requirements met</p>
          </Field>
          <Field label="Confirm new password" htmlFor="confirm-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input id="confirm-password" type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" required value={confirmPassword}
                onChange={(event) => { setConfirmPassword(event.target.value); setError(''); }} placeholder="Re-enter your password" className="pl-9 pr-10" />
              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400">
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <Button type="submit" variant="gold" size="lg" loading={submitting} disabled={!sessionReady} className="w-full">Update password</Button>
        </form>
      )}
    </AuthLayout>
  );
};
