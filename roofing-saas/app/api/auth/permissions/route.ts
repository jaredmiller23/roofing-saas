// =============================================
// User Permissions API Route
// =============================================
// Route: GET /api/auth/permissions
// Purpose: Get current user's permissions
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { getUserRole } from '@/lib/auth/session'
import { getUserPermissions } from '@/lib/auth/permissions'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/auth/permissions
 * Get the current user's permissions
 */
export const GET = withAuth(async (_request: NextRequest, { user, tenantId }) => {
  try {
    const [permissions, role] = await Promise.all([
      getUserPermissions(user.id, tenantId),
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
})
