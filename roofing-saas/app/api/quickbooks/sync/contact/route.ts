/**
 * QuickBooks Contact Sync Endpoint
 * Sync a single contact or all contacts to QuickBooks
 */

import { NextRequest } from 'next/server'
import { getQuickBooksClient } from '@/lib/quickbooks/client'
import { syncContactToCustomer, bulkSyncContacts } from '@/lib/quickbooks/sync'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
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

    // Get QB client
    const qbClient = await getQuickBooksClient(tenantId)

    if (!qbClient) {
      throw ValidationError('QuickBooks not connected')
    }

    const body = await request.json()
    const { contactId, bulkSync } = body

    if (bulkSync) {
      // Bulk sync all contacts
      logger.info('Starting bulk contact sync', { tenantId })

      const result = await bulkSyncContacts(tenantId, qbClient)

      return successResponse({
        success: true,
        message: `Synced ${result.synced} of ${result.total} contacts`,
        ...result,
      })
    }

    if (!contactId) {
      throw ValidationError('contactId or bulkSync required')
    }

    // Sync single contact
    const result = await syncContactToCustomer(
      contactId,
      tenantId,
      qbClient
    )

    if (!result.success) {
      throw InternalError(result.error || 'Sync failed')
    }

    return successResponse({
      success: true,
      qbCustomerId: result.qbId,
    })
  } catch (error) {
    logger.error('QuickBooks contact sync error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to sync contact'))
  }
}
