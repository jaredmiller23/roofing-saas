import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/settings/pipeline-stages/[id]
 * Update a pipeline stage
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .update({
        name: body.name,
        description: body.description,
        color: body.color,
        icon: body.icon,
        stage_order: body.stage_order,
        stage_type: body.stage_type,
        win_probability: body.win_probability,
        auto_actions: body.auto_actions,
        is_active: body.is_active,
        is_default: body.is_default
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      throw InternalError(error.message)
    }

    if (!stage) {
      throw NotFoundError('Stage not found')
    }

    return successResponse({ stage })
  } catch (error) {
    logger.error('Error updating pipeline stage:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/settings/pipeline-stages/[id]
 * Delete a pipeline stage
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('pipeline_stages')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      throw InternalError(error.message)
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error deleting pipeline stage:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
