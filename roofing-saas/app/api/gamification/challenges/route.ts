/**
 * Challenges API
 * CRUD operations for time-limited competitions
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { challengeConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

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

    const { data, error } = await supabase
      .from('challenge_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false })

    if (error) {
      logger.error('Failed to fetch challenges', { error, tenantId })
      throw InternalError(error.message)
    }

    return successResponse(data || [])
  } catch (error) {
    logger.error('Challenges GET error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

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
    const validationResult = challengeConfigSchema.safeParse(body)

    if (!validationResult.success) {
      throw ValidationError(validationResult.error.issues[0].message)
    }

    const validated = validationResult.data
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('challenge_configs')
      .insert({
        tenant_id: tenantId,
        title: validated.title,
        description: validated.description || null,
        challenge_type: validated.challenge_type,
        goal_metric: validated.goal_metric,
        goal_value: validated.goal_value,
        start_date: typeof validated.start_date === 'string' ? validated.start_date : validated.start_date.toISOString(),
        end_date: typeof validated.end_date === 'string' ? validated.end_date : validated.end_date.toISOString(),
        reward_type: validated.reward_type || null,
        reward_points: validated.reward_points,
        reward_description: validated.reward_description || null,
        is_active: validated.is_active,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create challenge', { error, tenantId })
      throw InternalError(error.message)
    }

    logger.info('Created challenge', { tenantId, challenge_id: data.id, title: data.title })

    return createdResponse(data)
  } catch (error) {
    logger.error('Challenges POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
