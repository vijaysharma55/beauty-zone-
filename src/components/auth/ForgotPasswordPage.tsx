import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail, X } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Input } from '../ui';
import { supabase } from '../../lib/supabase';
import { api, ApiError, errorMessage } from '../../lib/api';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setDevResetUrl(null);
    setLoading(true);
    try {
      const [localResult, supabaseResult] = await Promise.allSettled([
        api.post<{ ok: boolean; message?: string; devResetUrl?: string }>('/auth/forgot-password', {
          email: normalizedEmail,
        }),
        supabase.auth.resetPasswordForEmail(normalizedEmail),
      ]);

      if (localResult.status === 'rejected') {
        const reason = localResult.reason;
        if (reason instanceof ApiError && (reason.status === 400 || reason.status === 403 || reason.status === 429)) {
          setError(reason.message);
          return;
        }
      }

      if (localResult.status === 'fulfilled' && localResult.value?.devResetUrl) {
        try {
          const parsed = new URL(localResult.value.devResetUrl, window.location.origin);
          setDevResetUrl(`${parsed.pathname}${parsed.search}`);
        } catch {
          setDevResetUrl(localResult.value.devResetUrl);
        }
      }

      if (localResult.status === 'fulfilled' || supabaseResult.status === 'fulfilled') {
        // Keep the same response for known and unknown addresses.
        setSent(true);
      } else {
        setError(errorMessage(supabaseResult.reason || localResult.reason));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your account email. We will send a secure password reset link."
      footer={
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <span>Remember your password?</span>
          <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-[#8a641f] hover:underline">
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
        </div>
      }
    >
      {sent ? (
        <div role="status" className="space-y-5">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h3 className="font-serif text-lg font-semibold text-emerald-950">Check your inbox</h3>
                <p className="mt-1 text-sm text-emerald-800">
                  If an account exists for <strong>{email.trim()}</strong>, a password reset link has been sent. Open it on this device to continue.
                </p>
                {devResetUrl && (
                  <p className="mt-2 text-xs text-emerald-900">
                    Local reset link ready:{' '}
                    <Link to={devResetUrl} className="font-semibold underline hover:text-emerald-700">
                      Reset password now
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => { setSent(false); setEmail(''); setDevResetUrl(null); }} className="w-full text-center text-xs text-slate-500 underline">
            Use a different email
          </button>
          <Link to="/login" className="block">
            <Button variant="secondary" className="w-full">Return to sign in</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div role="alert" className="flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{error}</span></div>
              <button type="button" onClick={() => setError('')} aria-label="Dismiss error"><X className="h-4 w-4" /></button>
            </div>
          )}
          <div className="space-y-1.5">
            <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">Account email address <span className="text-red-500">*</span></label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError(''); }}
                placeholder="you@salon.com"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-slate-500">The same email address you use to sign in to BeautyZone.</p>
          </div>
          <Button type="submit" variant="gold" size="lg" loading={loading} className="mt-2 w-full">
            Send password reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
