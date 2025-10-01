import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import {
  getActivitySummary,
  getCallVolumeByDay,
  type AnalyticsPeriod,
} from '@/lib/twilio/analytics'

/**
 * GET /api/analytics
 * Get communication analytics for tenant
 *
 * Query params:
 * - period: 'day' | 'week' | 'month' | 'year' | 'all' (default: 'month')
 * - type: 'summary' | 'call_volume' (default: 'summary')
 * - days: number of days for call_volume type (default: 30)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', '/api/analytics', { tenantId, userId: user.id })

    const searchParams = request.nextUrl.searchParams
    const period = (searchParams.get('period') || 'month') as AnalyticsPeriod
    const type = searchParams.get('type') || 'summary'
    const days = parseInt(searchParams.get('days') || '30')

    let data: any

    if (type === 'call_volume') {
      // Get call volume by day for charting
      data = await getCallVolumeByDay(tenantId, days)
    } else {
      // Get complete activity summary
      data = await getActivitySummary(tenantId, period)
    }

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/analytics', 200, duration)

    return successResponse({ analytics: data, period, type })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Analytics API error', { error, duration })
    return errorResponse(error as Error)
  }
}
