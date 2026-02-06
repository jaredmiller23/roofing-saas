/**
 * Google Calendar OAuth Callback Endpoint
 * Handles the OAuth callback from Google
 */

import { NextRequest } from 'next/server'
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
    // Default includes locale prefix to avoid i18n redirect stripping params
    let returnTo = '/en/events'
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
      const oauthErrorUrl = `${request.nextUrl.origin}${returnTo}?google_error=${encodeURIComponent(error)}`
      return new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${oauthErrorUrl}"><script>window.location.replace(${JSON.stringify(oauthErrorUrl)})</script></head><body>Redirecting...</body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
      )
    }

    // Validate required parameters
    if (!code || !state || !stateData) {
      throw ValidationError('Missing required OAuth parameters')
    }

    // Check state is not too old (5 minutes)
    if (Date.now() - stateData.timestamp > 5 * 60 * 1000) {
      logger.warn('Google OAuth state token expired', { timestamp: stateData.timestamp })
      const expiredUrl = `${request.nextUrl.origin}${returnTo}?google_error=${encodeURIComponent('Authorization expired. Please try again.')}`
      return new Response(
        `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${expiredUrl}"><script>window.location.replace(${JSON.stringify(expiredUrl)})</script></head><body>Redirecting...</body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
      )
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

    // Redirect back to original page with success message and email
    // Use client-side redirect to avoid next-intl middleware interfering with
    // server-side NextResponse.redirect() which can cause 404 on locale routes
    const redirectUrl = new URL(`${request.nextUrl.origin}${returnTo}`)
    redirectUrl.searchParams.set('google_connected', 'true')
    if (googleEmail) {
      redirectUrl.searchParams.set('email', googleEmail)
    }
    const targetUrl = redirectUrl.toString()
    return new Response(
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${targetUrl}"><script>window.location.replace(${JSON.stringify(targetUrl)})</script></head><body>Redirecting...</body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    logger.error('Google Calendar callback error', { error })
    // For OAuth flow, redirect with error rather than returning JSON
    if (error instanceof Error && (error.message.includes('Missing required') || error.message.includes('Invalid state') || error.message.includes('expired'))) {
      return errorResponse(error)
    }
    const errorUrl = `${request.nextUrl.origin}/en/events?google_error=Failed+to+connect`
    return new Response(
      `<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${errorUrl}"><script>window.location.replace(${JSON.stringify(errorUrl)})</script></head><body>Redirecting...</body></html>`,
      { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'no-store' } }
    )
  }
}
