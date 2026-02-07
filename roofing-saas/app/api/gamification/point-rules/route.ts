/**
 * Point Rules API
 * CRUD operations for custom point-earning rules
 */

import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

/**
 * GET /api/gamification/point-rules
 * Fetch all point rules for the organization
 */
export const GET = withAuth(async (request, { tenantId }) => {
  try {
    const supabase = await createClient()

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

    return successResponse(data)
  } catch (error) {
    logger.error('Point rules GET error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/gamification/point-rules
 * Create a new point rule
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

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
        created_by: userId,
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

    return createdResponse(data)
  } catch (error) {
    logger.error('Point rules POST error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
