/**
 * QuickBooks OAuth Callback Endpoint
 * Handles the OAuth callback from QuickBooks
 */

import { NextRequest, NextResponse } from 'next/server'
import { exchangeAuthCode } from '@/lib/quickbooks/client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { ValidationError, AuthenticationError, InternalError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const realmId = searchParams.get('realmId')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      logger.error('QuickBooks OAuth error', { error })
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings?qb_error=${encodeURIComponent(error)}`
      )
    }

    // Validate required parameters
    if (!code || !state || !realmId) {
      throw ValidationError('Missing required OAuth parameters')
    }

    // Decode and validate state
    let stateData: { tenant_id: string; user_id: string; timestamp: number }
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    } catch (_e) {
      throw ValidationError('Invalid state parameter')
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
    const redirectUri = `${request.nextUrl.origin}/api/quickbooks/callback`
    const tokens = await exchangeAuthCode(code, realmId, redirectUri)

    // Get QB company info
    const companyInfo = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}`,
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
          Accept: 'application/json',
        },
      }
    ).then(res => res.json())

    const companyName = companyInfo?.CompanyInfo?.CompanyName || 'Unknown'
    const country = companyInfo?.CompanyInfo?.Country || 'US'

    // Encrypt tokens before storing
    const { data: rawEncryptedAccessToken, error: encryptAccessError } = await supabase
      .rpc('encrypt_qb_token', { plaintext: tokens.access_token })
    const encryptedAccessToken = rawEncryptedAccessToken as string | null

    const { data: rawEncryptedRefreshToken, error: encryptRefreshError } = await supabase
      .rpc('encrypt_qb_token', { plaintext: tokens.refresh_token })
    const encryptedRefreshToken = rawEncryptedRefreshToken as string | null

    if (encryptAccessError || encryptRefreshError || !encryptedAccessToken || !encryptedRefreshToken) {
      logger.error('Failed to encrypt QB tokens', {
        encryptAccessError,
        encryptRefreshError
      })
      throw InternalError('Failed to encrypt QuickBooks tokens')
    }

    // Store encrypted tokens in database
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const { error: insertError } = await supabase
      .from('quickbooks_tokens')
      .upsert({
        tenant_id: stateData.tenant_id,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        realm_id: realmId,
        expires_at: expiresAt.toISOString(),
        token_type: tokens.token_type,
        company_name: companyName,
        country,
      }, {
        onConflict: 'tenant_id',
      })

    if (insertError) {
      logger.error('Failed to store QB tokens', { error: insertError })
      throw InternalError('Failed to save QuickBooks connection')
    }

    logger.info('QuickBooks connected successfully', {
      tenantId: stateData.tenant_id,
      realmId,
      companyName,
    })

    // Redirect to settings with success message
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?qb_connected=true`
    )
  } catch (error) {
    logger.error('QuickBooks callback error', { error })
    // For OAuth flow, redirect with error rather than returning JSON
    if (error instanceof Error && (error.message.includes('Missing required') || error.message.includes('Invalid state') || error.message.includes('expired'))) {
      return errorResponse(error)
    }
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings?qb_error=Failed+to+connect`
    )
  }
}
