'use client'

/**
 * usePermissions Hook
 *
 * Client-side hook for checking user permissions.
 * Fetches permissions from the API and provides easy access methods.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'

// Permission types (must match server-side)
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

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export type ModulePermissions = Record<PermissionAction, boolean>
export type Permissions = Record<PermissionModule, ModulePermissions>

interface UsePermissionsReturn {
  permissions: Permissions | null
  loading: boolean
  error: string | null
  can: (module: PermissionModule, action: PermissionAction) => boolean
  canView: (module: PermissionModule) => boolean
  canCreate: (module: PermissionModule) => boolean
  canEdit: (module: PermissionModule) => boolean
  canDelete: (module: PermissionModule) => boolean
  canAny: (module: PermissionModule) => boolean
  canAll: (module: PermissionModule) => boolean
  isAdmin: boolean
  isOwner: boolean
  refresh: () => Promise<void>
}

// Empty permissions object
const EMPTY_PERMISSIONS: Permissions = PERMISSION_MODULES.reduce(
  (acc, module) => {
    acc[module] = { view: false, create: false, edit: false, delete: false }
    return acc
  },
  {} as Permissions
)

export function usePermissions(): UsePermissionsReturn {
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/auth/permissions')

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - return empty permissions
          setPermissions(EMPTY_PERMISSIONS)
          return
        }
        throw new Error('Failed to fetch permissions')
      }

      const data = await response.json()
      setPermissions(data.permissions)
      setRole(data.role)
    } catch (err) {
      console.error('Error fetching permissions:', err)
      setError(err instanceof Error ? err.message : 'Failed to load permissions')
      setPermissions(EMPTY_PERMISSIONS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPermissions()
  }, [fetchPermissions])

  // Permission check helper
  const can = useCallback(
    (module: PermissionModule, action: PermissionAction): boolean => {
      if (!permissions) return false
      return permissions[module]?.[action] ?? false
    },
    [permissions]
  )

  // Convenience methods
  const canView = useCallback(
    (module: PermissionModule) => can(module, 'view'),
    [can]
  )

  const canCreate = useCallback(
    (module: PermissionModule) => can(module, 'create'),
    [can]
  )

  const canEdit = useCallback(
    (module: PermissionModule) => can(module, 'edit'),
    [can]
  )

  const canDelete = useCallback(
    (module: PermissionModule) => can(module, 'delete'),
    [can]
  )

  // Check if user has any permission on a module
  const canAny = useCallback(
    (module: PermissionModule): boolean => {
      if (!permissions) return false
      const modulePerms = permissions[module]
      if (!modulePerms) return false
      return Object.values(modulePerms).some(Boolean)
    },
    [permissions]
  )

  // Check if user has all permissions on a module
  const canAll = useCallback(
    (module: PermissionModule): boolean => {
      if (!permissions) return false
      const modulePerms = permissions[module]
      if (!modulePerms) return false
      return Object.values(modulePerms).every(Boolean)
    },
    [permissions]
  )

  // Role checks
  const isAdmin = useMemo(() => role === 'admin' || role === 'owner', [role])
  const isOwner = useMemo(() => role === 'owner', [role])

  return {
    permissions,
    loading,
    error,
    can,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAny,
    canAll,
    isAdmin,
    isOwner,
    refresh: fetchPermissions,
  }
}

/**
 * Hook to check a specific permission
 * Useful when you only need to check one permission
 */
export function usePermission(
  module: PermissionModule,
  action: PermissionAction
): { allowed: boolean; loading: boolean } {
  const { can, loading } = usePermissions()
  return {
    allowed: can(module, action),
    loading,
  }
}

/**
 * Hook to check if user can access a module at all
 */
export function useModuleAccess(module: PermissionModule): {
  hasAccess: boolean
  loading: boolean
} {
  const { canView, loading } = usePermissions()
  return {
    hasAccess: canView(module),
    loading,
  }
}
