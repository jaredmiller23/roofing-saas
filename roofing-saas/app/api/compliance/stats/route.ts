import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getComplianceStats, getDNCStats } from '@/lib/compliance'

/**
 * GET /api/compliance/stats?days=30
 * Get compliance statistics for tenant
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

    logger.apiRequest('GET', '/api/compliance/stats', { tenantId, userId: user.id })

    // Get optional days parameter
    const { searchParams } = new URL(request.url)
    const daysParam = searchParams.get('days')
    const days = daysParam ? parseInt(daysParam, 10) : 30

    // Validate days parameter
    if (isNaN(days) || days < 1 || days > 365) {
      logger.warn('Invalid days parameter', { days: daysParam })
      // Use default instead of throwing error
    }

    const validDays = isNaN(days) || days < 1 || days > 365 ? 30 : days

    // Get compliance check statistics
    const complianceStats = await getComplianceStats(tenantId, validDays)

    // Get DNC registry counts
    const dncStats = await getDNCStats(tenantId)

    // Calculate additional metrics
    const totalChecks = complianceStats.total
    const allowedCalls = complianceStats.passed
    const blockedCalls = complianceStats.failed
    const warningCalls = complianceStats.warnings

    const blockRate =
      totalChecks > 0 ? ((blockedCalls / totalChecks) * 100).toFixed(2) : '0.00'

    // Group blocked reasons by check type
    const blockedByReason: Record<
      string,
      { count: number; percentage: string }
    > = {}

    Object.entries(complianceStats.byType).forEach(([checkType, counts]) => {
      if (counts.fail > 0) {
        const percentage =
          totalChecks > 0 ? ((counts.fail / totalChecks) * 100).toFixed(2) : '0.00'
        blockedByReason[checkType] = {
          count: counts.fail,
          percentage,
        }
      }
    })

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/compliance/stats', 200, duration)

    return successResponse({
      period: {
        days: validDays,
        startDate: new Date(
          Date.now() - validDays * 24 * 60 * 60 * 1000
        ).toISOString(),
        endDate: new Date().toISOString(),
      },
      complianceChecks: {
        totalChecks,
        allowed: allowedCalls,
        blocked: blockedCalls,
        warnings: warningCalls,
        blockRate: `${blockRate}%`,
      },
      byCheckType: complianceStats.byType,
      blockedByReason,
      dncRegistry: {
        total: dncStats.total,
        federal: dncStats.federal,
        state: dncStats.state,
        internal: dncStats.internal,
      },
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Compliance stats error', { error, duration })
    return errorResponse(error as Error)
  }
}
