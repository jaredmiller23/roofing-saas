// =============================================
// User Role API Route
// =============================================
// Route: GET /api/auth/user-role
// Purpose: Get current user's role in their tenant
// =============================================

import { getCurrentUser, getUserRole } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const role = await getUserRole(user.id)

    return successResponse({
      success: true,
      userId: user.id,
      role: role || 'user', // Default to 'user' if no role found
    })
  } catch (error) {
    logger.error('Error getting user role:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}