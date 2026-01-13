import { z } from 'zod'

/**
 * Zod validation schemas for event data
 *
 * Security note: These schemas ensure clients cannot set server-controlled fields
 * like id, tenant_id, created_by, created_at, etc.
 */

// Event type enum
const eventTypeEnum = z.enum([
  'appointment',
  'inspection',
  'meeting',
  'follow_up',
  'site_visit',
  'adjuster_meeting',
  'callback',
  'other',
])

// Event status enum
const eventStatusEnum = z.enum([
  'scheduled',
  'confirmed',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled',
  'no_show',
])

// Outcome enum
const outcomeEnum = z.enum([
  'successful',
  'unsuccessful',
  'rescheduled',
  'no_show',
  'cancelled',
  '',
])

export const createEventSchema = z.object({
  // Required fields
  title: z.string().min(1, 'Event title is required').max(200),
  start_at: z.string().datetime({ message: 'Invalid start date/time' }),

  // Optional timing
  end_at: z.string().datetime().optional().nullable(),
  all_day: z.boolean().optional(),

  // Event details
  description: z.string().max(5000).optional().nullable(),
  event_type: eventTypeEnum.optional(),
  status: eventStatusEnum.optional(),

  // Location
  location: z.string().max(500).optional().nullable(),
  address_street: z.string().max(200).optional().nullable(),
  address_city: z.string().max(100).optional().nullable(),
  address_state: z.string().max(2).optional().nullable(),
  address_zip: z.string().max(10).optional().nullable(),

  // Related entities
  contact_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
  job_id: z.string().uuid().optional().nullable(),
  organizer: z.string().uuid().optional().nullable(),

  // Outcome (for completed events)
  outcome: outcomeEnum.optional().nullable(),
  outcome_notes: z.string().max(5000).optional().nullable(),

  // Reminders
  reminder_minutes: z.number().int().min(0).max(10080).optional(), // Max 1 week
})

export const updateEventSchema = createEventSchema.partial().extend({
  id: z.string().uuid(),
})

export const eventFiltersSchema = z.object({
  search: z.string().optional(),
  event_type: eventTypeEnum.optional(),
  status: eventStatusEnum.optional(),
  contact_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  job_id: z.string().uuid().optional(),
  start_from: z.string().datetime().optional(),
  start_to: z.string().datetime().optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(), // Max 100 per page
})

// Type exports
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type EventFilters = z.infer<typeof eventFiltersSchema>
