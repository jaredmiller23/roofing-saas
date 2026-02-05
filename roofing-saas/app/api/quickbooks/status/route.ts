/**
 * QuickBooks Status Endpoint
 * Check if QuickBooks is connected for the current tenant
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET(_request: NextRequest) {
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

    const supabase = await createClient()

    // Check if QB is connected (use quickbooks_connections, not quickbooks_tokens)
    const { data: connection, error: connectionError } = await supabase
      .from('quickbooks_connections')
      .select('realm_id, company_name, token_expires_at, is_active, last_sync_at, sync_error, environment, created_at')
      .eq('tenant_id', tenantId)
      .single()

    if (connectionError || !connection) {
      return successResponse({
        connected: false,
        message: 'QuickBooks not connected',
      })
    }

    // Check if connection is active
    if (!connection.is_active) {
      return successResponse({
        connected: false,
        message: connection.sync_error || 'QuickBooks connection is inactive',
        sync_error: connection.sync_error,
      })
    }

    // Check if token is expired
    const expiresAt = new Date(connection.token_expires_at)
    const isExpired = expiresAt <= new Date()

    return successResponse({
      connected: true,
      realm_id: connection.realm_id,
      company_name: connection.company_name,
      expires_at: connection.token_expires_at,
      is_expired: isExpired,
      connected_at: connection.created_at,
      last_sync_at: connection.last_sync_at,
      environment: connection.environment,
    })
  } catch (error) {
    logger.error('QuickBooks status error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to check QuickBooks status'))
  }
}
