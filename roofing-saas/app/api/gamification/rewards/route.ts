import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { rewardConfigSchema } from '@/lib/gamification/types'

/**
 * GET /api/gamification/rewards
 * List reward configs for the current tenant
 *
 * Query params:
 *   active - filter to active rewards only (default: all)
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

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabase
      .from('reward_configs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching reward configs', { error })
      throw InternalError('Failed to fetch rewards')
    }

    return successResponse(data || [])
  } catch (error) {
    logger.error('Error in GET /api/gamification/rewards', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/gamification/rewards
 * Create a new reward config
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
    const validation = rewardConfigSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('reward_configs')
      .insert({
        tenant_id: tenantId,
        name: validation.data.name,
        description: validation.data.description || null,
        reward_type: validation.data.reward_type,
        points_required: validation.data.points_required,
        reward_value: validation.data.reward_value,
        quantity_available: validation.data.quantity_available || null,
        quantity_claimed: 0,
        is_active: validation.data.is_active,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating reward config', { error })
      throw InternalError('Failed to create reward')
    }

    return createdResponse(data)
  } catch (error) {
    logger.error('Error in POST /api/gamification/rewards', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
