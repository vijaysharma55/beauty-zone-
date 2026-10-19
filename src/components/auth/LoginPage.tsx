import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Button, Field, Input } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';
import type { AuthResponse } from '../../types/auth';

export function homeForUser(data: AuthResponse): string {
  if (data.user.role === 'super_admin') return '/admin';
  if (!data.salon) return '/dashboard/onboarding';
  return '/dashboard';
}

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      navigate(homeForUser(data), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setError('');
    setLoading(true);
    try {
      const data = await loginWithGoogle(credential);
      navigate(homeForUser(data), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage your salon website, services and team."
      footer={
        <span>
          New to BeautyZone?{' '}
          <Link to="/register" className="font-semibold text-[#8a641f] hover:underline">
            Create a salon owner account
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
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
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@salon.com"
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="Password" htmlFor="password" required>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        </Field>

        <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full">
          Sign in securely
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">or</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <GoogleSignInButton onCredential={handleGoogle} />

      <div className="mt-6 rounded-xl border border-slate-200 bg-white/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Demo accounts</p>
        <div className="mt-2 space-y-1 text-xs text-slate-600">
          <p>
            Salon owner: <span className="font-mono">owner@luminaluxe.in</span> /{' '}
            <span className="font-mono">Owner@12345</span>
          </p>
          <p>
            Super admin: <span className="font-mono">admin@beautyzone.app</span> /{' '}
            <span className="font-mono">Admin@12345</span>
          </p>
        </div>
        <p className="mt-2 text-[11px] text-slate-400">
          Seeded demo credentials — change them in production.
        </p>
      </div>
    </AuthLayout>
  );
};
