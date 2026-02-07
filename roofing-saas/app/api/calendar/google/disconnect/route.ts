/**
 * Google Calendar Disconnect Endpoint
 * POST /api/calendar/google/disconnect
 *
 * Revokes the Google OAuth token and removes the connection
 */

import { withAuth } from '@/lib/auth/with-auth'
import { createClient } from '@/lib/supabase/server'
import { revokeToken } from '@/lib/google/calendar-client'
import { logger } from '@/lib/logger'
import { NotFoundError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (_request, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    // Get existing token to revoke it
    const { data: token, error: fetchError } = await supabase
      .from('google_calendar_tokens')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !token) {
      throw NotFoundError('No Google Calendar connection found')
    }

    // Decrypt the refresh token to revoke it
    const { data: decryptedRefreshToken } = await supabase
      .rpc('decrypt_google_token', { encrypted_data: token.refresh_token })

    // Revoke the token with Google (best effort - may fail if already revoked)
    if (decryptedRefreshToken) {
      try {
        await revokeToken(decryptedRefreshToken as string)
      } catch (e) {
        logger.warn('Failed to revoke Google token (may already be revoked)', { error: e })
      }
    }

    // Delete the token from our database
    const { error: deleteError } = await supabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)

    if (deleteError) {
      logger.error('Failed to delete Google token', { error: deleteError })
      throw new Error('Failed to disconnect Google Calendar')
    }

    logger.info('Google Calendar disconnected', {
      userId,
      tenantId,
    })

    return successResponse({
      success: true,
      message: 'Google Calendar disconnected successfully',
    })
  } catch (error) {
    logger.error('Error disconnecting Google Calendar:', { error })
    return errorResponse(error instanceof Error ? error : new Error('Failed to disconnect'))
  }
})
