import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

/**
 * GET /api/events
 * List all events with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
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
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%`)
    }

    query = query
      .order('start_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: events, error, count } = await query

    if (error) {
      logger.error('Error fetching events:', { error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      events: events || [],
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    logger.error('Error in GET /api/events:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const body = await request.json()
    const supabase = await createClient()

    // Use organizer from body if provided, otherwise default to current user
    const organizer = body.organizer || user.id

    const { data, error } = await supabase
      .from('events')
      .insert({
        ...body,
        tenant_id: tenantId,
        created_by: user.id,
        organizer: organizer,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating event:', { error })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logger.error('Error in POST /api/events:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
