import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';

export interface TenantState {
  mode: 'subdomain' | 'path' | 'unknown';
  slug: string | null;
  salonId: string | null;
  salonName: string | null;
  found: boolean;
  reason?: string;
  loading: boolean;
  error: string | null;
}

// Reserved host labels that are NOT salon tenants
const RESERVED = new Set(['www', 'api', 'admin', 'app', 'dashboard', 'login', 'register']);

function extractSlugFromHost(hostname: string): string | null {
  try {
    const host = hostname.toLowerCase().trim();
    if (!host || host === 'localhost' || host === '127.0.0.1' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
    // e2b preview / vercel preview → never treat as tenant
    if (
      host.endsWith('.e2b.app') ||
      host.endsWith('.onrender.com') ||
      host.endsWith('.netlify.app') ||
      host.endsWith('.vercel.app') ||
      host.endsWith('.pages.dev') ||
      host.endsWith('.github.io')
    ) return null;
    const parts = host.split('.');
    if (parts.length < 3) return null;
    const candidate = parts[0];
    if (!candidate || candidate.length < 2) return null;
    if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(candidate)) return null;
    if (RESERVED.has(candidate)) return null;
    return candidate;
  } catch {
    return null;
  }
}

function isPlatformHost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname.toLowerCase();
  return h.endsWith('.vercel.app') || h.endsWith('.pages.dev') || h.endsWith('.github.io');
}

export function useTenant(): TenantState {
  const [serverTenant, setServerTenant] = useState<TenantState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Client-side hostname sniff (immediate, no network)
  const clientSlug = useMemo(() => {
    if (typeof window === 'undefined') return null;
    return extractSlugFromHost(window.location.hostname);
  }, []);

  // Verify tenant with server (source of truth; handles approval/publish state)
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ tenant: TenantState }>('/public/tenant')
      .then((res) => {
        if (!cancelled && res?.tenant) {
          setServerTenant({ ...res.tenant, loading: false, error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Tenant lookup failed');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (serverTenant && !(serverTenant.mode === 'subdomain' && isPlatformHost())) return serverTenant;

  // Server lookup fail ho to spinner par mat atko, normal path routing par jao
  if (clientSlug && !error) {
    return {
      mode: 'subdomain',
      slug: clientSlug,
      salonId: null,
      salonName: null,
      found: false, // unknown until server confirms
      loading: true,
      error,
    };
  }

  return {
    mode: 'path',
    slug: null,
    salonId: null,
    salonName: null,
    found: false,
    loading: false,
    error,
  };
}

/**
 * Utility: returns the canonical salon URL preferring subdomain form when configured.
 * Falls back to /salon/:slug path route.
 */
export function salonUrl(salonSlug: string, useSubdomain = false): string {
  if (!salonSlug) return '/';
  if (useSubdomain && typeof window !== 'undefined') {
    const host = window.location.host;
    // Derive root domain: last two labels
    const parts = host.split(':')[0].split('.');
    if (parts.length >= 2) {
      const root = parts.slice(-2).join('.');
      const protocol = window.location.protocol;
      return `${protocol}//${salonSlug}.${root}/`;
    }
  }
  return `/salon/${encodeURIComponent(salonSlug)}`;
}
