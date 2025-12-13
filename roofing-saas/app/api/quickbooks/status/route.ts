/**
 * QuickBooks Status Endpoint
 * Check if QuickBooks is connected for the current tenant
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
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

    const supabase = await createClient()

    // Check if QB is connected
    const { data: token, error: tokenError } = await supabase
      .from('quickbooks_tokens')
      .select('realm_id, company_name, country, expires_at, created_at')
      .eq('tenant_id', tenantId)
      .single()

    if (tokenError || !token) {
      return successResponse({
        connected: false,
        message: 'QuickBooks not connected',
      })
    }

    // Check if token is expired
    const expiresAt = new Date(token.expires_at)
    const isExpired = expiresAt <= new Date()

    return successResponse({
      connected: true,
      realm_id: token.realm_id,
      company_name: token.company_name,
      country: token.country,
      expires_at: token.expires_at,
      is_expired: isExpired,
      connected_at: token.created_at,
    })
  } catch (error) {
    logger.error('QuickBooks status error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to check QuickBooks status'))
  }
}
