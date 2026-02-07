/**
 * Google Calendar Single Event Endpoint
 *
 * GET /api/calendar/google/events/[eventId]
 * Returns: { event: GoogleCalendarEvent }
 *
 * PATCH /api/calendar/google/events/[eventId]
 * Body: { summary?, description?, location?, start?, end?, allDay? }
 * Returns: { event: GoogleCalendarEvent }
 *
 * DELETE /api/calendar/google/events/[eventId]
 * Returns: { success: true }
 */

import { withAuthParams } from '@/lib/auth/with-auth'
import { getGoogleCalendarClient, GoogleCalendarEvent } from '@/lib/google/calendar-client'
import { logger } from '@/lib/logger'
import { ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { NextRequest } from 'next/server'

/**
 * GET /api/calendar/google/events/[eventId]
 * Get a single event from Google Calendar
 */
export const GET = withAuthParams(async (request: NextRequest, { userId, tenantId }, { params }) => {
  try {
    const { eventId } = await params

    if (!eventId) {
      throw ValidationError('Event ID is required')
    }

    // Get Google Calendar client
    const client = await getGoogleCalendarClient(userId, tenantId)
    if (!client) {
      return errorResponse(new Error('Google Calendar not connected'))
    }

    const event = await client.getEvent('primary', eventId)

    return successResponse({ event })
  } catch (error) {
    logger.error('Error fetching Google Calendar event:', { error })
    return errorResponse(error instanceof Error ? error : new Error('Failed to fetch event'))
  }
})

/**
 * PATCH /api/calendar/google/events/[eventId]
 * Update an event in Google Calendar
 */
export const PATCH = withAuthParams(async (request: NextRequest, { userId, tenantId }, { params }) => {
  try {
    const { eventId } = await params

    if (!eventId) {
      throw ValidationError('Event ID is required')
    }

    const body = await request.json()

    // Get Google Calendar client
    const client = await getGoogleCalendarClient(userId, tenantId)
    if (!client) {
      return errorResponse(new Error('Google Calendar not connected'))
    }

    // First get the existing event to merge with updates
    const existingEvent = await client.getEvent('primary', eventId)

    // Build the updated event object
    const isAllDay = body.allDay !== undefined ? body.allDay : !existingEvent.start.dateTime
    const updatedEvent: GoogleCalendarEvent = {
      summary: body.summary || existingEvent.summary,
      description: body.description !== undefined ? body.description : existingEvent.description,
      location: body.location !== undefined ? body.location : existingEvent.location,
      start: body.start
        ? isAllDay
          ? { date: body.start.split('T')[0] }
          : { dateTime: body.start, timeZone: body.timeZone || 'America/New_York' }
        : existingEvent.start,
      end: body.end
        ? isAllDay
          ? { date: body.end.split('T')[0] }
          : { dateTime: body.end, timeZone: body.timeZone || 'America/New_York' }
        : existingEvent.end,
    }

    // Update attendees if provided
    if (body.attendees !== undefined) {
      updatedEvent.attendees = Array.isArray(body.attendees)
        ? body.attendees.map((email: string) => ({ email }))
        : undefined
    }

    // Update the event
    const event = await client.updateEvent('primary', eventId, updatedEvent)

    logger.info('Updated Google Calendar event', {
      userId,
      tenantId,
      eventId,
    })

    return successResponse({ event })
  } catch (error) {
    logger.error('Error updating Google Calendar event:', { error })

    const errorMessage = error instanceof Error ? error.message : 'Failed to update event'
    if (errorMessage.includes('401') || errorMessage.includes('invalid_grant')) {
      return errorResponse(new Error('Google Calendar access revoked. Please reconnect.'))
    }

    return errorResponse(error instanceof Error ? error : new Error('Failed to update event'))
  }
})

/**
 * DELETE /api/calendar/google/events/[eventId]
 * Delete an event from Google Calendar
 */
export const DELETE = withAuthParams(async (request: NextRequest, { userId, tenantId }, { params }) => {
  try {
    const { eventId } = await params

    if (!eventId) {
      throw ValidationError('Event ID is required')
    }

    // Get Google Calendar client
    const client = await getGoogleCalendarClient(userId, tenantId)
    if (!client) {
      return errorResponse(new Error('Google Calendar not connected'))
    }

    // Delete the event
    await client.deleteEvent('primary', eventId)

    logger.info('Deleted Google Calendar event', {
      userId,
      tenantId,
      eventId,
    })

    return successResponse({ success: true, message: 'Event deleted successfully' })
  } catch (error) {
    logger.error('Error deleting Google Calendar event:', { error })

    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event'
    if (errorMessage.includes('401') || errorMessage.includes('invalid_grant')) {
      return errorResponse(new Error('Google Calendar access revoked. Please reconnect.'))
    }

    return errorResponse(error instanceof Error ? error : new Error('Failed to delete event'))
  }
})
