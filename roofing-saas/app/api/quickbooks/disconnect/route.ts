/**
 * QuickBooks Disconnect Endpoint
 * Removes QuickBooks integration for tenant
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    // Delete QuickBooks tokens (hard delete for security)
    const { error: deleteError } = await supabase
      .from('quickbooks_tokens')
      .delete()
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to disconnect QuickBooks', { error: deleteError })
      throw InternalError('Failed to disconnect QuickBooks')
    }

    logger.info('QuickBooks disconnected successfully', {
      tenantId,
      userId: user.id,
    })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('QuickBooks disconnect error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to disconnect QuickBooks'))
  }
}
