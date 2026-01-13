import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
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

    query = query
      .order('start_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: events, error, count } = await query

    if (error) {
      logger.error('Error fetching events:', { error })
      throw InternalError(error.message)
    }

    return successResponse({
      events: events || [],
      total: count || 0,
      page,
      limit,
    })
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

    const { data, error } = await supabase
      .from('events')
      .insert({
        ...validatedData,
        tenant_id: tenantId,
        created_by: user.id,
        organizer: organizer,
      })
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
