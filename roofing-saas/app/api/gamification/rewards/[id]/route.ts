/**
 * Reward by ID API
 */

import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { rewardConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenant_id = await getUserTenantId(user.id)

    if (!tenant_id) {
      throw ValidationError('Organization not found')
    }

    const body = await request.json()
    const validationResult = rewardConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('reward_configs')
      .update({ ...validated, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenant_id)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update reward', { error, tenant_id, reward_id: id })

      if (error.code === 'PGRST116') {
        throw NotFoundError('Reward not found')
      }

      throw InternalError(error.message)
    }

    logger.info('Updated reward', { tenant_id, reward_id: data.id })

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('Reward PATCH error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const tenant_id = await getUserTenantId(user.id)

    if (!tenant_id) {
      throw ValidationError('Organization not found')
    }

    const { error } = await supabase.from('reward_configs').delete().eq('id', id).eq('tenant_id', tenant_id)

    if (error) {
      logger.error('Failed to delete reward', { error, tenant_id, reward_id: id })
      throw InternalError(error.message)
    }

    logger.info('Deleted reward', { tenant_id, reward_id: id })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Reward DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
