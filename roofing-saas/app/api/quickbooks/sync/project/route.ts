/**
 * QuickBooks Project Sync Endpoint
 * Sync a project to QuickBooks as an invoice
 */

import { NextRequest } from 'next/server'
import { getQuickBooksClient } from '@/lib/quickbooks/client'
import { syncProjectToInvoice } from '@/lib/quickbooks/sync'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

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
}
