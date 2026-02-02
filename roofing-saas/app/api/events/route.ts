import { NextRequest } from 'next/server'
import type { Database, Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { paginatedResponse, errorResponse, createdResponse } from '@/lib/api/response'
import { createEventSchema } from '@/lib/validations/event'

/**
 * GET /api/events
 * List all events with filtering and pagination
 */
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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10'))) // Max 100 per page
    const eventType = searchParams.get('event_type')
    const status = searchParams.get('status')
    const contactId = searchParams.get('contact_id')
    const projectId = searchParams.get('project_id')
    const jobId = searchParams.get('job_id')
    const search = searchParams.get('search')
    // Date range filtering for calendar views
    const startAfter = searchParams.get('start_after') // ISO date string - get events starting after this
    const endBefore = searchParams.get('end_before') // ISO date string - get events ending before this

    const supabase = await createClient()
    let query = supabase
      .from('events')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (eventType) query = query.eq('event_type', eventType)
    if (status) query = query.eq('status', status)
    if (contactId) query = query.eq('contact_id', contactId)
    if (projectId) query = query.eq('project_id', projectId)
    if (jobId) query = query.eq('job_id', jobId)
    if (search) {
      // Escape SQL wildcards to prevent unexpected matches
      const escapedSearch = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(`title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%,location.ilike.%${escapedSearch}%`)
    }
    // Date range filtering - events that overlap with the requested range
    // An event overlaps if it starts before the range ends AND ends after the range starts
    if (startAfter) {
      query = query.gte('end_at', startAfter) // Event ends after range start
    }
    if (endBefore) {
      query = query.lte('start_at', endBefore) // Event starts before range end
    }

    // When date range is specified, order by start time ascending (chronological)
    // Otherwise, order by start time descending (most recent first)
    const orderAscending = !!(startAfter || endBefore)
    query = query
      .order('start_at', { ascending: orderAscending })
      .range((page - 1) * limit, page * limit - 1)

    const { data: events, error, count } = await query

    if (error) {
      logger.error('Error fetching events:', { error })
      throw InternalError(error.message)
    }

    return paginatedResponse(events || [], { page, limit, total: count || 0 })
  } catch (error) {
    logger.error('Error in GET /api/events:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/events
 * Create a new event
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

    // Validate input - prevents clients from setting server-controlled fields
    const validationResult = createEventSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Event validation failed', { errors: validationResult.error.issues })
      throw ValidationError('Invalid event data', validationResult.error.issues)
    }
    const validatedData = validationResult.data

    const supabase = await createClient()

    // Use organizer from validated data if provided, otherwise default to current user
    const organizer = validatedData.organizer || user.id

    // external_attendees is not in the Zod schema but is a valid events column
    const externalAttendees = body.external_attendees ?? null
    const { data, error } = await supabase
      .from('events')
      .insert({
        ...validatedData,
        external_attendees: externalAttendees as Json | null,
        tenant_id: tenantId,
        created_by: user.id,
        organizer: organizer,
      } as unknown as Database['public']['Tables']['events']['Insert'])
      .select()
      .single()

    if (error) {
      logger.error('Error creating event:', { error })
      throw InternalError(error.message)
    }

    return createdResponse(data)
  } catch (error) {
    logger.error('Error in POST /api/events:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
