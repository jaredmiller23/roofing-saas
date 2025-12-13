import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/settings/pipeline-stages
 * Get all pipeline stages for tenant
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    const { data: stages, error } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('stage_order', { ascending: true })

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse({ stages: stages || [] })
  } catch (error) {
    logger.error('Error fetching pipeline stages:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/settings/pipeline-stages
 * Create a new pipeline stage
 */
export async function POST(request: Request) {
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
    const {
      name,
      description,
      color,
      icon,
      stage_order,
      stage_type,
      win_probability,
      auto_actions,
      is_active,
      is_default
    } = body

    if (!name || stage_order === undefined) {
      throw ValidationError('Name and stage_order are required')
    }

    const supabase = await createClient()

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .insert({
        tenant_id: tenantId,
        name,
        description,
        color,
        icon,
        stage_order,
        stage_type,
        win_probability,
        auto_actions,
        is_active,
        is_default,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      throw InternalError(error.message)
    }

    return createdResponse({ stage })
  } catch (error) {
    logger.error('Error creating pipeline stage:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
