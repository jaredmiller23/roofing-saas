import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * Check Google Calendar connection status
 * GET /api/calendar/google/status
 *
 * Returns:
 * - connected: boolean
 * - calendarUrl: string | null (public calendar embed URL if available)
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const supabase = await createClient()

    // Google Calendar integration is not yet implemented (user_settings table pending)
    // Return disconnected state until the feature is built
    return successResponse({
      connected: false,
      calendarUrl: null
    })
  } catch (error) {
    logger.error('Error checking Google Calendar status:', { error })
    return errorResponse(error instanceof Error ? error : new Error('Failed to check status'))
  }
}
