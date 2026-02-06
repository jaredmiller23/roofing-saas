// =============================================
// Login Activity API Route
// =============================================
// Route: GET /api/auth/activity
// Purpose: Get login history for the current user
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { getLoginHistory, LoginEventType } from '@/lib/auth/activity-log'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/auth/activity
 * Get login history for the current user
 *
 * Query params:
 * - limit: number (default 50)
 * - offset: number (default 0)
 * - types: comma-separated event types to filter
 */
export const GET = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const typesParam = searchParams.get('types')

    const eventTypes = typesParam
      ? (typesParam.split(',') as LoginEventType[])
      : undefined

    const { activities, total } = await getLoginHistory(user.id, {
      limit,
      offset,
      eventTypes,
    })

    return successResponse({
      success: true,
      activities,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + activities.length < total,
      },
    })
  } catch (error) {
    logger.error('Error getting login activity:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
