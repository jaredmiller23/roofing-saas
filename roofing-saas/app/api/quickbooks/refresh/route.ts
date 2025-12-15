import { NextRequest } from 'next/server'
import { getOAuthClient } from '@/lib/quickbooks/oauth-client'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
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

    // Get current connection from database
    const supabase = await createClient()
    const { data: connection, error: fetchError } = await supabase
      .from('quickbooks_tokens')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !connection) {
      throw NotFoundError('QuickBooks connection')
    }

    // Decrypt tokens from database (they are stored encrypted)
    const { data: decryptedAccessToken, error: decryptAccessError } = await supabase
      .rpc('decrypt_qb_token', { encrypted_data: connection.access_token })

    const { data: decryptedRefreshToken, error: decryptRefreshError } = await supabase
      .rpc('decrypt_qb_token', { encrypted_data: connection.refresh_token })

    if (decryptAccessError || decryptRefreshError || !decryptedAccessToken || !decryptedRefreshToken) {
      logger.error('Failed to decrypt QB tokens for refresh', {
        decryptAccessError,
        decryptRefreshError
      })
      throw InternalError('Failed to decrypt QuickBooks tokens')
    }

    // Check if token is already expired
    const expiresAt = new Date(connection.expires_at)
    if (expiresAt <= new Date()) {
      // Token expired, try to refresh
      // (QuickBooks refresh tokens are valid for 100 days from last refresh)
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

    // Calculate new expiration time
    const tokenExpiresAt = new Date(Date.now() + newToken.expires_in * 1000)

    // Encrypt tokens before storing (security requirement)
    const { data: encryptedAccessToken, error: encryptAccessError } = await supabase
      .rpc('encrypt_qb_token', { plaintext: newToken.access_token })

    const { data: encryptedRefreshToken, error: encryptRefreshError } = await supabase
      .rpc('encrypt_qb_token', { plaintext: newToken.refresh_token })

    if (encryptAccessError || encryptRefreshError || !encryptedAccessToken || !encryptedRefreshToken) {
      logger.error('Failed to encrypt QB tokens during refresh', {
        encryptAccessError,
        encryptRefreshError
      })
      throw InternalError('Failed to encrypt refreshed tokens')
    }

    // Update encrypted tokens in database
    // IMPORTANT: Always update refresh_token as it rotates with each refresh
    const { error: updateError } = await supabase
      .from('quickbooks_tokens')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: tokenExpiresAt.toISOString(),
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

      throw AuthenticationError('Please reconnect your QuickBooks account')
    }

    return errorResponse(error instanceof Error ? error : InternalError('Failed to refresh token'))
  }
}
