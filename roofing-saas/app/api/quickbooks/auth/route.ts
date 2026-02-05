/**
 * QuickBooks OAuth Authorization Endpoint
 * Redirects user to QuickBooks to authorize the app
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/quickbooks/client'
import { signState } from '@/lib/quickbooks/state'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
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

    // Generate HMAC-signed state token for CSRF protection
    const state = signState({
      tenant_id: tenantId,
      user_id: user.id,
      timestamp: Date.now(),
    })

    // Get redirect URI (should match QuickBooks app config)
    const redirectUri = `${request.nextUrl.origin}/api/quickbooks/callback`

    // Get authorization URL
    const authUrl = getAuthorizationUrl(redirectUri, state)

    logger.info('Redirecting to QuickBooks OAuth', {
      userId: user.id,
      tenantId,
    })

    // Redirect to QuickBooks authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('QuickBooks auth error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to initiate QuickBooks authorization'))
  }
}
