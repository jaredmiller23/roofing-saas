/**
 * QuickBooks Project Sync Endpoint
 * Sync a project to QuickBooks as an invoice
 */

import { NextRequest } from 'next/server'
import { getQuickBooksClient } from '@/lib/quickbooks/client'
import { syncProjectToInvoice } from '@/lib/quickbooks/sync'
import { withAuth } from '@/lib/auth/with-auth'
import { requireFeature } from '@/lib/billing/feature-gates'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    await requireFeature(tenantId, 'quickbooksIntegration')

    // Get QB client
    const qbClient = await getQuickBooksClient(tenantId)

    if (!qbClient) {
      throw ValidationError('QuickBooks not connected')
    }

    const body = await request.json()
    const { projectId } = body

    if (!projectId) {
      throw ValidationError('projectId required')
    }

    // Sync project to invoice
    const result = await syncProjectToInvoice(
      projectId,
      tenantId,
      qbClient
    )

    if (!result.success) {
      throw InternalError(result.error || 'Sync failed')
    }

    return successResponse({
      success: true,
      qbInvoiceId: result.qbId,
    })
  } catch (error) {
    logger.error('QuickBooks project sync error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to sync project'))
  }
})
