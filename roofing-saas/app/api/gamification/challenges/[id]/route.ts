/**
 * Challenge by ID API
 */

import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { challengeConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { NotFoundError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, noContentResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/gamification/challenges/[id]
 */
export const PATCH = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validationResult = challengeConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      throw ValidationError(validationResult.error.issues[0].message)
    }

    const validated = validationResult.data
    const supabase = await createClient()

    // Build explicit update payload to avoid type mismatches
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (validated.title !== undefined) updatePayload.title = validated.title
    if (validated.description !== undefined) updatePayload.description = validated.description
    if (validated.challenge_type !== undefined) updatePayload.challenge_type = validated.challenge_type
    if (validated.goal_metric !== undefined) updatePayload.goal_metric = validated.goal_metric
    if (validated.goal_value !== undefined) updatePayload.goal_value = validated.goal_value
    if (validated.start_date !== undefined) {
      updatePayload.start_date = typeof validated.start_date === 'string' ? validated.start_date : validated.start_date.toISOString()
    }
    if (validated.end_date !== undefined) {
      updatePayload.end_date = typeof validated.end_date === 'string' ? validated.end_date : validated.end_date.toISOString()
    }
    if (validated.reward_type !== undefined) updatePayload.reward_type = validated.reward_type
    if (validated.reward_points !== undefined) updatePayload.reward_points = validated.reward_points
    if (validated.reward_description !== undefined) updatePayload.reward_description = validated.reward_description
    if (validated.is_active !== undefined) updatePayload.is_active = validated.is_active

    const { data, error } = await supabase
      .from('challenge_configs')
      .update(updatePayload)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw NotFoundError('Challenge')
      }
      logger.error('Failed to update challenge', { error, tenantId, challenge_id: id })
      throw InternalError(error.message)
    }

    logger.info('Updated challenge', { tenantId, challenge_id: data.id })

    return successResponse(data)
  } catch (error) {
    logger.error('Challenge PATCH error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/gamification/challenges/[id]
 */
export const DELETE = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('challenge_configs')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete challenge', { error, tenantId, challenge_id: id })
      throw InternalError(error.message)
    }

    logger.info('Deleted challenge', { tenantId, challenge_id: id })

    return noContentResponse()
  } catch (error) {
    logger.error('Challenge DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
