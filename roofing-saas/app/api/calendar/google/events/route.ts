/**
 * Google Calendar Events Endpoint
 *
 * GET /api/calendar/google/events
 * Query params:
 * - timeMin: ISO date string (defaults to start of current month)
 * - timeMax: ISO date string (defaults to end of current month)
 * - maxResults: number (defaults to 250)
 * Returns: { connected: boolean, events: GoogleCalendarEvent[] }
 *
 * POST /api/calendar/google/events
 * Body: { summary, description?, location?, start, end, allDay? }
 * Returns: { event: GoogleCalendarEvent }
 */

import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { getGoogleCalendarClient, GoogleCalendarEvent } from '@/lib/google/calendar-client'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
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

/**
 * POST /api/calendar/google/events
 * Create a new event in Google Calendar
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const body = await request.json()

    // Validate required fields
    if (!body.summary || typeof body.summary !== 'string') {
      throw ValidationError('Event summary/title is required')
    }
    if (!body.start) {
      throw ValidationError('Event start time is required')
    }
    if (!body.end) {
      throw ValidationError('Event end time is required')
    }

    // Get Google Calendar client
    const client = await getGoogleCalendarClient(user.id, tenantId)
    if (!client) {
      return errorResponse(new Error('Google Calendar not connected. Please connect your Google Calendar first.'))
    }

    // Build the Google Calendar event object
    const isAllDay = body.allDay === true
    const event: GoogleCalendarEvent = {
      summary: body.summary,
      description: body.description || undefined,
      location: body.location || undefined,
      start: isAllDay
        ? { date: body.start.split('T')[0] }
        : { dateTime: body.start, timeZone: body.timeZone || 'America/New_York' },
      end: isAllDay
        ? { date: body.end.split('T')[0] }
        : { dateTime: body.end, timeZone: body.timeZone || 'America/New_York' },
    }

    // Add attendees if provided
    if (body.attendees && Array.isArray(body.attendees)) {
      event.attendees = body.attendees.map((email: string) => ({ email }))
    }

    // Create the event
    const createdEvent = await client.createEvent('primary', event)

    logger.info('Created Google Calendar event', {
      userId: user.id,
      tenantId,
      eventId: createdEvent.id,
      summary: createdEvent.summary,
    })

    return createdResponse({ event: createdEvent })
  } catch (error) {
    logger.error('Error creating Google Calendar event:', { error })

    // Check if it's a Google API error (e.g., token revoked)
    const errorMessage = error instanceof Error ? error.message : 'Failed to create event'
    if (errorMessage.includes('401') || errorMessage.includes('invalid_grant')) {
      return errorResponse(new Error('Google Calendar access revoked. Please reconnect.'))
    }

    return errorResponse(error instanceof Error ? error : new Error('Failed to create event'))
  }
}
