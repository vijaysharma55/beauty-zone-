import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail, X } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Button, Field, Input, Spinner } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';
import { homeForUser, postLoginDestination, homeForAuthUser } from '../../lib/authRoutes';
import type { AuthResponse } from '../../types/auth';

// Kept as a re-export so any existing import of the login redirect helper
// resolves to the shared, role-aware implementation.
export { homeForUser } from '../../lib/authRoutes';

/** Resolve where a successful sign-in must go, including a pre-login deep link. */
function destinationFor(data: AuthResponse, from: unknown): string {
  const fallback = homeForUser(data);
  return postLoginDestination(from || fallback, data.user.role, Boolean(data.salon));
}

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, user, salon, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: unknown } | null)?.from;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loadingSubmit, setLoadingSubmit] = useState(false);

  // Never redirect while the session is still being restored: doing so sent a
  // just-signed-in super admin to /dashboard using a stale anonymous state.
  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF5E5]">
        <Spinner className="h-8 w-8 text-[#D09A40]" />
        <p className="text-sm font-medium text-slate-600">Checking your session…</p>
      </div>
    );
  }

  if (user) {
    // An administrator session on the owner portal belongs in the console.
    if (user.role === 'super_admin' || user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    const target = postLoginDestination(from, user.role, Boolean(salon)) || homeForAuthUser(user, Boolean(salon));
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoadingSubmit(true);
    try {
      const data = await login(email.trim(), password);
      // Portal isolation: this page is the salon owner front door. An
      // administrator is sent to its own portal rather than into /dashboard.
      if (data.user.role === 'super_admin' || data.user.role === 'admin') {
        navigate('/admin/login', { replace: true });
        return;
      }
      // Wait for the trusted server role, then navigate with replace so the
      // browser Back button cannot return to a half-authenticated login page.
      navigate(destinationFor(data, from), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingSubmit(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setError('');
    setLoadingSubmit(true);
    try {
      const data = await loginWithGoogle(credential);
      navigate(destinationFor(data, from), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <AuthLayout
      title="Salon owner sign in"
      subtitle="Manage your salon website, services, team and bookings."
      footer={
        <span className="space-y-2 block">
          <span className="block">
            New to BeautyZone?{' '}
            <Link to="/register" className="font-semibold text-[#8a641f] hover:underline">
              Create a salon owner account
            </Link>
          </span>
          <span className="block text-xs text-slate-500">
            Platform administrator?{' '}
            <Link to="/admin/login" className="font-semibold text-slate-700 hover:underline">
              Super admin portal
            </Link>
          </span>
        </span>
      }
    >
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

        <Field label="Email address" htmlFor="email" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="email"
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
            />
          </div>
        </Field>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Password <span className="text-red-500">*</span>
            </label>
            <Link to="/forgot-password" className="text-xs font-semibold text-[#8a641f] hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              placeholder="••••••••"
              className="pl-9 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" variant="gold" size="lg" loading={loadingSubmit} className="w-full">
          Sign in securely
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton onCredential={handleGoogle} />
    </AuthLayout>
  );
};
