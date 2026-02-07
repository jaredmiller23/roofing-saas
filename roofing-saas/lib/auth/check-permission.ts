/**
 * Permission Check Helper for API Route Handlers
 *
 * Provides a simple, importable function that route handlers can call
 * after withAuth provides the auth context. Uses the existing permission
 * system (hasPermission) to check module+action access.
 *
 * @example
 * import { checkPermission } from '@/lib/auth/check-permission'
 *
 * export const POST = withAuth(async (request, { userId, tenantId }) => {
 *   const allowed = await checkPermission(userId, 'contacts', 'create')
 *   if (!allowed) {
 *     return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to create contacts', 403))
 *   }
 *   // ... rest of handler
 * })
 */

import { hasPermission } from './permissions'
import type { PermissionModule, PermissionAction } from './permissions'

/**
 * Check if a user has permission for a specific action on a module.
 *
 * This is a thin wrapper around the existing `hasPermission` function,
 * designed to be called inside route handlers where userId is already
 * available from the withAuth context.
 *
 * @param userId - The authenticated user's ID (from withAuth context)
 * @param module - The permission module to check (e.g., 'contacts', 'billing')
 * @param action - The permission action to check (e.g., 'view', 'create', 'edit', 'delete')
 * @param tenantId - Optional tenant ID to scope the permission check
 * @returns true if the user has the required permission, false otherwise
 */
export async function checkPermission(
  userId: string,
  module: PermissionModule,
  action: PermissionAction,
  tenantId?: string
): Promise<boolean> {
  return hasPermission(userId, module, action, tenantId)
}
