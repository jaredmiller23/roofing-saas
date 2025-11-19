import { NextRequest, NextResponse } from 'next/server'
import { getOAuthClient } from '@/lib/quickbooks/oauth-client'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * Refresh QuickBooks OAuth tokens
 * POST /api/quickbooks/refresh
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's tenant
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant found' },
        { status: 400 }
      )
    }

    // Get current connection from database
    const supabase = await createClient()
    const { data: connection, error: fetchError } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'QuickBooks connection not found' },
        { status: 404 }
      )
    }

    // Check if token is already expired
    const expiresAt = new Date(connection.expires_at)
    if (expiresAt <= new Date()) {
      // Token expired, try to refresh
      // (QuickBooks refresh tokens are valid for 100 days from last refresh)
    }

    // Initialize OAuth client with current tokens
    const oauthClient = getOAuthClient()
    oauthClient.setToken({
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_type: 'bearer',
      expires_in: 3600,
      x_refresh_token_expires_in: 8726400, // 100 days in seconds
      realmId: connection.realm_id,
    })

    // Refresh the token
    const authResponse = await oauthClient.refresh()
    const newToken = authResponse.getJson()

    // Calculate new expiration time
    const tokenExpiresAt = new Date(Date.now() + newToken.expires_in * 1000)

    // Update tokens in database
    // IMPORTANT: Always update refresh_token as it rotates with each refresh
    const { error: updateError } = await supabase
      .from('quickbooks_tokens')
      .update({
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token,
        expires_at: tokenExpiresAt.toISOString(),
      })
      .eq('tenant_id', tenantId)

    if (updateError) {
      console.error('Failed to update tokens:', updateError)
      return NextResponse.json(
        { error: 'Failed to store refreshed tokens' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      expiresAt: tokenExpiresAt.toISOString(),
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Token refresh error:', error)

    // If refresh fails with auth error, delete the tokens (reauth required)
    if (error.authResponse?.status === 401) {
      const user = await getCurrentUser()
      if (user) {
        const tenantId = await getUserTenantId(user.id)
        if (tenantId) {
          const supabase = await createClient()
          await supabase
            .from('quickbooks_tokens')
            .delete()
            .eq('tenant_id', tenantId)
        }
      }

      return NextResponse.json(
        { error: 'REAUTH_REQUIRED', message: 'Please reconnect your QuickBooks account' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    )
  }
}
