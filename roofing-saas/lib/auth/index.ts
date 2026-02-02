/**
 * Authentication Library
 *
 * Main entry point for authentication utilities and functions.
 * Exports all auth-related functionality in a centralized location.
 */

// Session management
export {
  getCurrentUser,
  getSession,
  requireAuth,
  getUserTenantId,
  hasRole,
  isAdmin,
  getUserRole,
  getUserStatus,
  isUserActive,
  requireActiveUser,
  type UserStatus
} from './session'

// Permissions
export {
  getUserPermissions,
  hasPermission,
  currentUserHasPermission,
  requirePermission,
  getCurrentUserPermissions,
  hasPermissions,
  getPermissionLabel,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  PERMISSION_GROUPS,
  DEFAULT_USER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  OWNER_PERMISSIONS,
  NO_PERMISSIONS,
  type PermissionModule,
  type PermissionAction,
  type ModulePermissions,
  type Permissions
} from './permissions'

// Multi-Factor Authentication
export {
  getMFAStatus,
  enrollMFA,
  verifyMFAEnrollment,
  disableMFA,
  createMFAChallenge,
  verifyMFAChallenge,
  getAssuranceLevel,
  generateRecoveryCodes,
  type MFAEnrollmentResult,
  type MFAVerifyResult,
  type MFAFactor,
  type MFAStatus
} from './mfa'

// Session management (advanced)
export {
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions as revokeAllSessions,
  type UserSession
} from './sessions'

// Activity logging
export {
  logLoginAttempt as logActivity,
  getLoginHistory as getUserActivity,
  type LoginEventType as ActivityType,
  type LoginActivity as ActivityLog
} from './activity-log'

// API route wrappers
export {
  withAuth,
  withAuthParams,
  withOptionalAuth,
  type AuthContext
} from './with-auth'
