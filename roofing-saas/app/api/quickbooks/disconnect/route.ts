/**
 * QuickBooks Disconnect Endpoint
 * Removes QuickBooks integration for tenant
 */

import { withAuth } from '@/lib/auth/with-auth'
import { createClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/billing/feature-gates'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (_request, { userId, tenantId }) => {
  try {
    await requireFeature(tenantId, 'quickbooksIntegration')

    const supabase = await createClient()

    // Delete QuickBooks connection (hard delete for security - removes encrypted tokens)
    const { error: deleteError } = await supabase
      .from('quickbooks_connections')
      .delete()
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to disconnect QuickBooks', { error: deleteError })
      throw InternalError('Failed to disconnect QuickBooks')
    }

    logger.info('QuickBooks disconnected successfully', {
      tenantId,
      userId,
    })

    return successResponse(null)
  } catch (error) {
    logger.error('QuickBooks disconnect error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to disconnect QuickBooks'))
  }
})
