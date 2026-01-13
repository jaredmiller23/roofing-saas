/**
 * ARIA Calendar Functions - Phase 2: Calendar & Scheduling
 *
 * Provides ARIA with the ability to:
 * - Check availability and find open slots
 * - Book appointments to the events table
 * - Get schedule overview
 * - Reschedule existing appointments
 * - Cancel appointments with notifications
 */

import { ariaFunctionRegistry } from '../function-registry'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

// =============================================================================
// Helper: Parse natural language date/time
// =============================================================================

interface ParsedDateTime {
  date: Date
  success: boolean
  error?: string
}

function parseNaturalDateTime(input: string): ParsedDateTime {
  const lowerInput = input.toLowerCase().trim()
  const now = new Date()

  // Helper to set time
  const setTime = (date: Date, hours: number, minutes: number = 0) => {
    date.setHours(hours, minutes, 0, 0)
    return date
  }

  // Extract time from string (e.g., "at 2pm", "at 10:30am")
  const extractTime = (str: string): { hours: number; minutes: number } | null => {
    // Match "2pm", "2:30pm", "14:00"
    const timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (!timeMatch) return null

    let hours = parseInt(timeMatch[1])
    const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0
    const meridiem = timeMatch[3]?.toLowerCase()

    if (meridiem === 'pm' && hours < 12) hours += 12
    if (meridiem === 'am' && hours === 12) hours = 0

    return { hours, minutes }
  }

  // "today"
  if (lowerInput === 'today' || lowerInput.startsWith('today ')) {
    const time = extractTime(lowerInput) || { hours: 9, minutes: 0 }
    return { date: setTime(new Date(now), time.hours, time.minutes), success: true }
  }

  // "tomorrow"
  if (lowerInput === 'tomorrow' || lowerInput.startsWith('tomorrow ')) {
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const time = extractTime(lowerInput) || { hours: 9, minutes: 0 }
    return { date: setTime(tomorrow, time.hours, time.minutes), success: true }
  }

  // "next [day of week]"
  const dayMatch = lowerInput.match(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i)
  if (dayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const targetDay = days.indexOf(dayMatch[1].toLowerCase())
    const date = new Date(now)
    const currentDay = date.getDay()
    const daysUntil = (targetDay - currentDay + 7) % 7 || 7
    date.setDate(date.getDate() + daysUntil)
    const time = extractTime(lowerInput) || { hours: 9, minutes: 0 }
    return { date: setTime(date, time.hours, time.minutes), success: true }
  }

  // "in X minutes/hours/days"
  const inMatch = lowerInput.match(/in (\d+)\s*(minute|hour|day)s?/i)
  if (inMatch) {
    const amount = parseInt(inMatch[1])
    const unit = inMatch[2].toLowerCase()
    const date = new Date(now)
    if (unit === 'minute') date.setMinutes(date.getMinutes() + amount)
    else if (unit === 'hour') date.setHours(date.getHours() + amount)
    else if (unit === 'day') date.setDate(date.getDate() + amount)
    return { date, success: true }
  }

  // "this week" / "next week"
  if (lowerInput.includes('this week')) {
    const time = extractTime(lowerInput) || { hours: 9, minutes: 0 }
    return { date: setTime(new Date(now), time.hours, time.minutes), success: true }
  }

  if (lowerInput.includes('next week')) {
    const date = new Date(now)
    date.setDate(date.getDate() + 7)
    const time = extractTime(lowerInput) || { hours: 9, minutes: 0 }
    return { date: setTime(date, time.hours, time.minutes), success: true }
  }

  // Try ISO date parsing
  const isoDate = new Date(input)
  if (!isNaN(isoDate.getTime())) {
    return { date: isoDate, success: true }
  }

  // Try month day format (e.g., "January 15", "Jan 15 at 2pm")
  const monthDayMatch = lowerInput.match(
    /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?/i
  )
  if (monthDayMatch) {
    const months: Record<string, number> = {
      jan: 0, january: 0,
      feb: 1, february: 1,
      mar: 2, march: 2,
      apr: 3, april: 3,
      may: 4,
      jun: 5, june: 5,
      jul: 6, july: 6,
      aug: 7, august: 7,
      sep: 8, september: 8,
      oct: 9, october: 9,
      nov: 10, november: 10,
      dec: 11, december: 11,
    }
    const month = months[monthDayMatch[1].toLowerCase()]
    const day = parseInt(monthDayMatch[2])
    const date = new Date(now.getFullYear(), month, day)
    // If date is in the past, assume next year
    if (date < now) date.setFullYear(date.getFullYear() + 1)
    const time = extractTime(lowerInput) || { hours: 9, minutes: 0 }
    return { date: setTime(date, time.hours, time.minutes), success: true }
  }

  return {
    date: now,
    success: false,
    error: `Could not parse date: "${input}". Try formats like "tomorrow at 2pm", "January 15 at 10am", or "next Monday".`,
  }
}

// =============================================================================
// Helper: Check for event conflicts
// =============================================================================

interface ConflictCheck {
  hasConflict: boolean
  conflicts: Array<{
    id: string
    title: string
    start_at: string
    end_at: string | null
  }>
}

async function checkEventConflicts(
  supabase: SupabaseClient,
  tenantId: string,
  startAt: Date,
  endAt: Date,
  excludeEventId?: string
): Promise<ConflictCheck> {
  // Find events that overlap with the proposed time
  let query = supabase
    .from('events')
    .select('id, title, start_at, end_at')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .not('status', 'in', '("cancelled","completed")')
    // Event overlaps if: existing.start < proposed.end AND existing.end > proposed.start
    .lt('start_at', endAt.toISOString())
    .or(`end_at.gt.${startAt.toISOString()},end_at.is.null`)

  if (excludeEventId) {
    query = query.neq('id', excludeEventId)
  }

  const { data, error } = await query

  if (error) {
    logger.error('[Calendar] Error checking conflicts:', { error })
    return { hasConflict: false, conflicts: [] }
  }

  return {
    hasConflict: (data?.length ?? 0) > 0,
    conflicts: data || [],
  }
}

// =============================================================================
// check_availability - Find if a specific time is available
// =============================================================================

ariaFunctionRegistry.register({
  name: 'check_availability',
  category: 'calendar',
  description: 'Check if a specific date/time is available for scheduling',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'check_availability',
    description: 'Check if a specific date/time is available for scheduling. Returns whether the slot is free and any conflicts.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date/time to check (e.g., "tomorrow at 2pm", "January 15 at 10am")',
        },
        duration_minutes: {
          type: 'number',
          description: 'Duration of the appointment in minutes (default: 60)',
        },
      },
      required: ['date'],
    },
  },
  execute: async (args, context) => {
    const { date, duration_minutes = 60 } = args as {
      date: string
      duration_minutes?: number
    }

    const parsed = parseNaturalDateTime(date)
    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const startAt = parsed.date
    const endAt = new Date(startAt.getTime() + duration_minutes * 60 * 1000)

    const { hasConflict, conflicts } = await checkEventConflicts(
      context.supabase,
      context.tenantId,
      startAt,
      endAt
    )

    const dateStr = startAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const timeStr = startAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    if (hasConflict) {
      const conflictList = conflicts
        .map((c) => `• ${c.title} at ${new Date(c.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
        .join('\n')

      return {
        success: true,
        data: { available: false, conflicts },
        message: `${dateStr} at ${timeStr} is NOT available. Conflicts:\n${conflictList}`,
      }
    }

    return {
      success: true,
      data: { available: true, date: startAt.toISOString() },
      message: `${dateStr} at ${timeStr} is available for a ${duration_minutes}-minute appointment.`,
    }
  },
})

// =============================================================================
// get_schedule - Get upcoming events/appointments
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_schedule',
  category: 'calendar',
  description: 'Get the schedule of upcoming events and appointments',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_schedule',
    description: 'Get upcoming events and appointments. Can filter by date range, contact, or project.',
    parameters: {
      type: 'object',
      properties: {
        range: {
          type: 'string',
          enum: ['today', 'tomorrow', 'this_week', 'next_week', 'custom'],
          description: 'Time range to get schedule for',
        },
        start_date: {
          type: 'string',
          description: 'Custom start date (required if range is "custom")',
        },
        end_date: {
          type: 'string',
          description: 'Custom end date (required if range is "custom")',
        },
        contact_id: {
          type: 'string',
          description: 'Filter by contact ID',
        },
        project_id: {
          type: 'string',
          description: 'Filter by project ID',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of events to return (default: 10)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    const {
      range = 'this_week',
      start_date,
      end_date,
      contact_id,
      project_id,
      limit = 10,
    } = args as {
      range?: string
      start_date?: string
      end_date?: string
      contact_id?: string
      project_id?: string
      limit?: number
    }

    const now = new Date()
    let startAt: Date
    let endAt: Date

    switch (range) {
      case 'today':
        startAt = new Date(now)
        startAt.setHours(0, 0, 0, 0)
        endAt = new Date(now)
        endAt.setHours(23, 59, 59, 999)
        break
      case 'tomorrow':
        startAt = new Date(now)
        startAt.setDate(startAt.getDate() + 1)
        startAt.setHours(0, 0, 0, 0)
        endAt = new Date(startAt)
        endAt.setHours(23, 59, 59, 999)
        break
      case 'this_week':
        startAt = new Date(now)
        startAt.setHours(0, 0, 0, 0)
        endAt = new Date(now)
        endAt.setDate(endAt.getDate() + (7 - endAt.getDay())) // End of week (Saturday)
        endAt.setHours(23, 59, 59, 999)
        break
      case 'next_week':
        startAt = new Date(now)
        startAt.setDate(startAt.getDate() + (7 - startAt.getDay() + 1)) // Next Sunday
        startAt.setHours(0, 0, 0, 0)
        endAt = new Date(startAt)
        endAt.setDate(endAt.getDate() + 6)
        endAt.setHours(23, 59, 59, 999)
        break
      case 'custom':
        if (!start_date || !end_date) {
          return { success: false, error: 'Custom range requires start_date and end_date' }
        }
        const parsedStart = parseNaturalDateTime(start_date)
        const parsedEnd = parseNaturalDateTime(end_date)
        if (!parsedStart.success) return { success: false, error: parsedStart.error }
        if (!parsedEnd.success) return { success: false, error: parsedEnd.error }
        startAt = parsedStart.date
        endAt = parsedEnd.date
        break
      default:
        startAt = new Date(now)
        endAt = new Date(now)
        endAt.setDate(endAt.getDate() + 7)
    }

    let query = context.supabase
      .from('events')
      .select(`
        id,
        title,
        start_at,
        end_at,
        event_type,
        status,
        location,
        contact_id,
        project_id,
        description
      `)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .gte('start_at', startAt.toISOString())
      .lte('start_at', endAt.toISOString())
      .not('status', 'eq', 'cancelled')
      .order('start_at', { ascending: true })
      .limit(limit)

    // Apply filters
    const finalContactId = contact_id || context.contact?.id
    const finalProjectId = project_id || context.project?.id
    if (finalContactId) query = query.eq('contact_id', finalContactId)
    if (finalProjectId) query = query.eq('project_id', finalProjectId)

    const { data: events, error } = await query

    if (error) {
      logger.error('[Calendar] Error fetching schedule:', { error })
      return { success: false, error: error.message }
    }

    if (!events || events.length === 0) {
      const rangeLabel = range === 'today' ? 'today' : range === 'tomorrow' ? 'tomorrow' : 'this period'
      return {
        success: true,
        data: { events: [] },
        message: `No events scheduled for ${rangeLabel}.`,
      }
    }

    // Format for message
    const formatEvent = (e: typeof events[0]) => {
      const date = new Date(e.start_at)
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      const type = e.event_type ? `[${e.event_type}]` : ''
      const loc = e.location ? ` @ ${e.location}` : ''
      return `• ${dateStr} ${timeStr}: ${e.title} ${type}${loc}`
    }

    const rangeLabel = range === 'today' ? 'Today' : range === 'tomorrow' ? 'Tomorrow' : 'Schedule'
    const message = `${rangeLabel} (${events.length} event${events.length > 1 ? 's' : ''}):\n${events.map(formatEvent).join('\n')}`

    return {
      success: true,
      data: { events },
      message,
    }
  },
})

// =============================================================================
// book_appointment_v2 - Create event in events table (replaces activities-based)
// =============================================================================

ariaFunctionRegistry.register({
  name: 'book_appointment_v2',
  category: 'calendar',
  description: 'Schedule an appointment or meeting in the calendar',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'book_appointment_v2',
    description: 'Schedule an appointment, inspection, meeting, or site visit. Creates an event in the calendar.',
    parameters: {
      type: 'object',
      properties: {
        contact_id: {
          type: 'string',
          description: 'Contact ID for the appointment',
        },
        project_id: {
          type: 'string',
          description: 'Related project ID (optional)',
        },
        title: {
          type: 'string',
          description: 'Appointment title (e.g., "Roof Inspection", "Estimate Review")',
        },
        date: {
          type: 'string',
          description: 'Date/time for the appointment (e.g., "tomorrow at 2pm", "January 15 at 10am")',
        },
        duration_minutes: {
          type: 'number',
          description: 'Appointment duration in minutes (default: 60)',
        },
        location: {
          type: 'string',
          description: 'Location or address for the appointment',
        },
        notes: {
          type: 'string',
          description: 'Any notes or details about the appointment',
        },
        event_type: {
          type: 'string',
          enum: ['inspection', 'appointment', 'meeting', 'site_visit', 'follow_up', 'adjuster_meeting', 'callback', 'other'],
          description: 'Type of appointment',
        },
        check_conflicts: {
          type: 'boolean',
          description: 'Check for scheduling conflicts before booking (default: true)',
        },
      },
      required: ['title', 'date'],
    },
  },
  execute: async (args, context) => {
    const {
      contact_id,
      project_id,
      title,
      date,
      duration_minutes = 60,
      location,
      notes,
      event_type = 'appointment',
      check_conflicts = true,
    } = args as {
      contact_id?: string
      project_id?: string
      title: string
      date: string
      duration_minutes?: number
      location?: string
      notes?: string
      event_type?: string
      check_conflicts?: boolean
    }

    const finalContactId = contact_id || context.contact?.id
    const finalProjectId = project_id || context.project?.id

    // Parse the date
    const parsed = parseNaturalDateTime(date)
    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    const startAt = parsed.date
    const endAt = new Date(startAt.getTime() + duration_minutes * 60 * 1000)

    // Check for conflicts if requested
    if (check_conflicts) {
      const { hasConflict, conflicts } = await checkEventConflicts(
        context.supabase,
        context.tenantId,
        startAt,
        endAt
      )

      if (hasConflict) {
        const conflictList = conflicts
          .map((c) => `• ${c.title} at ${new Date(c.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
          .join('\n')

        return {
          success: false,
          error: `Scheduling conflict detected:\n${conflictList}\n\nPlease choose a different time.`,
        }
      }
    }

    // Get contact address if location not provided
    let finalLocation = location
    if (!finalLocation && finalContactId) {
      const { data: contact } = await context.supabase
        .from('contacts')
        .select('address, city, state')
        .eq('id', finalContactId)
        .single()

      if (contact?.address) {
        finalLocation = [contact.address, contact.city, contact.state].filter(Boolean).join(', ')
      }
    }

    // Create the event
    const { data, error } = await context.supabase
      .from('events')
      .insert({
        tenant_id: context.tenantId,
        title,
        start_at: startAt.toISOString(),
        end_at: endAt.toISOString(),
        event_type,
        status: 'scheduled',
        location: finalLocation,
        description: notes,
        contact_id: finalContactId,
        project_id: finalProjectId,
        organizer: context.userId,
        created_by: context.userId,
      })
      .select()
      .single()

    if (error) {
      logger.error('[Calendar] Error creating event:', { error })
      return { success: false, error: error.message }
    }

    const dateStr = startAt.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    const timeStr = startAt.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    return {
      success: true,
      data,
      message: `Appointment booked: "${title}" on ${dateStr} at ${timeStr}${finalLocation ? ` at ${finalLocation}` : ''}.`,
    }
  },
})

// =============================================================================
// reschedule_appointment - Move an existing event to a new time
// =============================================================================

ariaFunctionRegistry.register({
  name: 'reschedule_appointment',
  category: 'calendar',
  description: 'Reschedule an existing appointment to a new date/time',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'reschedule_appointment',
    description: 'Move an existing appointment to a new date/time',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The event ID to reschedule',
        },
        new_date: {
          type: 'string',
          description: 'New date/time (e.g., "tomorrow at 2pm", "next Monday")',
        },
        reason: {
          type: 'string',
          description: 'Reason for rescheduling',
        },
      },
      required: ['event_id', 'new_date'],
    },
  },
  execute: async (args, context) => {
    const { event_id, new_date, reason } = args as {
      event_id: string
      new_date: string
      reason?: string
    }

    // Fetch the existing event
    const { data: existingEvent, error: fetchError } = await context.supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !existingEvent) {
      return { success: false, error: 'Event not found' }
    }

    if (existingEvent.status === 'cancelled') {
      return { success: false, error: 'Cannot reschedule a cancelled event' }
    }

    if (existingEvent.status === 'completed') {
      return { success: false, error: 'Cannot reschedule a completed event' }
    }

    // Parse new date
    const parsed = parseNaturalDateTime(new_date)
    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    // Calculate duration from existing event
    const originalStart = new Date(existingEvent.start_at)
    const originalEnd = existingEvent.end_at ? new Date(existingEvent.end_at) : new Date(originalStart.getTime() + 60 * 60 * 1000)
    const durationMs = originalEnd.getTime() - originalStart.getTime()

    const newStartAt = parsed.date
    const newEndAt = new Date(newStartAt.getTime() + durationMs)

    // Check for conflicts
    const { hasConflict, conflicts } = await checkEventConflicts(
      context.supabase,
      context.tenantId,
      newStartAt,
      newEndAt,
      event_id
    )

    if (hasConflict) {
      const conflictList = conflicts
        .map((c) => `• ${c.title} at ${new Date(c.start_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
        .join('\n')

      return {
        success: false,
        error: `New time has conflicts:\n${conflictList}\n\nPlease choose a different time.`,
      }
    }

    // Update the event
    const { data, error: updateError } = await context.supabase
      .from('events')
      .update({
        start_at: newStartAt.toISOString(),
        end_at: newEndAt.toISOString(),
        status: 'rescheduled',
        updated_at: new Date().toISOString(),
        // Store reschedule history in metadata if needed
      })
      .eq('id', event_id)
      .select()
      .single()

    if (updateError) {
      logger.error('[Calendar] Error rescheduling event:', { error: updateError })
      return { success: false, error: updateError.message }
    }

    // Log the reschedule as an activity if there's a contact
    if (existingEvent.contact_id) {
      await context.supabase.from('activities').insert({
        tenant_id: context.tenantId,
        contact_id: existingEvent.contact_id,
        project_id: existingEvent.project_id,
        type: 'status_change',
        subject: 'Appointment Rescheduled',
        content: `"${existingEvent.title}" rescheduled from ${originalStart.toLocaleString()} to ${newStartAt.toLocaleString()}${reason ? `. Reason: ${reason}` : ''}`,
        created_by: context.userId,
        metadata: {
          event_id,
          original_time: originalStart.toISOString(),
          new_time: newStartAt.toISOString(),
          reason,
          via: 'aria',
        },
      })
    }

    const oldDateStr = originalStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const oldTimeStr = originalStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const newDateStr = newStartAt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    const newTimeStr = newStartAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    return {
      success: true,
      data,
      message: `Rescheduled "${existingEvent.title}" from ${oldDateStr} ${oldTimeStr} to ${newDateStr} ${newTimeStr}.`,
    }
  },
})

// =============================================================================
// cancel_appointment - Cancel an existing event
// =============================================================================

ariaFunctionRegistry.register({
  name: 'cancel_appointment',
  category: 'calendar',
  description: 'Cancel an existing appointment',
  riskLevel: 'medium',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'cancel_appointment',
    description: 'Cancel an existing appointment or event',
    parameters: {
      type: 'object',
      properties: {
        event_id: {
          type: 'string',
          description: 'The event ID to cancel',
        },
        reason: {
          type: 'string',
          description: 'Reason for cancellation',
        },
        notify_contact: {
          type: 'boolean',
          description: 'Whether to queue a notification to the contact (default: false)',
        },
      },
      required: ['event_id'],
    },
  },
  execute: async (args, context) => {
    const { event_id, reason, notify_contact = false } = args as {
      event_id: string
      reason?: string
      notify_contact?: boolean
    }

    // Fetch the existing event
    const { data: existingEvent, error: fetchError } = await context.supabase
      .from('events')
      .select('*')
      .eq('id', event_id)
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !existingEvent) {
      return { success: false, error: 'Event not found' }
    }

    if (existingEvent.status === 'cancelled') {
      return { success: false, error: 'Event is already cancelled' }
    }

    if (existingEvent.status === 'completed') {
      return { success: false, error: 'Cannot cancel a completed event' }
    }

    // Update the event status
    const { data, error: updateError } = await context.supabase
      .from('events')
      .update({
        status: 'cancelled',
        outcome: 'cancelled',
        outcome_notes: reason || 'Cancelled via ARIA',
        updated_at: new Date().toISOString(),
      })
      .eq('id', event_id)
      .select()
      .single()

    if (updateError) {
      logger.error('[Calendar] Error cancelling event:', { error: updateError })
      return { success: false, error: updateError.message }
    }

    // Log the cancellation as an activity
    if (existingEvent.contact_id) {
      await context.supabase.from('activities').insert({
        tenant_id: context.tenantId,
        contact_id: existingEvent.contact_id,
        project_id: existingEvent.project_id,
        type: 'status_change',
        subject: 'Appointment Cancelled',
        content: `"${existingEvent.title}" scheduled for ${new Date(existingEvent.start_at).toLocaleString()} was cancelled${reason ? `. Reason: ${reason}` : ''}`,
        created_by: context.userId,
        metadata: {
          event_id,
          cancelled_time: existingEvent.start_at,
          reason,
          via: 'aria',
        },
      })
    }

    // Queue notification if requested (placeholder - would integrate with SMS/email)
    if (notify_contact && existingEvent.contact_id) {
      // TODO: Queue SMS/email notification
      logger.info('[Calendar] Notification queued for cancellation', {
        event_id,
        contact_id: existingEvent.contact_id,
      })
    }

    const dateStr = new Date(existingEvent.start_at).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    const timeStr = new Date(existingEvent.start_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })

    return {
      success: true,
      data,
      message: `Cancelled "${existingEvent.title}" (was scheduled for ${dateStr} at ${timeStr}).${reason ? ` Reason: ${reason}` : ''}`,
    }
  },
})

// =============================================================================
// find_available_slots - Find open time slots
// =============================================================================

ariaFunctionRegistry.register({
  name: 'find_available_slots',
  category: 'calendar',
  description: 'Find available time slots for scheduling',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'find_available_slots',
    description: 'Find available time slots for scheduling an appointment. Returns a list of open slots.',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to find slots for (e.g., "tomorrow", "next Monday")',
        },
        duration_minutes: {
          type: 'number',
          description: 'Required appointment duration in minutes (default: 60)',
        },
        start_hour: {
          type: 'number',
          description: 'Earliest hour to consider (24h format, default: 8)',
        },
        end_hour: {
          type: 'number',
          description: 'Latest hour to consider (24h format, default: 17)',
        },
        max_slots: {
          type: 'number',
          description: 'Maximum number of slots to return (default: 5)',
        },
      },
      required: ['date'],
    },
  },
  execute: async (args, context) => {
    const {
      date,
      duration_minutes = 60,
      start_hour = 8,
      end_hour = 17,
      max_slots = 5,
    } = args as {
      date: string
      duration_minutes?: number
      start_hour?: number
      end_hour?: number
      max_slots?: number
    }

    const parsed = parseNaturalDateTime(date)
    if (!parsed.success) {
      return { success: false, error: parsed.error }
    }

    // Set to start of business day
    const searchDate = new Date(parsed.date)
    searchDate.setHours(start_hour, 0, 0, 0)
    const dayStart = new Date(searchDate)
    const dayEnd = new Date(searchDate)
    dayEnd.setHours(end_hour, 0, 0, 0)

    // Get all events for that day
    const { data: events, error } = await context.supabase
      .from('events')
      .select('id, title, start_at, end_at')
      .eq('tenant_id', context.tenantId)
      .eq('is_deleted', false)
      .not('status', 'in', '("cancelled")')
      .gte('start_at', dayStart.toISOString())
      .lt('start_at', dayEnd.toISOString())
      .order('start_at', { ascending: true })

    if (error) {
      logger.error('[Calendar] Error finding available slots:', { error })
      return { success: false, error: error.message }
    }

    // Find gaps between events
    const slots: Array<{ start: Date; end: Date }> = []
    let currentTime = dayStart

    for (const event of events || []) {
      const eventStart = new Date(event.start_at)
      const eventEnd = event.end_at ? new Date(event.end_at) : new Date(eventStart.getTime() + 60 * 60 * 1000)

      // Check if there's a gap before this event
      if (eventStart.getTime() - currentTime.getTime() >= duration_minutes * 60 * 1000) {
        // There's enough time for an appointment
        slots.push({
          start: new Date(currentTime),
          end: new Date(eventStart),
        })
      }

      // Move current time to after this event
      if (eventEnd > currentTime) {
        currentTime = eventEnd
      }
    }

    // Check if there's time after the last event
    if (dayEnd.getTime() - currentTime.getTime() >= duration_minutes * 60 * 1000) {
      slots.push({
        start: new Date(currentTime),
        end: new Date(dayEnd),
      })
    }

    // Convert gaps to specific slot suggestions
    const suggestedSlots: string[] = []
    for (const slot of slots) {
      let slotTime = new Date(slot.start)
      while (
        slotTime.getTime() + duration_minutes * 60 * 1000 <= slot.end.getTime() &&
        suggestedSlots.length < max_slots
      ) {
        suggestedSlots.push(slotTime.toISOString())
        slotTime = new Date(slotTime.getTime() + 30 * 60 * 1000) // 30-min increments
      }
      if (suggestedSlots.length >= max_slots) break
    }

    if (suggestedSlots.length === 0) {
      const dateStr = searchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
      return {
        success: true,
        data: { slots: [] },
        message: `No available ${duration_minutes}-minute slots on ${dateStr} between ${start_hour}:00 and ${end_hour}:00.`,
      }
    }

    const dateStr = searchDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const slotList = suggestedSlots
      .map((s) => `• ${new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`)
      .join('\n')

    return {
      success: true,
      data: {
        date: searchDate.toISOString(),
        slots: suggestedSlots,
        duration_minutes,
      },
      message: `Available ${duration_minutes}-minute slots on ${dateStr}:\n${slotList}`,
    }
  },
})

// Export for use in tests
export { parseNaturalDateTime, checkEventConflicts }
