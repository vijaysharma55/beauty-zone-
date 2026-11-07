/**
 * Single source of truth for post-login routing.
 *
 * Both the login page and the route guards use these helpers, so a super admin
 * can never be bounced to /dashboard (and a customer can never inherit an
 * admin deep link) depending on which component renders first.
 *
 * Plain JS so Node's test runner can verify the redirect contract directly.
 *
 * @typedef {import('../types/auth').Role} Role
 * @typedef {import('../types/auth').AuthUser} AuthUser
 * @typedef {import('../types/auth').AuthResponse} AuthResponse
 */
import { normalizeRole, roleHome, isAdminRole, allowedRoutePrefixes } from './roles.js';

export const ADMIN_HOME = '/admin';
export const OWNER_HOME = '/dashboard';
export const ONBOARDING_HOME = '/dashboard/onboarding';
export const CUSTOMER_HOME = '/my-appointments';

/**
 * @param {Role | string | null | undefined} role
 * @param {boolean} [hasSalon]
 * @returns {string}
 */
export function homeForRole(role, hasSalon = true) {
  return roleHome(role, hasSalon);
}

/**
 * @param {Pick<AuthResponse, 'user' | 'salon'> | null | undefined} data
 * @returns {string}
 */
export function homeForUser(data) {
  if (!data?.user) return '/';
  return roleHome(data.user.role, Boolean(data.salon));
}

/**
 * @param {Pick<AuthUser, 'role'> | null | undefined} user
 * @param {boolean} [hasSalon]
 * @returns {string}
 */
export function homeForAuthUser(user, hasSalon = true) {
  return roleHome(user?.role, hasSalon);
}

/** Is this an internal, absolute client route we may safely redirect back to? */
function isSafeInternalPath(path) {
  return (
    typeof path === 'string' &&
    path.startsWith('/') &&
    !path.startsWith('//') &&
    !path.includes('\\') &&
    !path.includes('\n')
  );
}

/**
 * Honour the deep link that sent the user to /login (e.g. /admin/payments)
 * without ever letting a lower-privilege role inherit an admin destination or
 * allowing an open redirect. Falls back to that role's real home.
 *
 * @param {unknown} from
 * @param {Role | string | undefined} role
 * @param {boolean} [hasSalon]
 * @returns {string}
 */
export function postLoginDestination(from, role, hasSalon = true) {
  const normalized = normalizeRole(role);
  const home = roleHome(normalized, hasSalon);
  if (!isSafeInternalPath(from)) return home;
  if (
    from === '/login' || from === '/register' ||
    from.startsWith('/reset-password') || from.startsWith('/verify-email')
  ) return home;

  const path = /** @type {string} */ (from).split(/[?#]/)[0];
  const permitted = allowedRoutePrefixes(normalized).some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );
  if (!permitted) return home;

  // Only keep deep links inside the role's own workspace. Anything else goes
  // to the role home so an owner/admin cannot be stranded on a foreign screen.
  if (isAdminRole(normalized)) {
    return path === ADMIN_HOME || path.startsWith(`${ADMIN_HOME}/`) ? from : home;
  }
  if (normalized === 'salon_owner') {
    return path === OWNER_HOME || path.startsWith(`${OWNER_HOME}/`) ? from : home;
  }
  if (normalized === 'customer') {
    return path === CUSTOMER_HOME || path.startsWith('/salon/') || path.startsWith('/receipt/')
      ? from
      : home;
  }
  return home;
}
