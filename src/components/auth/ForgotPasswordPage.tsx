import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Copy, ExternalLink, Mail, Sparkles, X } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Field, Input } from '../ui';
import { api, errorMessage } from '../../lib/api';
import { supabase } from '../../lib/supabase';

interface ForgotPasswordResponse {
  ok: boolean;
  message: string;
  devResetUrl?: string;
  devToken?: string;
}

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<ForgotPasswordResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    setError('');
    setLoading(true);
    try {
      if (supabase) {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (resetError) throw new Error(resetError.message);
        setSuccess({ ok: true, message: 'Reset email sent.' });
        return;
      }
      const res = await api.post<ForgotPasswordResponse>('/auth/forgot-password', {
        email: email.trim(),
      });
      setSuccess(res);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (success?.devResetUrl) {
      navigator.clipboard.writeText(success.devResetUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your salon account email and we'll send a secure password reset link."
      footer={
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <span>Remember your password?</span>
          <Link to="/login" className="font-semibold text-[#8a641f] hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Back to sign in
          </Link>
        </div>
      }
    >
      {success ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h3 className="font-serif text-lg font-semibold text-emerald-950">Check your inbox</h3>
                <p className="mt-1 text-sm text-emerald-800">
                  If an account exists for <strong className="font-mono text-emerald-950">{email}</strong>, we have sent instructions to reset your password. The link will remain valid for 1 hour.
                </p>
              </div>
            </div>
          </div>

          {/* Non-production immediate bypass link for convenience when no SMTP is configured */}
          {success.devResetUrl && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-xs text-amber-950">
              <p className="font-semibold uppercase tracking-wider text-amber-800 flex items-center justify-between">
                <span>Dev / Preview Sandbox Link</span>
                <span className="rounded bg-amber-200/80 px-1.5 py-0.5 text-[10px] text-amber-900 font-mono">No SMTP required</span>
              </p>
              <p className="mt-1.5 text-slate-700">
                In this preview environment, emails are saved locally. You can proceed with the reset immediately using this link:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={success.devResetUrl}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3.5 py-2 text-xs font-semibold text-[#FAF5E5] hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-[#D09A40]" /> Open reset page
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-500" /> {copied ? 'Copied!' : 'Copy link'}
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setSuccess(null);
                setEmail('');
              }}
              className="text-xs text-slate-500 hover:text-slate-800 underline text-center cursor-pointer"
            >
              Need to use a different email?
            </button>
            <Link to="/login" className="w-full">
              <Button variant="secondary" className="w-full">
                Return to sign in
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <div className="flex items-start justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError('')}
                className="rounded p-0.5 text-red-400 hover:text-red-700"
                aria-label="Dismiss error"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700">
                Account Email Address <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setEmail('owner@luminaluxe.in');
                  if (error) setError('');
                }}
                className="text-xs font-semibold text-[#8a641f] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="h-3 w-3 text-[#D09A40]" />
                Use demo account
              </button>
            </div>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="you@salon.com"
                className="pl-9"
                autoFocus
              />
            </div>
            <p className="text-xs text-slate-500">
              Enter the email associated with your salon owner or administrator account.
            </p>
          </div>

          <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full mt-2">
            Send password reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};
