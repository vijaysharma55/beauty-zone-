import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, MailCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, errorMessage } from '../../lib/api';
import { Alert, Button, Card, PageHeader, Spinner } from '../ui';
import { AuthLayout } from '../auth/AuthLayout';

/**
 * Landing page for the emailed verification link.
 * Tokens are single-use, hashed at rest and expire after 24 hours.
 */
export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, refresh } = useAuth();
  const token = params.get('token') || '';
  const [state, setState] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const verify = useCallback(
    async (value: string) => {
      setState('verifying');
      setMessage('');
      try {
        await api.post('/auth/verify-email', { token: value });
        setState('success');
        if (user) await refresh();
      } catch (err) {
        setState('error');
        setMessage(errorMessage(err));
      }
    },
    [refresh, user]
  );

  useEffect(() => {
    if (!token) {
      setState('error');
      setMessage('This verification link is missing its token. Please use the link from your email.');
      return;
    }
    verify(token);
    // Only run once per token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (loading && state === 'idle') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF5E5]">
        <Spinner className="h-8 w-8 text-[#D09A40]" />
      </div>
    );
  }

  return (
    <AuthLayout
      title={state === 'success' ? 'Email verified' : 'Verifying your email'}
      subtitle="Confirmation keeps salon websites trustworthy before they go live."
      footer={
        <Link to={user ? '/dashboard' : '/login'} className="font-semibold text-[#8a641f] hover:underline">
          {user ? 'Go to your dashboard' : 'Sign in'}
        </Link>
      }
    >
      <div className="space-y-4">
        {state === 'verifying' && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-5">
            <Spinner className="h-5 w-5 text-[#D09A40]" />
            <p className="text-sm text-slate-600">Checking your verification link…</p>
          </div>
        )}

        {state === 'success' && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Your email address is verified</p>
                <p className="mt-1 text-sm text-emerald-700">
                  You can now submit your salon website for review and publish it once approved.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" onClick={() => navigate(user ? '/dashboard/approval' : '/login')}>
                {user ? 'Continue to submissions' : 'Sign in to continue'}
              </Button>
            </div>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-5">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-800">We could not verify this link</p>
                <p className="mt-1 text-sm text-red-700">{message}</p>
              </div>
            </div>
            <Button variant="secondary" onClick={() => navigate(user ? '/dashboard/approval' : '/login')}>
              {user ? 'Request a new link' : 'Sign in'}
            </Button>
          </>
        )}

        <Card className="p-4">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <MailCheck className="h-3.5 w-3.5 text-[#D09A40]" />
            Verification links expire after 24 hours and can only be used once.
          </p>
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
