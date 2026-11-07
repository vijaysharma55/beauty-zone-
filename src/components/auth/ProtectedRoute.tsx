import React from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { homeForAuthUser } from '../../lib/authRoutes';
import { normalizeRole, canAccessOwnerDashboard, canReviewSalonWebsites } from '../../lib/roles.js';
import { noteRedirect, resetRedirectHistory } from '../../lib/redirectGuard.js';
import { Spinner } from '../ui';
import type { Role } from '../../types/auth';

export const FullPageLoader: React.FC<{ label?: string }> = ({ label = 'Loading your workspace…' }) => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#FAF5E5]">
    <Spinner className="h-8 w-8 text-[#D09A40]" />
    <p className="text-sm font-medium text-slate-600">{label}</p>
  </div>
);

/**
 * Shown instead of issuing another <Navigate> when the guards disagree.
 * A visible, recoverable screen is always better than an infinite loop or a
 * blank page for a user whose role changed while their tab was open.
 */
const AccessRestricted: React.FC<{ home: string; reason: string }> = ({ home, reason }) => {
  const { logout, loading } = useAuth();
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF5E5] px-6">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert className="mx-auto mb-4 h-9 w-9 text-[#B8862E]" />
        <h1 className="text-xl font-semibold text-slate-900">Access restricted</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{reason}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            to={home}
            className="rounded-lg bg-[#C8A24A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B8862E]"
          >
            Go to my workspace
          </Link>
          <button
            type="button"
            disabled={loading}
            onClick={() => { void logout(); }}
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

interface ProtectedRouteProps {
  /** One required role, or several. Backwards-compatible with `role="super_admin"`. */
  role?: Role | Role[];
  /** Alias for multiple allowed roles. */
  roles?: Role[];
  children: React.ReactNode;
}

/**
 * Client-side route protection.
 *
 * - Waits for AuthContext to finish restoring the session before deciding
 *   anything (previously a spurious /login flash on hard reload).
 * - Uses the server-verified role, never localStorage.
 * - Sends a role mismatch to that role's real home (/dashboard for owners,
 *   /admin for admins, /my-appointments for customers), never to a dead end.
 * - Protects the two workspaces from each other: only salon owners may open
 *   /dashboard, and only administrators may open /admin. Approval endpoints are
 *   additionally restricted to super admins on the server.
 * - Detects same-path / repeated redirects and renders a recovery screen
 *   instead of looping forever.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ role, roles, children }) => {
  const { user, salon, loading } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname + location.search;
  const requested = roles ?? (Array.isArray(role) ? role : role ? [role] : null);
  const allowedRoles = requested?.map(normalizeRole) ?? null;

  if (loading) return <FullPageLoader />;

  const home = homeForAuthUser(user, Boolean(salon));

  if (!user || user.status !== 'active') {
    // /login is never guarded, so a same-path redirect here is always a bug.
    const decision = noteRedirect(currentPath, '/login');
    if (decision.blocked) {
      return (
        <AccessRestricted
          home="/login"
          reason="We could not verify your session. Please sign in again to continue."
        />
      );
    }
    return <Navigate to="/login" state={{ from: currentPath }} replace />;
  }

  const hasExplicitRoles = Boolean(allowedRoles?.length);
  const normalizedRole = normalizeRole(user.role);
  const roleAllowed = hasExplicitRoles
    ? allowedRoles!.includes(normalizedRole)
    : currentPath.startsWith('/admin')
      ? canReviewSalonWebsites(normalizedRole) || normalizedRole === 'admin'
      : currentPath.startsWith('/dashboard')
        ? canAccessOwnerDashboard(normalizedRole) && normalizedRole === 'salon_owner'
        : true;

  if (!roleAllowed) {
    const decision = noteRedirect(currentPath, home);
    if (decision.blocked || currentPath === home) {
      return (
        <AccessRestricted
          home={home}
          reason={`Your account is set up as ${user.role.replace(/_/g, ' ')}. This page is only available to the workspace role that manages it.`}
        />
      );
    }
    // Non-admin users land on a usable dashboard instead of being locked out.
    return <Navigate to={home} replace />;
  }

  resetRedirectHistory();
  return <>{children}</>;
};
