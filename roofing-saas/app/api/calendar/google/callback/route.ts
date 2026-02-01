/**
 * Google Calendar OAuth Callback Endpoint
 * Handles the OAuth callback from Google
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeAuthCode, getGoogleUserInfo } from '@/lib/google/calendar-client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { ValidationError, AuthenticationError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Parse state first to get return URL (state is passed even on error)
    let returnTo = '/events'
    let stateData: { tenant_id: string; user_id: string; timestamp: number; return_to?: string } | null = null

    if (state) {
      try {
        stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        if (stateData?.return_to) {
          returnTo = stateData.return_to
        }
      } catch (_e) {
        // State parsing failed, use default return URL
      }
    }

    // Handle OAuth errors
    if (error) {
      logger.error('Google OAuth error', { error })
      return NextResponse.redirect(
        `${request.nextUrl.origin}${returnTo}?google_error=${encodeURIComponent(error)}`
      )
    }

    // Validate required parameters
    if (!code || !state || !stateData) {
      throw ValidationError('Missing required OAuth parameters')
    }

    // Check state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      throw ValidationError('State token expired')
    }

    const supabase = await createClient()

    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || user.id !== stateData.user_id) {
      throw AuthenticationError()
    }

    // Exchange authorization code for tokens
    const redirectUri = `${request.nextUrl.origin}/api/calendar/google/callback`
    const tokens = await exchangeAuthCode(code, redirectUri)

    // Get Google user info
    let googleEmail: string | null = null
    let googleName: string | null = null

    try {
      const userInfo = await getGoogleUserInfo(tokens.access_token)
      googleEmail = userInfo.email
      googleName = userInfo.name || null
    } catch (e) {
      logger.warn('Failed to get Google user info', { error: e })
    }

    // Encrypt tokens before storing
    const { data: rawEncryptedAccessToken, error: encryptAccessError } = await supabase
      .rpc('encrypt_google_token', { plaintext: tokens.access_token })
    const encryptedAccessToken = rawEncryptedAccessToken as string | null

    const { data: rawEncryptedRefreshToken, error: encryptRefreshError } = await supabase
      .rpc('encrypt_google_token', { plaintext: tokens.refresh_token })
    const encryptedRefreshToken = rawEncryptedRefreshToken as string | null

    if (encryptAccessError || encryptRefreshError || !encryptedAccessToken || !encryptedRefreshToken) {
      logger.error('Failed to encrypt Google tokens', {
        encryptAccessError,
        encryptRefreshError
      })
      throw InternalError('Failed to encrypt Google tokens')
    }

    // Store encrypted tokens in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const { error: insertError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        tenant_id: stateData.tenant_id,
        user_id: stateData.user_id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt.toISOString(),
        token_type: tokens.token_type,
        scope: tokens.scope,
        google_email: googleEmail,
        google_name: googleName,
      }, {
        onConflict: 'tenant_id,user_id',
      })

    if (insertError) {
      logger.error('Failed to store Google tokens', { error: insertError })
      throw InternalError('Failed to save Google Calendar connection')
    }

    logger.info('Google Calendar connected successfully', {
      userId: stateData.user_id,
      tenantId: stateData.tenant_id,
      googleEmail,
    })

    // Redirect back to original page with success message
    return NextResponse.redirect(
      `${request.nextUrl.origin}${returnTo}?google_connected=true`
    )
  } catch (error) {
    logger.error('Google Calendar callback error', { error })
    // For OAuth flow, redirect with error rather than returning JSON
    if (error instanceof Error && (error.message.includes('Missing required') || error.message.includes('Invalid state') || error.message.includes('expired'))) {
      return errorResponse(error)
    }
    return NextResponse.redirect(
      `${request.nextUrl.origin}/events?google_error=Failed+to+connect`
    )
  }
}
