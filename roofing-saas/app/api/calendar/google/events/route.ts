/**
 * Google Calendar Events Endpoint
 * GET /api/calendar/google/events
 *
 * Query params:
 * - timeMin: ISO date string (defaults to start of current month)
 * - timeMax: ISO date string (defaults to end of current month)
 * - maxResults: number (defaults to 250)
 *
 * Returns:
 * - events: GoogleCalendarEvent[]
 */

import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { getGoogleCalendarClient, GoogleCalendarEvent } from '@/lib/google/calendar-client'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const timeMin = searchParams.get('timeMin')
    const timeMax = searchParams.get('timeMax')
    const maxResultsParam = searchParams.get('maxResults')
    const maxResults = maxResultsParam ? parseInt(maxResultsParam, 10) : 250

    // Default to current month if no time range specified
    const now = new Date()
    const defaultTimeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const defaultTimeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

    // Get Google Calendar client
    const client = await getGoogleCalendarClient(user.id, tenantId)
    if (!client) {
      return successResponse({
        connected: false,
        events: [],
        error: 'Google Calendar not connected',
      })
    }

    // Fetch events
    const result = await client.listEvents('primary', {
      timeMin: timeMin || defaultTimeMin,
      timeMax: timeMax || defaultTimeMax,
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events: GoogleCalendarEvent[] = result.items || []

    logger.info('Fetched Google Calendar events', {
      userId: user.id,
      tenantId,
      eventCount: events.length,
    })

    return successResponse({
      connected: true,
      events,
    })
  } catch (error) {
    logger.error('Error fetching Google Calendar events:', { error })

    // Check if it's a Google API error (e.g., token revoked)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events'
    if (errorMessage.includes('401') || errorMessage.includes('invalid_grant')) {
      return successResponse({
        connected: false,
        events: [],
        error: 'Google Calendar access revoked. Please reconnect.',
      })
    }

    return errorResponse(error instanceof Error ? error : new Error('Failed to fetch events'))
  }
}
