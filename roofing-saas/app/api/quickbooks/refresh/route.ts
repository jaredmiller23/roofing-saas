import { NextRequest } from 'next/server'
import { getOAuthClient } from '@/lib/quickbooks/oauth-client'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

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
      throw AuthenticationError()
    }

    // Get user's tenant
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    await requireFeature(tenantId, 'quickbooksIntegration')

    // Get current connection from database (use quickbooks_connections)
    const supabase = await createClient()
    const { data: connection, error: fetchError } = await supabase
      .from('quickbooks_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !connection) {
      throw NotFoundError('QuickBooks connection')
    }

    // Decrypt tokens from database (they are stored encrypted)
    const { data: rawDecryptedAccessToken, error: decryptAccessError } = await supabase
      .rpc('decrypt_qb_token', { encrypted_data: connection.access_token })

    const { data: rawDecryptedRefreshToken, error: decryptRefreshError } = await supabase
      .rpc('decrypt_qb_token', { encrypted_data: connection.refresh_token })

    const decryptedAccessToken = rawDecryptedAccessToken as string | null
    const decryptedRefreshToken = rawDecryptedRefreshToken as string | null

    if (decryptAccessError || decryptRefreshError || !decryptedAccessToken || !decryptedRefreshToken) {
      logger.error('Failed to decrypt QB tokens for refresh', {
        decryptAccessError,
        decryptRefreshError
      })
      throw InternalError('Failed to decrypt QuickBooks tokens')
    }

    // Initialize OAuth client with decrypted tokens
    const oauthClient = getOAuthClient()
    oauthClient.setToken({
      access_token: decryptedAccessToken,
      refresh_token: decryptedRefreshToken,
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
    const refreshTokenExpiresAt = new Date(Date.now() + (newToken.x_refresh_token_expires_in || 8726400) * 1000)

    // Encrypt tokens before storing (security requirement)
    const { data: rawEncryptedAccessToken, error: encryptAccessError } = await supabase
      .rpc('encrypt_qb_token', { plaintext: newToken.access_token })

    const { data: rawEncryptedRefreshToken, error: encryptRefreshError } = await supabase
      .rpc('encrypt_qb_token', { plaintext: newToken.refresh_token })

    const encryptedAccessToken = rawEncryptedAccessToken as string | null
    const encryptedRefreshToken = rawEncryptedRefreshToken as string | null

    if (encryptAccessError || encryptRefreshError || !encryptedAccessToken || !encryptedRefreshToken) {
      logger.error('Failed to encrypt QB tokens during refresh', {
        encryptAccessError,
        encryptRefreshError
      })
      throw InternalError('Failed to encrypt refreshed tokens')
    }

    // Update encrypted tokens in quickbooks_connections
    const { error: updateError } = await supabase
      .from('quickbooks_connections')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        refresh_token_expires_at: refreshTokenExpiresAt.toISOString(),
        sync_error: null,
      })
      .eq('tenant_id', tenantId)

    if (updateError) {
      logger.error('Failed to update tokens in database', { error: updateError })
      throw InternalError('Failed to store refreshed tokens')
    }

    return successResponse({
      success: true,
      expiresAt: tokenExpiresAt.toISOString(),
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('Token refresh error', { error })

    // If refresh fails with auth error, soft-disable the connection (reauth required)
    if (error.authResponse?.status === 401) {
      const user = await getCurrentUser()
      if (user) {
        const tenantId = await getUserTenantId(user.id)
        if (tenantId) {
          const supabase = await createClient()
          await supabase
            .from('quickbooks_connections')
            .update({
              is_active: false,
              sync_error: 'Authentication failed - please reconnect',
            })
            .eq('tenant_id', tenantId)
        }
      }

      throw AuthenticationError('Please reconnect your QuickBooks account')
    }

    return errorResponse(error instanceof Error ? error : InternalError('Failed to refresh token'))
  }
}
