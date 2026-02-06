/**
 * Google Calendar Connection Status Endpoint
 * GET /api/calendar/google/status
 *
 * Returns:
 * - connected: boolean
 * - googleEmail: string | null (email of connected Google account)
 * - googleName: string | null (display name)
 * - expiresAt: string | null (when the token expires)
 */

import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    // Check for existing token
    const { data: token, error } = await supabase
      .from('google_calendar_tokens')
      .select('google_email, google_name, expires_at, created_at')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !token) {
      return successResponse({
        connected: false,
        googleEmail: null,
        googleName: null,
        expiresAt: null,
      })
    }

    // A token record exists — user is connected even if the access token is expired,
    // because getGoogleCalendarClient() transparently refreshes using the refresh token.
    // Only report disconnected when no token record exists at all.
    const expiresAt = new Date(token.expires_at)
    const isExpired = expiresAt <= new Date()

    return successResponse({
      connected: true,
      googleEmail: token.google_email,
      googleName: token.google_name,
      expiresAt: token.expires_at,
      connectedAt: token.created_at,
      needsRefresh: isExpired,
    })
  } catch (error) {
    logger.error('Error checking Google Calendar status:', { error })
    return errorResponse(error instanceof Error ? error : new Error('Failed to check status'))
  }
}
