/**
 * Rewards API
 * CRUD operations for reward catalog
 */

import { createClient } from '@/lib/supabase/server'
import { getUserTenantId } from '@/lib/auth/session'
import { rewardConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

export async function GET() {
  try {
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

    const { data, error } = await supabase
      .from('reward_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('points_required', { ascending: true })

    if (error) {
      logger.error('Failed to fetch rewards', { error, tenant_id })
      throw InternalError(error.message)
    }

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('Rewards GET error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

export async function POST(request: Request) {
  try {
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
    const validationResult = rewardConfigSchema.safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    const { data, error } = await supabase
      .from('reward_configs')
      .insert({ ...validated, tenant_id, created_by: user.id })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create reward', { error, tenant_id })

      if (error.code === '23505') {
        throw ConflictError('A reward with this name already exists')
      }

      throw InternalError(error.message)
    }

    logger.info('Created reward', { tenant_id, reward_id: data.id, name: data.name })

    return createdResponse({ data, success: true })
  } catch (error) {
    logger.error('Rewards POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
