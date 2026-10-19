import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, Check, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { GoogleSignInButton } from './GoogleSignInButton';
import { Button, Field, Input } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { errorMessage } from '../../lib/api';

const rules = [
  { label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { label: 'Contains a letter', test: (v: string) => /[A-Za-z]/.test(v) },
  { label: 'Contains a number', test: (v: string) => /[0-9]/.test(v) },
];

export const RegisterPage: React.FC = () => {
  const { register, loginWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={user.role === 'super_admin' ? '/admin' : '/dashboard'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rules.every((r) => r.test(password))) {
      setError('Please choose a stronger password that meets all requirements below.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const data = await register(name.trim(), email.trim(), password);
      navigate(data.salon ? '/dashboard' : '/dashboard/onboarding', { replace: true });
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
      navigate(data.salon ? '/dashboard' : '/dashboard/onboarding', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your owner account"
      subtitle="Start your free trial and publish your salon's unique website."
      footer={
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-[#8a641f] hover:underline">
            Sign in
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

        <Field label="Your name" htmlFor="name" required>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aanya Sharma"
              className="pl-9"
            />
          </div>
        </Field>

        <Field label="Work email" htmlFor="email" required>
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
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
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
          <ul className="mt-2 space-y-1">
            {rules.map((rule) => {
              const passed = rule.test(password);
              return (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs ${passed ? 'text-emerald-600' : 'text-slate-400'}`}
                >
                  <Check className={`h-3.5 w-3.5 ${passed ? 'opacity-100' : 'opacity-40'}`} />
                  {rule.label}
                </li>
              );
            })}
          </ul>
        </Field>

        <Field label="Confirm password" htmlFor="confirm" required>
          <Input
            id="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
          />
        </Field>

        <Button type="submit" variant="gold" size="lg" loading={loading} className="w-full">
          Create account & continue
        </Button>

        <p className="text-center text-xs leading-relaxed text-slate-500">
          You are registering as a <strong>salon owner</strong>. Platform administrator accounts are
          provisioned separately by BeautyZone.
        </p>
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
