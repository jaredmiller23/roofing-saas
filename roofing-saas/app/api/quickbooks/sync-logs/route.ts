/**
 * QuickBooks Sync Logs API
 * GET /api/quickbooks/sync-logs
 */
import { withAuth } from '@/lib/auth/with-auth'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/billing/feature-gates'
import { successResponse, errorResponse } from '@/lib/api/response'
import { InternalError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'

export const GET = withAuth(async (request, { tenantId }) => {
  try {
    await requireFeature(tenantId, 'quickbooksIntegration')

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')

    const supabase = await createClient()

    const { data: logs, error, count } = await supabase
      .from('quickbooks_sync_logs')
      .select('id, entity_type, entity_id, qb_id, action, direction, status, error_message, synced_at, created_at', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      logger.error('Failed to fetch sync logs', { error, tenantId })
      throw InternalError(error.message)
    }

    return successResponse({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    logger.error('Sync logs error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
