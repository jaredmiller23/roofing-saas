/**
 * Google Calendar OAuth Authorization Endpoint
 * Redirects user to Google to authorize the app
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/google/calendar-client'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError, ApiError, ErrorCode } from '@/lib/api/errors'
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

    // Check if Google OAuth is configured
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      throw new ApiError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        'Google Calendar integration is not configured. Please contact your administrator.',
        503
      )
    }

    // Generate state token for CSRF protection (matches QuickBooks pattern)
    const state = Buffer.from(JSON.stringify({
      tenant_id: tenantId,
      user_id: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    // Get redirect URI
    const redirectUri = `${request.nextUrl.origin}/api/calendar/google/callback`

    // Get authorization URL
    const authUrl = getAuthorizationUrl(redirectUri, state)

    logger.info('Redirecting to Google OAuth', {
      userId: user.id,
      tenantId,
    })

    // Redirect to Google authorization page
    return NextResponse.redirect(authUrl)
  } catch (error) {
    logger.error('Google Calendar auth error', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to initiate Google authorization'))
  }
}

// Also support POST for compatibility with existing UI
export async function POST(request: NextRequest) {
  return GET(request)
}
