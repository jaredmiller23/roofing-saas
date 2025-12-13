// =============================================
// User Permissions API Route
// =============================================
// Route: GET /api/auth/permissions
// Purpose: Get current user's permissions
// =============================================

import { getCurrentUser, getUserRole } from '@/lib/auth/session'
import { getUserPermissions } from '@/lib/auth/permissions'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/auth/permissions
 * Get the current user's permissions
 */
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const [permissions, role] = await Promise.all([
      getUserPermissions(user.id),
      getUserRole(user.id),
    ])

    return successResponse({
      permissions,
      role,
      user_id: user.id,
    })
  } catch (error) {
    logger.error('Error fetching permissions:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
