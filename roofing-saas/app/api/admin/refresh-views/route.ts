import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

interface ViewRefreshResult {
  view_name: string
  status: string
  duration_ms: number
}

/**
 * POST /api/admin/refresh-views
 * Refreshes all dashboard materialized views
 * Admin/owner-only endpoint for database maintenance
 *
 * Refreshes:
 * - mv_tenant_project_summary (project counts, revenue, conversion)
 * - mv_tenant_pipeline_by_status (pipeline breakdown)
 * - mv_tenant_activity_summary (activity counts by type/period)
 * - mv_tenant_contact_summary (contact counts)
 * - mv_tenant_revenue_by_month (monthly revenue trend)
 * - mv_user_activity_summary (user activity for leaderboards)
 * - mv_user_sales_summary (user sales for leaderboards)
 *
 * Usage:
 * - Call after bulk data imports
 * - Call periodically via cron (e.g., hourly or nightly)
 * - Call manually when dashboard data appears stale
 */
export const POST = withAuth(async (request: NextRequest, { user, tenantId }) => {
  const startTime = Date.now()

  try {
    // Check if user is admin or owner
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin or owner access required')
    }

    logger.apiRequest('POST', '/api/admin/refresh-views', { tenantId, userId: user.id })

    // Use admin client since refresh_materialized_views is SECURITY DEFINER
    // and needs to operate across all tenants
    const supabase = await createAdminClient()

    // Call the refresh function
    // Returns table of (view_name, status, duration_ms) for each view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('refresh_materialized_views') as {
      data: ViewRefreshResult[] | null
      error: { message: string } | null
    }

    if (error) {
      logger.error('Materialized view refresh error', { error, tenantId, userId: user.id })
      throw InternalError('Failed to refresh materialized views')
    }

    const results = data ?? []
    const totalDuration = Date.now() - startTime
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status.startsWith('error')).length

    logger.apiResponse('POST', '/api/admin/refresh-views', 200, totalDuration)
    logger.info('Materialized views refreshed', {
      userId: user.id,
      tenantId,
      successCount,
      errorCount,
      totalDuration,
      results
    })

    return successResponse({
      success: true,
      refreshed_at: new Date().toISOString(),
      total_views: results.length,
      successful: successCount,
      failed: errorCount,
      duration_ms: totalDuration,
      results
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Refresh views API error', { error, duration })
    return errorResponse(error as Error)
  }
})
