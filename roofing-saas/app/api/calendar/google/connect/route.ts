/**
 * Google Calendar OAuth Authorization Endpoint
 * Redirects user to Google to authorize the app
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
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
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim()
    if (!clientId) {
      throw new ApiError(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        'Google Calendar integration is not configured. Please contact your administrator.',
        503
      )
    }

    // Get return URL from referer, preserving locale prefix
    // The app uses locale prefixes like /en/events, /es/events, etc.
    const referer = request.headers.get('referer')
    let returnTo = '/en/events' // Default with locale

    if (referer) {
      try {
        const refererUrl = new URL(referer)
        // Extract locale from path (e.g., /en/events → en)
        const localeMatch = refererUrl.pathname.match(/^\/([a-z]{2})\//)
        const locale = localeMatch?.[1] || 'en'
        returnTo = `/${locale}/events`
      } catch {
        // Invalid referer URL, use default
      }
    }

    // Generate HMAC-signed state token for CSRF protection
    // State data is base64-encoded JSON; HMAC prevents tampering with tenant_id/return_to
    const statePayload = JSON.stringify({
      tenant_id: tenantId,
      user_id: user.id,
      timestamp: Date.now(),
      return_to: returnTo,
    })
    const stateData = Buffer.from(statePayload).toString('base64')
    const hmac = createHmac('sha256', process.env.GOOGLE_CLIENT_SECRET || '')
      .update(stateData)
      .digest('hex')
    const state = `${stateData}.${hmac}`

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
