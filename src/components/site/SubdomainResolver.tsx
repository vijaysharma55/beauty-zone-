import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { useTenant } from '../../hooks/useTenant';
import { PublicSalonPage } from './PublicSalonPage';
import { Button, Spinner } from '../ui';

/**
 * Subdomain entry point.
 * If the current hostname is a tenant subdomain (e.g. lumina-luxe.beautyzone.app),
 * this component resolves the tenant on the server, then either renders the
 * salon site inline or shows a graceful fallback.
 *
 * Usage in App.tsx: mount at "/" conditionally — if tenant mode is subdomain,
 * render SubdomainResolver instead of MarketingSite. Or mount as a catch-all
 * alongside path-based routing.
 */
export const SubdomainResolver: React.FC = () => {
  const tenant = useTenant();

  // Path mode → nothing to do; let normal routing handle it
  if (tenant.mode === 'path' && !tenant.loading) return null;

  if (tenant.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF5E5]">
        <Spinner className="h-8 w-8 text-[#D09A40]" />
        <p className="text-sm text-slate-600">Resolving your salon…</p>
      </div>
    );
  }

  if (tenant.mode === 'subdomain' && tenant.found && tenant.slug) {
    // Live tenant — render salon site directly under the subdomain
    return <PublicSalonPage forcedSlug={tenant.slug} />;
  }

  if (tenant.mode === 'subdomain' && !tenant.found) {
    const reason = tenant.reason;
    const title =
      reason === 'not_published'
        ? 'This salon website is not published yet'
        : reason === 'not_approved'
          ? 'This salon website is awaiting approval'
          : 'This salon website is not available';
    const hint =
      reason === 'not_found'
        ? 'The address you visited does not match any salon on BeautyZone. Check the link shared by the salon owner.'
        : reason === 'not_approved'
          ? 'The owner has submitted this website for review. It will be live once approved by the platform.'
          : 'This salon may have been unpublished or never activated. Try the platform directory below.';

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF5E5] px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">{hint}</p>
        {tenant.slug && (
          <p className="mt-2 text-xs text-slate-500">
            Address: <span className="font-mono font-semibold">{tenant.slug}.beautyzone.app</span>
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button variant="primary">Browse BeautyZone</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Salon owner sign in</Button>
          </Link>
        </div>
      </div>
    );
  }

  return null;
};

/**
 * Optional guard to put at the top of App's "/" route:
 * if we're on a subdomain that resolves to a live tenant, redirect
 * to the subdomain salon view instead of the marketing homepage.
 */
export const SubdomainAwareHome: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const tenant = useTenant();
  if (tenant.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF5E5]">
        <Spinner className="h-8 w-8 text-[#D09A40]" />
      </div>
    );
  }
  if (tenant.mode === 'subdomain' && tenant.found && tenant.slug) {
    return <PublicSalonPage forcedSlug={tenant.slug} />;
  }
  if (tenant.mode === 'subdomain' && !tenant.found) {
    // Show fallback instead of marketing site — don't pretend subdomain is the homepage
    const reason = tenant.reason;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF5E5] px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <SearchX className="h-7 w-7" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-slate-900">
          {reason === 'not_found' ? 'Salon not found' : 'This salon website is not available'}
        </h1>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          The address <span className="font-mono font-semibold">{tenant.slug}</span> does not match any published salon on BeautyZone.
          {reason === 'not_approved' ? ' It may be awaiting approval.' : ' Check the link shared by the salon owner.'}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link to="/">
            <Button variant="primary">Browse BeautyZone</Button>
          </Link>
          <Link to="/login">
            <Button variant="secondary">Salon owner sign in</Button>
          </Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};
