import React, { useEffect, useRef, useState } from 'react';
import { api } from '../../lib/api';

declare global {
  interface Window {
    google?: any;
  }
}

const SCRIPT_ID = 'google-identity-services';

function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('no window'));
    if (window.google?.accounts?.id) return resolve();
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google script failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed to load'));
    document.head.appendChild(script);
  });
}

export const GoogleSignInButton: React.FC<{
  onCredential: (credential: string) => Promise<void>;
}> = ({ onCredential }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'unavailable' | 'error'>('checking');
  const [message, setMessage] = useState('');
  const callbackRef = useRef(onCredential);
  callbackRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const config = await api.get<{ enabled: boolean; clientId: string | null }>('/auth/google/config');
        if (cancelled) return;
        if (!config.enabled || !config.clientId) {
          setState('unavailable');
          setMessage('Google sign-in is not configured on this server.');
          return;
        }
        setClientId(config.clientId);
        await loadGoogleScript();
        if (cancelled) return;
        setState('ready');
      } catch {
        if (!cancelled) {
          setState('error');
          setMessage('Could not initialise Google sign-in. Please use email and password.');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== 'ready' || !clientId || !containerRef.current || !window.google?.accounts?.id) return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response: { credential?: string }) => {
        if (!response.credential) return;
        try {
          await callbackRef.current(response.credential);
        } catch {
          // The parent renders the API error message.
        }
      },
      ux_mode: 'popup',
      auto_select: false,
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 360,
      logo_alignment: 'left',
    });
  }, [state, clientId]);

  return (
    <div>
      {state === 'checking' && (
        <div className="h-[44px] w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
      )}
      {state === 'ready' && <div ref={containerRef} className="flex w-full justify-center [&>div]:w-full" />}
      {(state === 'unavailable' || state === 'error') && (
        <div className="space-y-1">
          <button
            type="button"
            disabled
            title={message}
            className="flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-400"
          >
            <GoogleGlyph />
            Continue with Google
          </button>
          <p className="text-center text-xs text-slate-400">{message}</p>
        </div>
      )}
    </div>
  );
};

const GoogleGlyph: React.FC = () => (
  <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.27-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);
