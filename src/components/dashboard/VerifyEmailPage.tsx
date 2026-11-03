import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { supabase } from '../../lib/supabase';
import { Button, Card, PageHeader, Spinner } from '../ui';
import { AuthLayout } from '../auth/AuthLayout';

/** Supabase email-confirmation and legacy verification callback handler. */
export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();
  const legacyToken = params.get('token') || '';
  const [state, setState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const verify = useCallback(async () => {
    setState('verifying');
    setMessage('');
    try {
      if (legacyToken) {
        await api.post('/auth/verify-email', { token: legacyToken });
      } else {
        const recovered = await supabase.auth.recoverSessionFromUrl();
        const session = recovered || await supabase.auth.getSession();
        if (!session) {
          const queryError = params.get('error_description') || params.get('error');
          throw new Error(queryError || 'This confirmation link is invalid or expired. Request a fresh link and open it again.');
        }
      }
      await refresh();
      setState('success');
    } catch (err) {
      setState('error');
      setMessage(errorMessage(err));
    }
  }, [legacyToken, params, refresh]);

  useEffect(() => {
    if (loading) return;
    void verify();
  }, [loading, verify]);

  if (loading && state === 'idle') {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAF5E5]"><Spinner className="h-8 w-8 text-[#D09A40]" /></div>;
  }

  return (
    <AuthLayout
      title={state === 'success' ? 'Email verified' : state === 'error' ? 'Verification failed' : 'Confirming your email'}
      subtitle="Email confirmation keeps BeautyZone accounts secure."
      footer={<Link to={user ? '/dashboard' : '/login'} className="font-semibold text-[#8a641f] hover:underline">{user ? 'Go to your dashboard' : 'Sign in'}</Link>}
    >
      <div className="space-y-4">
        {state === 'verifying' && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <Spinner className="h-5 w-5 text-[#D09A40]" />
            <p className="text-sm text-slate-600">Checking your secure confirmation link…</p>
          </div>
        )}
        {state === 'success' && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Your email address is confirmed</p>
                <p className="mt-1 text-sm text-emerald-700">You can now sign in and continue setting up your salon.</p>
              </div>
            </div>
            <Button variant="gold" onClick={() => navigate(user ? '/dashboard/approval' : '/login')}>{user ? 'Continue to dashboard' : 'Sign in to continue'}</Button>
          </>
        )}
        {state === 'error' && (
          <>
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">We could not confirm this link</p>
                <p className="mt-1 text-sm text-red-700">{message}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => navigate('/login')}>Go to sign in</Button>
              <Button variant="gold" onClick={() => navigate('/forgot-password')}>Password help</Button>
            </div>
          </>
        )}
        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs text-slate-500"><MailCheck className="h-3.5 w-3.5 text-[#D09A40]" />Confirmation links are single-use and expire according to your Supabase Auth email settings.</p>
        </Card>
      </div>
    </AuthLayout>
  );
};

/** Banner shown across the owner dashboard until the email is verified. */
export const EmailVerificationBanner: React.FC = () => {
  const { user, refresh } = useAuth();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [devUrl, setDevUrl] = useState('');
  const [error, setError] = useState('');

  if (!user || user.emailVerified) return null;

  const resend = async () => {
    setSending(true);
    setError('');
    setNotice('');
    try {
      const res = await api.post<{ devVerificationUrl?: string }>('/auth/resend-verification');
      setNotice('Verification email sent. Please check your inbox.');
      if (res.devVerificationUrl) setDevUrl(res.devVerificationUrl);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Verify your email to unlock submissions</p>
            <p className="mt-0.5 text-xs text-amber-800">
              We sent a confirmation link to <strong>{user.email}</strong>. You can build and save drafts now, but
              submitting for approval requires a verified email.
            </p>
            {notice && <p className="mt-1.5 text-xs font-medium text-emerald-700">{notice}</p>}
            {devUrl && (
              <a href={devUrl} className="mt-1 inline-block break-all text-xs font-semibold text-[#8a641f] underline">
                Local dev: open verification link
              </a>
            )}
            {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={resend} loading={sending}>
          Resend email
        </Button>
      </div>
    </div>
  );
};

export const UnverifiedPageNotice: React.FC = () => (
  <PageHeader eyebrow="Action needed" title="Verify your email" description="Check your inbox to continue." />
);
