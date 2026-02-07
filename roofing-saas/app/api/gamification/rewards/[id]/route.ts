import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { NotFoundError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, noContentResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { rewardConfigSchema } from '@/lib/gamification/types'

/**
 * GET /api/gamification/rewards/[id]
 * Get a single reward config by ID
 */
export const GET = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reward_configs')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw NotFoundError('Reward')
      }
      logger.error('Error fetching reward config', { error })
      throw InternalError('Failed to fetch reward')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in GET /api/gamification/rewards/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/gamification/rewards/[id]
 * Update a reward config
 */
export const PATCH = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const body = await request.json()
    const validation = rewardConfigSchema.partial().safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const supabase = await createClient()

    // Verify the reward exists and belongs to tenant
    const { data: existing, error: fetchError } = await supabase
      .from('reward_configs')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !existing) {
      throw NotFoundError('Reward')
    }

    const { data, error } = await supabase
      .from('reward_configs')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Error updating reward config', { error })
      throw InternalError('Failed to update reward')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in PATCH /api/gamification/rewards/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/gamification/rewards/[id]
 * Delete a reward config
 */
export const DELETE = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('reward_configs')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Error deleting reward config', { error })
      throw InternalError('Failed to delete reward')
    }

    return noContentResponse()
  } catch (error) {
    logger.error('Error in DELETE /api/gamification/rewards/[id]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
