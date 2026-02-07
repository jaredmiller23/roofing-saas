import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { paginatedResponse, createdResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/call-logs
 * List all call logs with filtering and pagination
 */
export const GET = withAuth(async (request: NextRequest, { tenantId }) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const direction = searchParams.get('direction')
    const outcome = searchParams.get('outcome')
    const disposition = searchParams.get('disposition')
    const contactId = searchParams.get('contact_id')
    const projectId = searchParams.get('project_id')
    const filterUserId = searchParams.get('user_id')
    const search = searchParams.get('search')

    const supabase = await createClient()
    let query = supabase
      .from('call_logs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (direction) query = query.eq('direction', direction)
    if (outcome) query = query.eq('outcome', outcome)
    if (disposition) query = query.eq('disposition', disposition)
    if (contactId) query = query.eq('contact_id', contactId)
    if (projectId) query = query.eq('project_id', projectId)
    if (filterUserId) query = query.eq('user_id', filterUserId)
    if (search) {
      // Escape special PostgREST filter characters and SQL wildcards
      const sanitized = search
        .replace(/[%_\\]/g, '\\$&')
        .replace(/[(),."']/g, '')
      query = query.or(`phone_number.ilike.%${sanitized}%,notes.ilike.%${sanitized}%`)
    }

    query = query
      .order('started_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: calls, error, count } = await query

    if (error) {
      logger.error('Error fetching call logs:', { error })
      throw InternalError(error.message)
    }

    return paginatedResponse(calls || [], { page, limit, total: count || 0 })
  } catch (error) {
    logger.error('Error in GET /api/call-logs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/call-logs
 * Create a new call log
 */
export const POST = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const body = await request.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('call_logs')
      .insert({
        ...body,
        tenant_id: tenantId,
        user_id: userId,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating call log:', { error })
      throw InternalError(error.message)
    }

    return createdResponse(data)
  } catch (error) {
    logger.error('Error in POST /api/call-logs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
