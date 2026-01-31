import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * Disconnect Google Calendar
 * POST /api/calendar/google/disconnect
 */
export async function POST() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Google Calendar integration is not yet implemented (user_settings table pending)
    // Return success since there's nothing to disconnect
    return successResponse({
      success: true,
      message: 'Google Calendar disconnected successfully'
    })
  } catch (error) {
    logger.error('Error disconnecting Google Calendar:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
