import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { paginatedResponse, errorResponse, createdResponse } from '@/lib/api/response'

/**
 * GET /api/jobs
 * List all jobs with filtering and pagination
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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const jobType = searchParams.get('job_type')
    const status = searchParams.get('status')
    const projectId = searchParams.get('project_id')
    const crewLead = searchParams.get('crew_lead')
    const search = searchParams.get('search')

    const supabase = await createClient()
    let query = supabase
      .from('jobs')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (jobType) query = query.eq('job_type', jobType)
    if (status) query = query.eq('status', status)
    if (projectId) query = query.eq('project_id', projectId)
    if (crewLead) query = query.eq('crew_lead', crewLead)
    if (search) {
      query = query.or(`job_number.ilike.%${search}%,scope_of_work.ilike.%${search}%`)
    }

    query = query
      .order('scheduled_date', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1)

    const { data: jobs, error, count } = await query

    if (error) {
      logger.error('Error fetching jobs:', { error })
      throw InternalError(error.message)
    }

    return paginatedResponse(jobs || [], { page, limit, total: count || 0 })
  } catch (error) {
    logger.error('Error in GET /api/jobs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/jobs
 * Create a new job
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
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('jobs')
      .insert({
        ...body,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating job:', { error })
      throw InternalError(error.message)
    }

    return createdResponse(data)
  } catch (error) {
    logger.error('Error in POST /api/jobs:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
