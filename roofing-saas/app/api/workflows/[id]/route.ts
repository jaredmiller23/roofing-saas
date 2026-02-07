import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/workflows/[id]
 * Get a single workflow by ID
 */
export const GET = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch workflow with steps
    const { data: workflow, error } = await supabase
      .from('workflows')
      .select(`
        *,
        workflow_steps (*)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !workflow) {
      throw NotFoundError('Workflow not found')
    }

    return successResponse({ workflow })
  } catch (error) {
    logger.error('[API] Get workflow error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/workflows/[id]
 * Update a workflow
 */
export const PATCH = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Only allow updating specific fields
    const allowedFields = ['name', 'description', 'is_active', 'trigger_config']
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .update(updateData)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      logger.error('[API] Update workflow error:', { error })
      throw InternalError('Failed to update workflow')
    }

    if (!workflow) {
      throw NotFoundError('Workflow not found')
    }

    return successResponse({ workflow })
  } catch (error) {
    logger.error('[API] Update workflow error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/workflows/[id]
 * Soft delete a workflow
 */
export const DELETE = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('workflows')
      .update({
        is_deleted: true,
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .select()
      .single()

    if (error) {
      logger.error('[API] Delete workflow error:', { error })
      throw InternalError('Failed to delete workflow')
    }

    if (!data) {
      throw NotFoundError('Workflow not found')
    }

    return successResponse(null)
  } catch (error) {
    logger.error('[API] Delete workflow error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
