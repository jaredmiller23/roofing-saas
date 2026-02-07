import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/activities
 * Fetch activities with optional filters
 */
export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const projectId = searchParams.get('project_id')
    const contactId = searchParams.get('contact_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build query
    let query = supabase
      .from('activities')
      .select(`
        id,
        type,
        subject,
        content,
        created_at,
        created_by,
        project_id,
        contact_id
      `)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data: activities, error: fetchError } = await query

    if (fetchError) {
      logger.error('Error fetching activities', { error: fetchError })
      throw InternalError('Failed to fetch activities')
    }

    // Map to expected format for frontend compatibility
    const mappedActivities = (activities || []).map(activity => ({
      ...activity,
      notes: activity.content, // Alias content as notes for frontend
    }))

    return successResponse(mappedActivities)
  } catch (error) {
    logger.error('Error in GET /api/activities', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

const ALLOWED_TYPES = [
  'call', 'email', 'sms', 'note', 'meeting', 'door_knock', 'photo', 'task',
] as const

/**
 * POST /api/activities
 * Create a new activity (note, call log, etc.)
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const body = await request.json()
    const { type, subject, content, contact_id, project_id } = body

    if (!type || !ALLOWED_TYPES.includes(type)) {
      throw ValidationError(`Invalid activity type. Must be one of: ${ALLOWED_TYPES.join(', ')}`)
    }

    if (!content && !subject) {
      throw ValidationError('Either subject or content is required')
    }

    if (!contact_id && !project_id) {
      throw ValidationError('Either contact_id or project_id is required')
    }

    const supabase = await createClient()

    const { data: activity, error: insertError } = await supabase
      .from('activities')
      .insert({
        type,
        subject: subject || null,
        content: content || null,
        contact_id: contact_id || null,
        project_id: project_id || null,
        tenant_id: tenantId,
        created_by: userId,
        performed_by: userId,
      })
      .select('id, type, subject, content, created_at, created_by, project_id, contact_id')
      .single()

    if (insertError) {
      logger.error('Error creating activity', { error: insertError })
      throw InternalError('Failed to create activity')
    }

    return createdResponse({
      ...activity,
      notes: activity.content,
    })
  } catch (error) {
    logger.error('Error in POST /api/activities', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
