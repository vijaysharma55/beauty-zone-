/**
 * Browser-only Supabase Auth, PostgREST and Storage client.
 * The publishable key is safe in the browser; RLS remains the authorization boundary.
 */
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://botkjeikjzhnbxnowdkl.supabase.co').replace(/\/+$/, '');
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_f2nHVHcAdrlosQbZwAAxnQ_vnHQuuv0';

export interface SupabaseUser {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}
export interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  user: SupabaseUser;
}
interface AuthResult { user: SupabaseUser | null; session: SupabaseSession | null; }
const SESSION_KEY = 'beautyzone.supabase.session';
let cachedSession: SupabaseSession | null = null;
const listeners = new Set<(event: string, session: SupabaseSession | null) => void>();

function readStoredSession(): SupabaseSession | null {
  if (cachedSession) return cachedSession;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    cachedSession = JSON.parse(raw) as SupabaseSession;
    return cachedSession;
  } catch {
    try { window.localStorage.removeItem(SESSION_KEY); } catch { /* storage may be blocked */ }
    return null;
  }
}
function emit(event: string, session: SupabaseSession | null) {
  listeners.forEach((listener) => listener(event, session));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('beautyzone-auth-state', { detail: { event, session } }));
}
function persistSession(session: SupabaseSession | null, event = 'TOKEN_REFRESHED') {
  cachedSession = session;
  if (typeof window !== 'undefined') {
    try {
      if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      else window.localStorage.removeItem(SESSION_KEY);
    } catch { /* keep the session in memory for this tab */ }
  }
  emit(event, session);
}
function normalizedSession(raw: any): SupabaseSession | null {
  if (!raw || !raw.access_token || !raw.refresh_token || !raw.user || !raw.user.id) return null;
  const expiresIn = Number(raw.expires_in || 3600);
  return {
    access_token: raw.access_token,
    refresh_token: raw.refresh_token,
    token_type: raw.token_type || 'bearer',
    expires_in: expiresIn,
    expires_at: Number(raw.expires_at || Math.floor(Date.now() / 1000) + expiresIn),
    user: raw.user,
  };
}
async function parseResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let data: any = null;
  if (text) {
    try { data = JSON.parse(text); } catch { data = { message: text.slice(0, 300) }; }
  }
  if (!response.ok) {
    const error = new Error(data?.msg || data?.message || data?.error_description || data?.error || ('Supabase request failed (' + response.status + ')'));
    (error as Error & { status?: number; code?: string }).status = response.status;
    (error as Error & { status?: number; code?: string }).code = data?.code;
    throw error;
  }
  return data as T;
}
async function authRequest<T>(path: string, body?: unknown, method = 'POST', useSession = false): Promise<T> {
  const session = useSession ? readStoredSession() : null;
  const headers = new Headers({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + (session?.access_token || SUPABASE_KEY),
  });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(SUPABASE_URL + '/auth/v1' + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse<T>(response);
}
async function currentSession(): Promise<SupabaseSession | null> {
  const session = readStoredSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  try {
    const refreshed = await authRequest<any>('/token?grant_type=refresh_token', { refresh_token: session.refresh_token });
    const next = normalizedSession(refreshed);
    persistSession(next, 'TOKEN_REFRESHED');
    return next;
  } catch {
    persistSession(null, 'SIGNED_OUT');
    return null;
  }
}


// Loyalty/customer OTP has an isolated browser session. Verifying a customer phone
// must never overwrite an authenticated salon-owner or super-admin session.
const CUSTOMER_SESSION_KEY = 'beautyzone.customer.supabase.session';
let cachedCustomerSession: SupabaseSession | null = null;
function readCustomerSession(): SupabaseSession | null {
  if (cachedCustomerSession) return cachedCustomerSession;
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CUSTOMER_SESSION_KEY);
    cachedCustomerSession = raw ? JSON.parse(raw) as SupabaseSession : null;
    return cachedCustomerSession;
  } catch {
    try { window.localStorage.removeItem(CUSTOMER_SESSION_KEY); } catch { /* storage may be blocked */ }
    return null;
  }
}
function persistCustomerSession(session: SupabaseSession | null): void {
  cachedCustomerSession = session;
  if (typeof window === 'undefined') return;
  try {
    if (session) window.localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(CUSTOMER_SESSION_KEY);
  } catch { /* keep the session in memory for this tab */ }
}
async function customerAuthRequest<T>(path: string, body?: unknown, method = 'POST', useSession = false): Promise<T> {
  const session = useSession ? readCustomerSession() : null;
  const headers = new Headers({
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + (session?.access_token || SUPABASE_KEY),
  });
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  const response = await fetch(SUPABASE_URL + '/auth/v1' + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return parseResponse<T>(response);
}
async function currentCustomerSession(): Promise<SupabaseSession | null> {
  const session = readCustomerSession();
  if (!session) return null;
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  try {
    const refreshed = await customerAuthRequest<any>('/token?grant_type=refresh_token', {
      refresh_token: session.refresh_token,
    });
    const next = normalizedSession(refreshed);
    persistCustomerSession(next);
    return next;
  } catch {
    persistCustomerSession(null);
    return null;
  }
}
export const customerSupabase = {
  auth: {
    getSession: async (): Promise<SupabaseSession | null> => currentCustomerSession(),
    getAccessToken: async (): Promise<string | null> => (await currentCustomerSession())?.access_token || null,
    signInWithOtp: async (phone: string): Promise<void> => {
      await customerAuthRequest('/otp', { phone, create_user: true });
    },
    verifyPhoneOtp: async (phone: string, token: string): Promise<AuthResult> => {
      const result = await customerAuthRequest<any>('/verify', { type: 'sms', phone, token });
      const session = normalizedSession(result);
      if (!session?.access_token) throw new Error('Phone verification did not create a valid customer session.');
      persistCustomerSession(session);
      return { user: session.user, session };
    },
    signOut: async () => {
      // Local-only sign-out: this isolated customer session must not revoke the
      // user's separate owner/admin session (or sign out other devices).
      persistCustomerSession(null);
    },
  },
};

export const supabase = {
  url: SUPABASE_URL,
  publishableKey: SUPABASE_KEY,
  auth: {
    getSession: async (): Promise<SupabaseSession | null> => currentSession(),
    getAccessToken: async (): Promise<string | null> => (await currentSession())?.access_token || null,
    getUser: async (): Promise<SupabaseUser | null> => {
      const session = await currentSession();
      if (!session) return null;
      return authRequest<SupabaseUser>('/user', undefined, 'GET', true);
    },
    onAuthStateChange: (callback: (event: string, session: SupabaseSession | null) => void) => {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    signUp: async (email: string, password: string, name: string): Promise<AuthResult> => {
      const redirect = encodeURIComponent(window.location.origin + '/verify-email');
      const result = await authRequest<any>('/signup?redirect_to=' + redirect, {
        email, password, data: { name, full_name: name },
      });
      const session = normalizedSession(result);
      if (session) persistSession(session, 'SIGNED_IN');
      return { user: result?.user || session?.user || null, session };
    },
    signInWithOtp: async (phone: string): Promise<void> => {
      await authRequest('/otp', { phone, create_user: true });
    },
    verifyPhoneOtp: async (phone: string, token: string): Promise<AuthResult> => {
      const result = await authRequest<any>('/verify', { type: 'sms', phone, token });
      const session = normalizedSession(result);
      if (!session?.access_token) throw new Error('Phone OTP did not create a valid session. Check the code and try again.');
      persistSession(session, 'SIGNED_IN');
      return { user: session.user, session };
    },
    signInWithPassword: async (email: string, password: string): Promise<AuthResult> => {
      const result = await authRequest<any>('/token?grant_type=password', { email, password });
      const session = normalizedSession(result);
      if (!session) throw new Error('Supabase did not return an authenticated session.');
      persistSession(session, 'SIGNED_IN');
      return { user: session.user, session };
    },
    signInWithIdToken: async (provider: string, idToken: string): Promise<AuthResult> => {
      const result = await authRequest<any>('/token?grant_type=id_token', { provider, id_token: idToken });
      const session = normalizedSession(result);
      if (!session) throw new Error('Google sign-in did not create a valid session.');
      persistSession(session, 'SIGNED_IN');
      return { user: session.user, session };
    },
    signOut: async (scope: 'local' | 'global' = 'global') => {
      const session = await currentSession();
      try {
        if (session) await authRequest('/logout?scope=' + scope, undefined, 'POST', true);
      } finally {
        persistSession(null, 'SIGNED_OUT');
      }
    },
    resetPasswordForEmail: async (email: string) => {
      const redirect = encodeURIComponent(window.location.origin + '/reset-password');
      await authRequest('/recover?redirect_to=' + redirect, { email });
    },
    verifyOtp: async (tokenHash: string, type: 'signup' | 'recovery' | 'email') => {
      const result = await authRequest<any>('/verify', { token_hash: tokenHash, type });
      const session = normalizedSession(result);
      if (session) persistSession(session, type === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN');
      return { user: result?.user || session?.user || null, session };
    },
    updateUser: async (attributes: { password?: string; data?: Record<string, unknown> }) => {
      const result = await authRequest<any>('/user', attributes, 'PUT', true);
      const existing = await currentSession();
      if (existing && result?.id) persistSession({ ...existing, user: result }, 'USER_UPDATED');
      return result;
    },
    recoverSessionFromUrl: async (): Promise<SupabaseSession | null> => {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      if (accessToken && refreshToken) {
        const expiresIn = Number(hash.get('expires_in') || 3600);
        const user = await fetch(SUPABASE_URL + '/auth/v1/user', {
          headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + accessToken },
        }).then(parseResponse<SupabaseUser>);
        const session: SupabaseSession = {
          access_token: accessToken, refresh_token: refreshToken,
          token_type: hash.get('token_type') || 'bearer', expires_in: expiresIn,
          expires_at: Number(hash.get('expires_at') || Math.floor(Date.now() / 1000) + expiresIn), user,
        };
        persistSession(session, hash.get('type') === 'recovery' ? 'PASSWORD_RECOVERY' : 'SIGNED_IN');
        url.hash = '';
        window.history.replaceState({}, document.title, url.toString());
        return session;
      }
      const tokenHash = url.searchParams.get('token_hash');
      const type = url.searchParams.get('type');
      if (tokenHash && (type === 'signup' || type === 'recovery' || type === 'email')) {
        const result = await supabase.auth.verifyOtp(tokenHash, type);
        url.searchParams.delete('token_hash');
        url.searchParams.delete('type');
        window.history.replaceState({}, document.title, url.toString());
        return result.session;
      }
      return currentSession();
    },
  },
  db: {
    select: async <T>(table: string, query = ''): Promise<T[]> => {
      const session = await currentSession();
      const response = await fetch(SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : ''), {
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (session?.access_token || SUPABASE_KEY) },
      });
      return parseResponse<T[]>(response);
    },
    insert: async <T>(table: string, rows: unknown): Promise<T[]> => {
      const session = await currentSession();
      const response = await fetch(SUPABASE_URL + '/rest/v1/' + table, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (session?.access_token || SUPABASE_KEY), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(rows),
      });
      return parseResponse<T[]>(response);
    },
    update: async <T>(table: string, query: string, patch: unknown): Promise<T[]> => {
      const session = await currentSession();
      const response = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + query, {
        method: 'PATCH',
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (session?.access_token || SUPABASE_KEY), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify(patch),
      });
      return parseResponse<T[]>(response);
    },
    remove: async (table: string, query: string): Promise<void> => {
      const session = await currentSession();
      const response = await fetch(SUPABASE_URL + '/rest/v1/' + table + '?' + query, {
        method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + (session?.access_token || SUPABASE_KEY) },
      });
      await parseResponse(response);
    },
    upload: async (path: string, file: File): Promise<string> => {
      const session = await currentSession();
      if (!session) throw new Error('Please sign in before uploading files.');
      const response = await fetch(SUPABASE_URL + '/storage/v1/object/beautyzone-assets/' + path, {
        method: 'POST',
        headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + session.access_token, 'Content-Type': file.type, 'x-upsert': 'true' },
        body: file,
      });
      await parseResponse(response);
      return SUPABASE_URL + '/storage/v1/object/public/beautyzone-assets/' + path;
    },
  },
};
