/**
 * Fine-grained Permissions System
 *
 * Provides utilities for checking user permissions across modules.
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserRole } from './session'

// All available permission modules
export const PERMISSION_MODULES = [
  'contacts',
  'projects',
  'tasks',
  'activities',
  'calendar',
  'calls',
  'messages',
  'files',
  'reports',
  'analytics',
  'settings',
  'users',
  'team',
  'billing',
  'territories',
  'campaigns',
  'signatures',
  'voice_assistant',
] as const

export type PermissionModule = (typeof PERMISSION_MODULES)[number]

// All available permission actions
export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

// Permission structure for each module
export type ModulePermissions = Record<PermissionAction, boolean>

// Full permissions object
export type Permissions = Record<PermissionModule, ModulePermissions>

// Default permissions for new users
export const DEFAULT_USER_PERMISSIONS: Partial<Permissions> = {
  contacts: { view: true, create: true, edit: true, delete: false },
  projects: { view: true, create: true, edit: true, delete: false },
  tasks: { view: true, create: true, edit: true, delete: false },
  activities: { view: true, create: true, edit: true, delete: false },
  calendar: { view: true, create: true, edit: true, delete: false },
  calls: { view: true, create: true, edit: false, delete: false },
  messages: { view: true, create: true, edit: false, delete: false },
  files: { view: true, create: true, edit: true, delete: false },
  reports: { view: true, create: false, edit: false, delete: false },
  analytics: { view: true, create: false, edit: false, delete: false },
  settings: { view: false, create: false, edit: false, delete: false },
  users: { view: false, create: false, edit: false, delete: false },
  team: { view: false, create: false, edit: false, delete: false },
  billing: { view: false, create: false, edit: false, delete: false },
  territories: { view: true, create: false, edit: false, delete: false },
  campaigns: { view: true, create: false, edit: false, delete: false },
  signatures: { view: true, create: true, edit: false, delete: false },
  voice_assistant: { view: true, create: true, edit: false, delete: false },
}

// Admin permissions (full access except billing)
export const ADMIN_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = {
      view: true,
      create: true,
      edit: true,
      delete: module !== 'billing', // Only owner can delete billing-related items
    }
    return acc
  },
  {} as Permissions
)

// Owner permissions (full access to everything)
export const OWNER_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = { view: true, create: true, edit: true, delete: true }
    return acc
  },
  {} as Permissions
)

// Empty/no permissions
export const NO_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = { view: false, create: false, edit: false, delete: false }
    return acc
  },
  {} as Permissions
)

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
    .eq('name', role)
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

/**
 * Get human-readable permission label
 */
export function getPermissionLabel(
  module: PermissionModule,
  action: PermissionAction
): string {
  const moduleLabels: Record<PermissionModule, string> = {
    contacts: 'Contacts',
    projects: 'Projects',
    tasks: 'Tasks',
    activities: 'Activities',
    calendar: 'Calendar',
    calls: 'Calls',
    messages: 'Messages',
    files: 'Files',
    reports: 'Reports',
    analytics: 'Analytics',
    settings: 'Settings',
    users: 'Users',
    team: 'Team',
    billing: 'Billing',
    territories: 'Territories',
    campaigns: 'Campaigns',
    signatures: 'Signatures',
    voice_assistant: 'Voice Assistant',
  }

  const actionLabels: Record<PermissionAction, string> = {
    view: 'View',
    create: 'Create',
    edit: 'Edit',
    delete: 'Delete',
  }

  return `${actionLabels[action]} ${moduleLabels[module]}`
}

/**
 * Permission module groupings for UI display
 */
export const PERMISSION_GROUPS = [
  {
    name: 'CRM',
    modules: ['contacts', 'projects', 'tasks', 'activities'] as PermissionModule[],
  },
  {
    name: 'Communication',
    modules: ['calls', 'messages', 'campaigns'] as PermissionModule[],
  },
  {
    name: 'Documents',
    modules: ['files', 'signatures'] as PermissionModule[],
  },
  {
    name: 'Scheduling',
    modules: ['calendar', 'territories'] as PermissionModule[],
  },
  {
    name: 'Intelligence',
    modules: ['reports', 'analytics', 'voice_assistant'] as PermissionModule[],
  },
  {
    name: 'Administration',
    modules: ['settings', 'users', 'team', 'billing'] as PermissionModule[],
  },
]
