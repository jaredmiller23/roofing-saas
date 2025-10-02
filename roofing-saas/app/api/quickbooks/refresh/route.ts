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
      .from('quickbooks_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'QuickBooks connection not found' },
        { status: 404 }
      )
    }

    // Check if refresh token is still valid (within 100 days)
    const refreshExpiresAt = new Date(connection.refresh_token_expires_at)
    if (refreshExpiresAt <= new Date()) {
      // Refresh token expired - user must reauthorize
      await supabase
        .from('quickbooks_connections')
        .update({ is_active: false })
        .eq('tenant_id', tenantId)

      return NextResponse.json(
        { error: 'REAUTH_REQUIRED', message: 'Please reconnect your QuickBooks account' },
        { status: 401 }
      )
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

    // Calculate new expiration times
    const tokenExpiresAt = new Date(Date.now() + newToken.expires_in * 1000)
    const refreshTokenExpiresAt = new Date(Date.now() + 100 * 24 * 60 * 60 * 1000)

    // Update tokens in database
    // IMPORTANT: Always update refresh_token as it changes every 24 hours!
    const { error: updateError } = await supabase
      .from('quickbooks_connections')
      .update({
        access_token: newToken.access_token,
        refresh_token: newToken.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
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

    // If refresh fails with auth error, mark connection as inactive
    if (error.authResponse?.status === 401) {
      const user = await getCurrentUser()
      if (user) {
        const tenantId = await getUserTenantId(user.id)
        if (tenantId) {
          const supabase = await createClient()
          await supabase
            .from('quickbooks_connections')
            .update({ is_active: false, sync_error: 'Token refresh failed - reauth required' })
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
