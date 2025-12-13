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

    const supabase = await createClient()

    // Remove Google Calendar connection from user settings
    const { error } = await supabase
      .from('user_settings')
      .update({
        google_calendar_connected: false,
        google_calendar_url: null,
        google_calendar_refresh_token: null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      logger.error('Error disconnecting Google Calendar:', { error })
      throw InternalError('Failed to disconnect')
    }

    return successResponse({
      success: true,
      message: 'Google Calendar disconnected successfully'
    })
  } catch (error) {
    logger.error('Error disconnecting Google Calendar:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
