import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Eye, EyeOff, Lock, Mail, ShieldCheck, X } from 'lucide-react';
import { Button, Field, Input, Spinner } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';
import { postLoginDestination } from '../../lib/authRoutes';
import type { AuthResponse } from '../../types/auth';

export const ADMIN_LOGIN_PATH = '/admin/login';

/**
 * Dedicated Super Admin sign-in portal.
 *
 * Deliberately separate from the salon owner `/login` page:
 *  - It posts to the admin-only bridge (`/auth/admin/supabase-session` and
 *    `/auth/admin/login`), which refuses a salon owner account.
 *  - It has no Google "sign up" affordance and no link to owner registration,
 *    because a super admin account is provisioned out of band (SUPER_ADMIN_EMAILS
 *    or Supabase private.bootstrap_super_admin), never self-registered.
 *  - On success it can only ever land on /admin; an owner deep link is dropped.
 */
export const AdminLoginPage: React.FC = () => {
  const { adminLogin, user, salon, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0F172A]">
        <Spinner className="h-8 w-8 text-[#D09A40]" />
        <p className="text-sm font-medium text-slate-300">Verifying administrator session…</p>
      </div>
    );
  }

  const destination = (data: AuthResponse) =>
    postLoginDestination(from || '/admin', data.user.role, Boolean(data.salon));

  // An already-authenticated administrator is sent straight to the console.
  if (user && (user.role === 'super_admin' || user.role === 'admin')) {
    return <Navigate to={destination({ user, salon, workflow: null, subscription: null, onboardingRequired: false } as AuthResponse)} replace />;
  }

  // A salon owner session on this page is a mismatch, not an error: offer to end
  // it rather than silently reusing it inside the admin console.
  const ownerSession = Boolean(user && user.role === 'salon_owner');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (ownerSession) await logout();
      const data = await adminLogin(email.trim(), password);
      if (data.user.role !== 'super_admin' && data.user.role !== 'admin') {
        setError('This account is not a platform administrator.');
        return;
      }
      navigate(destination(data), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] px-5 py-10 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col justify-center">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to BeautyZone
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/60 p-7 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#D09A40] to-[#B37E28]">
              <ShieldCheck className="h-5 w-5 text-[#0F172A]" />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-bold text-white">Super Admin Portal</h1>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#D09A40]">Restricted access</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-400">
            Platform administration only. Accounts are provisioned by the platform owner — there is no
            self-service signup here. Salon owners sign in at the{' '}
            <Link to="/login" className="font-semibold text-[#D09A40] hover:underline">
              owner portal
            </Link>
            .
          </p>

          {ownerSession && (
            <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              You are currently signed in as a salon owner ({user?.email}). Signing in here will end that
              session first.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            {error && (
              <div className="flex items-start justify-between gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="rounded p-0.5 text-red-300 hover:text-red-100"
                  aria-label="Dismiss error"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            <label htmlFor="admin-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Administrator email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="admin@yourplatform.com"
                className="border-slate-700 bg-slate-950/60 pl-9 text-white placeholder:text-slate-600"
              />
            </div>

            <label htmlFor="admin-password" className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="••••••••"
                className="border-slate-700 bg-slate-950/60 pl-9 pr-10 text-white placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <Button type="submit" variant="gold" size="lg" loading={submitting} className="w-full">
              <ShieldCheck className="h-4 w-4" /> Sign in to console
            </Button>
          </form>

          <div className="mt-6 space-y-2 border-t border-slate-800 pt-4 text-[11px] leading-relaxed text-slate-500">
            <p>
              Administrator sign-ins are audited. Only <strong className="text-slate-300">super admins</strong>{' '}
              can review salon submissions and publish salon websites.
            </p>
            <p>
              Forgot your password? Platform owners can reset it from{' '}
              <span className="text-slate-300">Admin → Users</span>, or via{' '}
              <code className="rounded bg-slate-800 px-1 py-0.5 text-slate-300">private.bootstrap_super_admin()</code>{' '}
              in Supabase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
