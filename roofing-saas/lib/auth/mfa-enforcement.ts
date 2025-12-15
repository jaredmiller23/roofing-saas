/**
 * MFA Enforcement Utilities
 *
 * Utilities for enforcing MFA requirements based on user roles and policies.
 * Admin and owner users are required to have MFA enabled.
 */

import { getCurrentUser, getUserRole } from './session'
import { getMFAStatus } from './mfa'

export interface MFAEnforcementResult {
  required: boolean
  enabled: boolean
  userRole: string | null
  shouldEnforce: boolean
  message?: string
}

/**
 * Check if MFA is required and enabled for the current user
 */
export async function checkMFARequirement(): Promise<MFAEnforcementResult> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      required: false,
      enabled: false,
      userRole: null,
      shouldEnforce: false,
      message: 'User not authenticated'
    }
  }

  const role = await getUserRole(user.id)
  const mfaStatus = await getMFAStatus()

  const isPrivilegedRole = role === 'admin' || role === 'owner'
  const shouldEnforce = isPrivilegedRole && !mfaStatus.enabled

  return {
    required: isPrivilegedRole,
    enabled: mfaStatus.enabled,
    userRole: role,
    shouldEnforce,
    message: shouldEnforce
      ? `${role} users are required to enable two-factor authentication for security.`
      : undefined
  }
}

/**
 * Require MFA for admin/owner users - throws if not enabled
 * Use in API routes and server actions that require elevated security
 */
export async function requireMFAForPrivilegedUsers(): Promise<void> {
  const enforcement = await checkMFARequirement()

  if (enforcement.shouldEnforce) {
    throw new Error(
      `MFA Required: ${enforcement.message} Please enable MFA in your security settings.`
    )
  }
}

/**
 * Check if user should be redirected to MFA setup
 * Returns redirect path if needed, null otherwise
 */
export async function getMFARedirectPath(): Promise<string | null> {
  const enforcement = await checkMFARequirement()

  if (enforcement.shouldEnforce) {
    return '/settings?tab=security&mfa=required'
  }

  return null
}

/**
 * Get MFA enforcement status for UI components
 */
export async function getMFAEnforcementStatus(): Promise<{
  isEnforced: boolean
  isCompliant: boolean
  role: string | null
  message?: string
}> {
  const enforcement = await checkMFARequirement()

  return {
    isEnforced: enforcement.required,
    isCompliant: !enforcement.shouldEnforce,
    role: enforcement.userRole,
    message: enforcement.message
  }
}

/**
 * List of routes that require MFA for privileged users
 */
export const MFA_REQUIRED_ROUTES = [
  // Settings and admin pages
  '/settings',
  '/admin',

  // User management
  '/users',
  '/team',

  // Security-sensitive operations
  '/billing',
  '/integrations',
  '/api/users',
  '/api/settings',
  '/api/admin',
  '/api/integrations'
]

/**
 * Check if a route requires MFA enforcement
 */
export function isRouteMFAProtected(pathname: string): boolean {
  return MFA_REQUIRED_ROUTES.some(route =>
    pathname.startsWith(route)
  )
}

/**
 * Middleware helper for MFA enforcement
 * Returns true if request should be blocked, false if allowed
 */
export async function shouldBlockRequest(pathname: string): Promise<{
  shouldBlock: boolean
  redirectPath?: string
  reason?: string
}> {
  // Only check MFA for protected routes
  if (!isRouteMFAProtected(pathname)) {
    return { shouldBlock: false }
  }

  const enforcement = await checkMFARequirement()

  if (enforcement.shouldEnforce) {
    return {
      shouldBlock: true,
      redirectPath: '/settings?tab=security&mfa=required',
      reason: enforcement.message
    }
  }

  return { shouldBlock: false }
}