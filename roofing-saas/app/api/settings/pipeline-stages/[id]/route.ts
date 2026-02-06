import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/settings/pipeline-stages/[id]
 * Update a pipeline stage's display properties.
 * Only updates fields explicitly provided in the request body.
 */
export const PATCH = withAuthParams(async (
  request,
  { tenantId },
  { params }
) => {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = await createClient()

    // Prevent changing stage_key (immutable link to enum)
    if (body.stage_key !== undefined) {
      throw ValidationError('stage_key cannot be modified')
    }

    // Build update object with only provided fields
    const allowedFields = [
      'name', 'description', 'color', 'icon',
      'stage_order', 'stage_type', 'win_probability'
    ] as const

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      throw ValidationError('No valid fields to update')
    }

    // Validate stage_type if provided
    if (updateData.stage_type && !['active', 'won', 'lost'].includes(updateData.stage_type as string)) {
      throw ValidationError('stage_type must be active, won, or lost')
    }

    // Validate win_probability if provided
    if (updateData.win_probability !== undefined) {
      const prob = updateData.win_probability as number
      if (prob < 0 || prob > 100) {
        throw ValidationError('win_probability must be between 0 and 100')
      }
    }

    const { data: stage, error } = await supabase
      .from('pipeline_stages')
      .update(updateData)
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

    return successResponse(stage)
  } catch (error) {
    logger.error('Error updating pipeline stage:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/settings/pipeline-stages/[id]
 * Core pipeline stages cannot be deleted (they are tied to the PostgreSQL enum).
 */
export async function DELETE() {
  return errorResponse(
    ValidationError('Core pipeline stages cannot be deleted.')
  )
}
