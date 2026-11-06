import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react';
import { supabase, type SupabaseSession } from '../../lib/supabase';
import { Alert, Button, Card, Spinner } from '../ui';
import { AppointmentHistory } from './AppointmentHistory';

const tenDigits = (value: string) => value.replace(/\D/g, '').slice(-10);

/** "+91 ******3210" — enough to recognise the account without exposing the number. */
const maskIdentity = (session: SupabaseSession): string => {
  const phone = session.user.phone;
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    const countryCode = digits.slice(0, -10);
    return `${countryCode ? `+${countryCode} ` : ''}******${digits.slice(-4)}`;
  }
  return session.user.email || 'your account';
};

/** Phone-OTP sign-in, using the same Supabase calls as the rewards area. */
const OtpSignIn: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = tenDigits(phone);
    if (digits.length !== 10) {
      setError('Enter your 10-digit mobile number.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await supabase.auth.signInWithOtp('+91' + digits);
      setOtpRequested(true);
      setNotice('OTP sent. Check your SMS and enter the 6-digit code.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    const digits = tenDigits(phone);
    if (digits.length !== 10 || otp.length !== 6) {
      setError('Enter your 10-digit mobile number and the 6-digit OTP.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // On success the auth listener in CustomerPanel swaps this form for the history.
      await supabase.auth.verifyPhoneOtp('+91' + digits, otp);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed. Please check the code.');
      setBusy(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-[#D09A40]/10 p-2.5 text-[#8a641f]">
          <ShieldCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 className="font-serif text-xl font-bold text-[#0F172A]">Sign in to see your appointments</h2>
          <p className="mt-1 text-sm text-slate-500">We verify your mobile number with a one-time code.</p>
        </div>
      </div>

      <form onSubmit={otpRequested ? verifyOtp : requestOtp} className="mt-6 space-y-4" noValidate>
        <label className="block text-sm font-medium text-slate-800">
          Mobile number
          <div className="mt-1.5 flex">
            <span className="inline-flex items-center rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 px-3 text-sm text-slate-500">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              disabled={otpRequested}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="10-digit number"
              className="w-full rounded-r-lg border border-slate-300 px-3 py-2.5 text-sm focus:border-[#D09A40] focus:outline-none disabled:bg-slate-50"
              required
            />
          </div>
        </label>

        {otpRequested && (
          <label className="block text-sm font-medium text-slate-800">
            6-digit OTP
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="Enter OTP"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-center text-lg tracking-[0.35em] focus:border-[#D09A40] focus:outline-none"
              required
            />
          </label>
        )}

        {notice && !error && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        <Button type="submit" variant="gold" size="lg" loading={busy} className="w-full">
          {otpRequested ? 'Verify and continue' : 'Send OTP'}
        </Button>

        {otpRequested && (
          <button
            type="button"
            onClick={() => {
              setOtpRequested(false);
              setOtp('');
              setNotice('');
              setError(null);
            }}
            className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            Use a different number
          </button>
        )}
      </form>
    </Card>
  );
};

/**
 * Signed-in customer area. Today it holds Appointment History; further
 * customer sections can be added below it.
 */
export const CustomerPanel: React.FC = () => {
  // undefined = still restoring the session, null = signed out.
  const [session, setSession] = useState<SupabaseSession | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    supabase.auth
      .getSession()
      .then((current) => {
        if (!cancelled) setSession(current);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  // A private page: keep it out of search results.
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    const previousTitle = document.title;
    document.title = 'My appointments · BeautyZone';
    return () => {
      meta.remove();
      document.title = previousTitle;
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut('local');
    } catch {
      // supabase.auth.signOut clears the local session even if the network call fails,
      // and the auth listener above has already moved the panel to the signed-out view.
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF5E5] text-[#0F172A]">
      <header className="border-b border-[#D09A40]/20 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to site
          </Link>
          {session ? (
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </Button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:py-10">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#0F172A]">My account</h1>
          {session ? <p className="mt-1 text-sm text-slate-500">Signed in as {maskIdentity(session)}</p> : null}
        </div>

        {session === undefined && (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500" role="status">
            <Spinner className="h-5 w-5" />
            Loading your account…
          </div>
        )}

        {session === null && <OtpSignIn />}

        {session ? <AppointmentHistory customerId={session.user.id} /> : null}
      </main>
    </div>
  );
};
