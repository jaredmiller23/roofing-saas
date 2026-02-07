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

import { withAuth } from '@/lib/auth/with-auth'
import { getGoogleCalendarClient, GoogleCalendarEvent } from '@/lib/google/calendar-client'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import { NextRequest } from 'next/server'

export const GET = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
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
    const client = await getGoogleCalendarClient(userId, tenantId)
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
      userId,
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
      // Clean up the stale token so user can reconnect cleanly
      try {
        const supabase = await createClient()
        await supabase
          .from('google_calendar_tokens')
          .delete()
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
        logger.info('Deleted revoked Google Calendar token', { userId, tenantId })
      } catch (cleanupError) {
        logger.warn('Failed to clean up revoked token', { cleanupError })
      }

      return successResponse({
        connected: false,
        events: [],
        error: 'Google Calendar access revoked. Please reconnect.',
      })
    }

    return errorResponse(error instanceof Error ? error : new Error('Failed to fetch events'))
  }
})

/**
 * POST /api/calendar/google/events
 * Create a new event in Google Calendar
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
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
    const client = await getGoogleCalendarClient(userId, tenantId)
    if (!client) {
      return errorResponse(new Error('Google Calendar not connected. Please connect your Google Calendar first.'))
    }

    // Build the Google Calendar event object
    const isAllDay = body.allDay === true
    const timeZone = body.timeZone || 'America/New_York'

    let startField: GoogleCalendarEvent['start']
    let endField: GoogleCalendarEvent['end']

    if (isAllDay) {
      // All-day events: client sends raw YYYY-MM-DD dates
      // Google Calendar uses EXCLUSIVE end dates: an event on Feb 6
      // needs end.date = '2026-02-07' (the day AFTER the last day)
      const startDate = body.start.split('T')[0]
      const endDateRaw = body.end.split('T')[0]
      const endExclusive = new Date(endDateRaw + 'T12:00:00') // noon to avoid DST edge cases
      endExclusive.setDate(endExclusive.getDate() + 1)
      const endDate = endExclusive.toISOString().split('T')[0]

      startField = { date: startDate }
      endField = { date: endDate }
    } else {
      // Timed events: client sends UTC ISO strings with Z suffix
      startField = { dateTime: body.start, timeZone }
      endField = { dateTime: body.end, timeZone }
    }

    const event: GoogleCalendarEvent = {
      summary: body.summary,
      description: body.description || undefined,
      location: body.location || undefined,
      start: startField,
      end: endField,
    }

    // Add attendees if provided
    if (body.attendees && Array.isArray(body.attendees)) {
      event.attendees = body.attendees.map((email: string) => ({ email }))
    }

    // Create the event
    const createdEvent = await client.createEvent('primary', event)

    logger.info('Created Google Calendar event', {
      userId,
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
})
