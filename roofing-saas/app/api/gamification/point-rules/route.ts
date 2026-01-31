/**
 * Point Rules API
 * CRUD operations for custom point-earning rules
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

/**
 * GET /api/gamification/point-rules
 * Fetch all point rules for the organization
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }

    // Fetch point rules
    const { data, error } = await supabase
      .from('point_rules')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('action_type', { ascending: true })

    if (error) {
      logger.error('Failed to fetch point rules', { error, tenantId })
      throw InternalError(error.message)
    }

    logger.info('Fetched point rules', { tenantId, count: data?.length || 0 })

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('Point rules GET error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/gamification/point-rules
 * Create a new point rule
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = pointRuleConfigSchema.safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    // Insert point rule
    const { data, error } = await supabase
      .from('point_rules')
      .insert({
        ...validated,
        tenant_id: tenantId,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create point rule', { error, tenantId, action_type: validated.action_type })

      // Handle unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('A point rule with this action type already exists')
      }

      throw InternalError(error.message)
    }

    logger.info('Created point rule', {
      tenantId,
      rule_id: data.id,
      action_type: data.action_type,
      points: data.points_value,
    })

    return createdResponse({ data, success: true })
  } catch (error) {
    logger.error('Point rules POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
