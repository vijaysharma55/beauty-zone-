/**
 * Server-side access to the shared RBAC vocabulary.
 * Keeping one source of truth prevents the API and the browser from drifting
 * apart (e.g. the API rejecting a role the login page just redirected to).
 */
export {
  SUPER_ADMIN,
  ADMIN,
  SALON_OWNER,
  CUSTOMER,
  APPLICATION_ROLES,
  ADMIN_ROLES,
  OWNER_ROLES,
  STAFF_ROLES,
  CUSTOMER_ROLES,
  normalizeRole,
  isSuperAdminRole,
  isAdminRole,
  isOwnerRole,
  isCustomerRole,
  isStaffRole,
  canAccessAdminConsole,
  canAccessOwnerDashboard,
  canEditCatalog,
  roleHome,
  allowedRoutePrefixes,
} from '../src/lib/roles.js';
