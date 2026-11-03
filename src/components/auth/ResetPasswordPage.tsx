import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { Button, Field, Input } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { homeForUser } from './LoginPage';
import type { AuthResponse } from '../../types/auth';

const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;

interface RequirementItem {
  id: string;
  label: string;
  met: boolean;
}

export const ResetPasswordPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

  const urlToken = searchParams.get('token') || '';
  const [token, setToken] = useState(urlToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [verifying, setVerifying] = useState(Boolean(urlToken));
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [accountEmail, setAccountEmail] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [generatingToken, setGeneratingToken] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Validate token with backend when token is present
  useEffect(() => {
    const activeToken = token.trim();
    if (!activeToken) {
      setVerifying(false);
      setTokenValid(null);
      setTokenError('');
      return;
    }

    let cancelled = false;
    setVerifying(true);
    setTokenError('');

    api
      .get<{ valid: boolean; email?: string; error?: string }>(
        `/auth/verify-reset-token?token=${encodeURIComponent(activeToken)}`
      )
      .then((res) => {
        if (!cancelled) {
          setTokenValid(res.valid);
          if (res.email) setAccountEmail(res.email);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setTokenValid(false);
          setTokenError(errorMessage(err));
        }
      })
      .finally(() => {
        if (!cancelled) setVerifying(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  // Quick token issuer for preview sandbox testing
  const handleQuickDevToken = async (targetEmail = 'owner@luminaluxe.in') => {
    setGeneratingToken(true);
    setTokenError('');
    setError('');
    try {
      const res = await api.post<{ ok: boolean; devToken?: string }>('/auth/forgot-password', {
        email: targetEmail,
      });
      if (res.devToken) {
        setToken(res.devToken);
        setSearchParams({ token: res.devToken }, { replace: true });
        setAccountEmail(targetEmail);
        setTokenValid(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setGeneratingToken(false);
    }
  };

  // Real-time criteria evaluations
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = SPECIAL_CHAR_REGEX.test(password);

  const requirements: RequirementItem[] = [
    { id: 'min-length', label: 'At least 8 characters', met: hasMinLength },
    { id: 'upper', label: 'At least one uppercase letter (A-Z)', met: hasUpper },
    { id: 'lower', label: 'At least one lowercase letter (a-z)', met: hasLower },
    { id: 'number', label: 'At least one number (0-9)', met: hasNumber },
    { id: 'special', label: 'At least one special symbol (!@#$%^&*)', met: hasSpecial },
  ];

  const metCount = requirements.filter((r) => r.met).length;
  const allCriteriaMet = metCount === requirements.length;
  const isConfirmDirty = confirmPassword.length > 0;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const isFormValid = allCriteriaMet && passwordsMatch && Boolean(token.trim());

  // Password strength calculation
  const getStrengthData = () => {
    if (password.length === 0) {
      return { score: 0, label: 'Not entered', color: 'bg-slate-200', text: 'text-slate-400' };
    }
    if (metCount <= 2) {
      return { score: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-600' };
    }
    if (metCount === 3) {
      return { score: 2, label: 'Fair', color: 'bg-amber-500', text: 'text-amber-600' };
    }
    if (metCount === 4) {
      return { score: 3, label: 'Good', color: 'bg-sky-500', text: 'text-sky-600' };
    }
    return { score: 4, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-600' };
  };

  const strength = getStrengthData();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token.trim()) {
      setError('Please provide a valid password reset token or click "Auto-fill demo token" above.');
      return;
    }

    if (tokenValid === false) {
      setError('Your reset token is expired or invalid. Please generate a fresh token to continue.');
      return;
    }

    if (!hasMinLength) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (!hasUpper) {
      setError('Password must include at least one uppercase letter (A-Z).');
      return;
    }

    if (!hasLower) {
      setError('Password must include at least one lowercase letter (a-z).');
      return;
    }

    if (!hasNumber) {
      setError('Password must include at least one number (0-9).');
      return;
    }

    if (!hasSpecial) {
      setError('Password must include at least one special symbol (!@#$%^&*...).');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post<AuthResponse & { ok: boolean; message: string }>('/auth/reset-password', {
        token: token.trim(),
        password,
      });

      setSuccess(true);
      if (res.user) {
        setSession(res);
        setTimeout(() => {
          navigate(homeForUser(res), { replace: true });
        }, 1200);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create new password"
      subtitle={
        accountEmail
          ? `Set a strong new password for ${accountEmail}`
          : 'Enforce security with a strong password before accessing your account.'
      }
      footer={
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-600">
          <span>Remember your password?</span>
          <Link to="/login" className="font-semibold text-[#8a641f] hover:underline">
            Back to sign in
          </Link>
        </div>
      }
    >
      {success ? (
        <div className="space-y-4 py-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="font-serif text-xl font-bold text-slate-900">Password updated!</h3>
          <p className="text-sm text-slate-600">
            Your password has been changed successfully. Redirecting you to your workspace...
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {/* Active Error Notice */}
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

          {/* Invalid / Expired Token Banner with Instant Recovery */}
          {tokenError && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/90 p-4 text-sm text-amber-900">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1 space-y-1.5">
                  <p className="font-semibold text-amber-950">Reset link is invalid or expired</p>
                  <p className="text-xs text-amber-800">{tokenError}</p>
                  <div className="pt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickDevToken(accountEmail || 'owner@luminaluxe.in')}
                      disabled={generatingToken}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F172A] px-3 py-1.5 text-xs font-semibold text-[#FAF5E5] hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${generatingToken ? 'animate-spin text-[#D09A40]' : 'text-[#D09A40]'}`} />
                      {generatingToken ? 'Issuing fresh link...' : 'Issue fresh link for demo account'}
                    </button>
                    <Link
                      to="/forgot-password"
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/50 transition-colors"
                    >
                      Request by email <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTokenError('')}
                  aria-label="Dismiss alert"
                  className="rounded p-0.5 text-amber-500 hover:text-amber-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Verified Token Confirmation */}
          {tokenValid === true && !tokenError && (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-xs text-emerald-800">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  Valid token verified for <strong className="font-mono text-emerald-950">{accountEmail || 'your account'}</strong>
                </span>
              </div>
              <span className="rounded bg-emerald-200/70 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-900">
                Ready
              </span>
            </div>
          )}

          {/* Token input (rendered if token was not loaded from URL or if user wants to change token) */}
          {(!urlToken || tokenValid === false) && (
            <div className="rounded-xl border border-slate-200 bg-white/70 p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="reset-token" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Reset Token / Security Code <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => handleQuickDevToken('owner@luminaluxe.in')}
                  disabled={generatingToken}
                  className="text-xs font-semibold text-[#8a641f] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="h-3 w-3 text-[#D09A40]" />
                  {generatingToken ? 'Issuing...' : 'Auto-fill demo token'}
                </button>
              </div>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="reset-token"
                  type="text"
                  required
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    if (tokenError) setTokenError('');
                    if (error) setError('');
                  }}
                  placeholder="Paste reset token here"
                  className="pl-9 font-mono text-xs"
                />
              </div>
            </div>
          )}

          <Field label="New Password" htmlFor="new-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Enter new strong password"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          {/* Real-time Password Strength Meter Bar */}
          <div className="space-y-1.5 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">Password strength:</span>
              <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[1, 2, 3, 4].map((step) => {
                const filled = strength.score >= step;
                return (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      filled ? strength.color : 'bg-slate-200'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Real-time Password Requirements Checklist */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Security Requirements
              </p>
              <span className="text-[11px] font-medium text-slate-500">
                {metCount} of {requirements.length} met
              </span>
            </div>

            <ul className="space-y-1.5 text-xs">
              {requirements.map((req) => (
                <li
                  key={req.id}
                  className={`flex items-center gap-2 transition-colors duration-200 ${
                    req.met ? 'text-emerald-700 font-medium' : 'text-slate-500'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-all ${
                      req.met
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'border border-slate-300 bg-white text-transparent'
                    }`}
                  >
                    <Check className={`h-3 w-3 stroke-[3] ${req.met ? 'opacity-100' : 'opacity-0'}`} />
                  </span>
                  <span>{req.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Field label="Confirm New Password" htmlFor="confirm-password" required>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError('');
                }}
                placeholder="Re-type your new password"
                className="pl-9 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Real-time Confirm Password Feedback */}
            {isConfirmDirty && (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="font-medium text-emerald-700">Passwords match</span>
                  </>
                ) : (
                  <>
                    <X className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="font-medium text-red-600">Passwords do not match yet</span>
                  </>
                )}
              </div>
            )}
          </Field>

          <Button
            type="submit"
            variant="gold"
            size="lg"
            loading={submitting || verifying}
            disabled={!isFormValid || tokenValid === false}
            className="w-full mt-3 font-semibold shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            Update password & sign in
          </Button>

          {tokenValid === false && (
            <p className="text-center text-[11px] text-amber-700">
              Please click &quot;Issue fresh link for demo account&quot; or request a new reset link to proceed.
            </p>
          )}

          {!isFormValid && password.length > 0 && tokenValid !== false && (
            <p className="text-center text-[11px] text-slate-500">
              Complete all security requirements and ensure passwords match to continue.
            </p>
          )}
        </form>
      )}
    </AuthLayout>
  );
};
