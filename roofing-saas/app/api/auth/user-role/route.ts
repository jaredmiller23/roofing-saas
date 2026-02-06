// =============================================
// User Role API Route
// =============================================
// Route: GET /api/auth/user-role
// Purpose: Get current user's role in their tenant
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { getUserRole } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request: NextRequest, { user }) => {
  try {
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
})
