/**
 * Canonical RBAC vocabulary shared by the browser and the Express API.
 *
 * Plain, dependency-free JS so Node's test runner can assert the exact same
 * authorization rules the UI uses. Never trust a role string from a request
 * body or localStorage: normalize and compare against these constants only.
 *
 * @typedef {'super_admin' | 'admin' | 'salon_owner' | 'customer'} Role
 */

export const SUPER_ADMIN = 'super_admin';
export const ADMIN = 'admin';
export const SALON_OWNER = 'salon_owner';
export const CUSTOMER = 'customer';

/** Every role the platform recognizes. Order is used for UI selectors. */
export const APPLICATION_ROLES = Object.freeze([SUPER_ADMIN, ADMIN, SALON_OWNER, CUSTOMER]);

/** Roles allowed to open the /admin console. */
export const ADMIN_ROLES = Object.freeze([SUPER_ADMIN, ADMIN]);

/** Roles allowed to open the /dashboard owner workspace. */
export const OWNER_ROLES = Object.freeze([SALON_OWNER]);

/** Roles that may edit a salon catalogue. */
export const STAFF_ROLES = Object.freeze([SUPER_ADMIN, ADMIN, SALON_OWNER]);

/** Roles that only ever see customer-facing surfaces. */
export const CUSTOMER_ROLES = Object.freeze([CUSTOMER]);

const ALIASES = Object.freeze({
  owner: SALON_OWNER,
  salonowner: SALON_OWNER,
  salon: SALON_OWNER,
  administrator: ADMIN,
  staff: ADMIN,
  manager: ADMIN,
  user: CUSTOMER,
  client: CUSTOMER,
  guest: CUSTOMER,
  superadmin: SUPER_ADMIN,
  root: SUPER_ADMIN,
});

/**
 * Map legacy / third-party role spellings onto the canonical vocabulary.
 * Unknown values resolve to `customer` (least privilege), never to an admin.
 *
 * @param {unknown} value
 * @returns {Role}
 */
export function normalizeRole(value) {
  const raw = String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if ((/** @type {readonly string[]} */ (APPLICATION_ROLES)).includes(raw)) {
    return /** @type {Role} */ (raw);
  }
  const compact = raw.replace(/_/g, '');
  if (ALIASES[raw]) return ALIASES[raw];
  if (ALIASES[compact]) return ALIASES[compact];
  return CUSTOMER;
}

/** @param {unknown} role @returns {boolean} */
export function isSuperAdminRole(role) { return normalizeRole(role) === SUPER_ADMIN; }
/** @param {unknown} role @returns {boolean} */
export function isAdminRole(role) { return ADMIN_ROLES.includes(normalizeRole(role)); }
/** @param {unknown} role @returns {boolean} */
export function isOwnerRole(role) { return normalizeRole(role) === SALON_OWNER; }
/** @param {unknown} role @returns {boolean} */
export function isCustomerRole(role) { return normalizeRole(role) === CUSTOMER; }
/** @param {unknown} role @returns {boolean} */
export function isStaffRole(role) { return STAFF_ROLES.includes(normalizeRole(role)); }

/** @param {unknown} role @returns {boolean} */
export function canAccessAdminConsole(role) { return isAdminRole(role); }
/** @param {unknown} role @returns {boolean} */
export function canAccessOwnerDashboard(role) { return isAdminRole(role) || isOwnerRole(role); }
/** @param {unknown} role @returns {boolean} */
export function canEditCatalog(role) { return isStaffRole(role); }

/** @param {unknown} role @param {boolean} [hasSalon] @returns {string} */
export function roleHome(role, hasSalon = true) {
  const normalized = normalizeRole(role);
  if (isAdminRole(normalized)) return '/admin';
  if (normalized === SALON_OWNER) return hasSalon ? '/dashboard' : '/dashboard/onboarding';
  if (normalized === CUSTOMER) return '/my-appointments';
  return '/';
}

/**
 * Which routes may a role be redirected back to after login?
 * Used to stop a customer from inheriting an admin deep link.
 *
 * @param {unknown} role
 * @returns {string[]} path prefixes
 */
export function allowedRoutePrefixes(role) {
  const normalized = normalizeRole(role);
  if (isAdminRole(normalized)) return ['/admin', '/dashboard', '/my-appointments', '/salon', '/receipt'];
  if (normalized === SALON_OWNER) return ['/dashboard', '/my-appointments', '/salon', '/receipt'];
  return ['/my-appointments', '/salon', '/receipt'];
}
