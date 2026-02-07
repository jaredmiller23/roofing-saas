/**
 * Fine-grained Permissions System (Server-side)
 *
 * Re-exports constants/types from permission-constants.ts and adds
 * server-only functions that require Supabase server client.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserRole } from './session'

// Re-export all constants and types so existing server-side imports still work
export {
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  PERMISSION_GROUPS,
  DEFAULT_USER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  OWNER_PERMISSIONS,
  NO_PERMISSIONS,
  getPermissionLabel,
} from './permission-constants'

export type {
  PermissionModule,
  PermissionAction,
  ModulePermissions,
  Permissions,
} from './permission-constants'

import {
  NO_PERMISSIONS,
  OWNER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
} from './permission-constants'

import type {
  PermissionModule,
  PermissionAction,
  Permissions,
} from './permission-constants'

/**
 * Get user's permissions from their role
 */
export async function getUserPermissions(userId: string): Promise<Permissions> {
  const supabase = await createClient()

  // First get user's tenant and role
  const { data: tenantUser, error: userError } = await supabase
    .from('tenant_users')
    .select('role, tenant_id')
    .eq('user_id', userId)
    .single()

  if (userError || !tenantUser) {
    return NO_PERMISSIONS
  }

  const role = tenantUser.role
  const tenantId = tenantUser.tenant_id

  // Owner and admin have predefined permissions
  if (role === 'owner') {
    return OWNER_PERMISSIONS
  }

  if (role === 'admin') {
    return ADMIN_PERMISSIONS
  }

  // Check for custom role assignment
  const { data: roleAssignment, error: assignmentError } = await supabase
    .from('user_role_assignments')
    .select('role_id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()

  if (!assignmentError && roleAssignment) {
    // Get role permissions from user_roles table
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('permissions')
      .eq('id', roleAssignment.role_id)
      .single()

    if (!roleError && roleData) {
      const rolePermissions = roleData.permissions as Partial<Permissions>
      return {
        ...NO_PERMISSIONS,
        ...rolePermissions,
      }
    }
  }

  // Fall back to looking up by role name for backwards compatibility
  const { data: roleByName, error: roleNameError } = await supabase
    .from('user_roles')
    .select('permissions')
    .eq('tenant_id', tenantId)
    .eq('name', role ?? '')
    .single()

  if (!roleNameError && roleByName) {
    const rolePermissions = roleByName.permissions as Partial<Permissions>
    return {
      ...NO_PERMISSIONS,
      ...rolePermissions,
    }
  }

  // If no custom role found, return default user permissions
  return {
    ...NO_PERMISSIONS,
    ...(DEFAULT_USER_PERMISSIONS as Permissions),
  }
}

/**
 * Check if user has permission for a specific action on a module
 */
export async function hasPermission(
  userId: string,
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions[module]?.[action] ?? false
}

/**
 * Check if current user has permission (server-side)
 * Returns false if no user is logged in
 */
export async function currentUserHasPermission(
  module: PermissionModule,
  action: PermissionAction
): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  return hasPermission(user.id, module, action)
}

/**
 * Require permission - throws if user doesn't have access
 * Use in API routes to protect endpoints
 */
export async function requirePermission(
  module: PermissionModule,
  action: PermissionAction
): Promise<void> {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  // Check role first - owner and admin bypass custom permission checks
  const role = await getUserRole(user.id)

  if (role === 'owner') {
    return // Owner has all permissions
  }

  if (role === 'admin' && module !== 'billing') {
    return // Admin has all permissions except billing
  }

  const hasAccess = await hasPermission(user.id, module, action)

  if (!hasAccess) {
    throw new Error(`Permission denied: Cannot ${action} ${module}`)
  }
}

/**
 * Get all permissions for current user (for client-side)
 */
export async function getCurrentUserPermissions(): Promise<Permissions | null> {
  const user = await getCurrentUser()
  if (!user) return null

  return getUserPermissions(user.id)
}

/**
 * Check multiple permissions at once
 */
export async function hasPermissions(
  userId: string,
  checks: Array<{ module: PermissionModule; action: PermissionAction }>
): Promise<boolean[]> {
  const permissions = await getUserPermissions(userId)
  return checks.map((check) => permissions[check.module]?.[check.action] ?? false)
}
