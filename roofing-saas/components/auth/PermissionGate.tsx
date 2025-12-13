'use client'

/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user permissions.
 * Use to wrap UI elements that require specific permissions.
 *
 * @example
 * <PermissionGate module="contacts" action="create">
 *   <Button>New Contact</Button>
 * </PermissionGate>
 *
 * @example
 * <PermissionGate module="settings" action="edit" fallback={<span>View Only</span>}>
 *   <Button>Edit Settings</Button>
 * </PermissionGate>
 */

import { ReactNode } from 'react'
import {
  usePermissions,
  type PermissionModule,
  type PermissionAction,
} from '@/hooks/usePermissions'

interface PermissionGateProps {
  /** The permission module to check */
  module: PermissionModule
  /** The action to check (view, create, edit, delete) */
  action: PermissionAction
  /** Content to render when user has permission */
  children: ReactNode
  /** Optional content to render when user doesn't have permission */
  fallback?: ReactNode
  /** If true, show a loading skeleton while checking permissions */
  showLoading?: boolean
  /** Custom loading component */
  loadingComponent?: ReactNode
}

export function PermissionGate({
  module,
  action,
  children,
  fallback = null,
  showLoading = false,
  loadingComponent,
}: PermissionGateProps) {
  const { can, loading } = usePermissions()

  if (loading) {
    if (showLoading) {
      return (
        <>
          {loadingComponent || (
            <span className="inline-block h-4 w-16 bg-muted animate-pulse rounded" />
          )}
        </>
      )
    }
    return null
  }

  if (can(module, action)) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * RequirePermission Component
 *
 * Similar to PermissionGate but for page-level access control.
 * Shows an access denied message when user lacks permission.
 */
interface RequirePermissionProps {
  module: PermissionModule
  action: PermissionAction
  children: ReactNode
  /** Custom access denied component */
  accessDenied?: ReactNode
}

export function RequirePermission({
  module,
  action,
  children,
  accessDenied,
}: RequirePermissionProps) {
  const { can, loading } = usePermissions()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!can(module, action)) {
    if (accessDenied) {
      return <>{accessDenied}</>
    }

    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <svg
            className="h-8 w-8 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page. Please contact your
          administrator if you believe this is an error.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * AdminGate Component
 *
 * Only renders children for admin or owner users.
 */
interface AdminGateProps {
  children: ReactNode
  fallback?: ReactNode
}

export function AdminGate({ children, fallback = null }: AdminGateProps) {
  const { isAdmin, loading } = usePermissions()

  if (loading) {
    return null
  }

  if (isAdmin) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * OwnerGate Component
 *
 * Only renders children for owner users.
 */
interface OwnerGateProps {
  children: ReactNode
  fallback?: ReactNode
}

export function OwnerGate({ children, fallback = null }: OwnerGateProps) {
  const { isOwner, loading } = usePermissions()

  if (loading) {
    return null
  }

  if (isOwner) {
    return <>{children}</>
  }

  return <>{fallback}</>
}

/**
 * MultiPermissionGate Component
 *
 * Requires all specified permissions to be present.
 */
interface MultiPermissionGateProps {
  permissions: Array<{ module: PermissionModule; action: PermissionAction }>
  /** If true, user needs any one of the permissions. If false, needs all. */
  requireAny?: boolean
  children: ReactNode
  fallback?: ReactNode
}

export function MultiPermissionGate({
  permissions,
  requireAny = false,
  children,
  fallback = null,
}: MultiPermissionGateProps) {
  const { can, loading } = usePermissions()

  if (loading) {
    return null
  }

  const hasPermission = requireAny
    ? permissions.some((p) => can(p.module, p.action))
    : permissions.every((p) => can(p.module, p.action))

  if (hasPermission) {
    return <>{children}</>
  }

  return <>{fallback}</>
}
