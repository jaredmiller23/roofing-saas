/**
 * Point Rules API
 * CRUD operations for custom point-earning rules
 */

import { createClient } from '@/lib/supabase/server'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'

/**
 * GET /api/gamification/point-rules
 * Fetch all point rules for the organization
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      throw ValidationError('Organization not found')
    }

    // Fetch point rules
    const { data, error } = await supabase
      .from('point_rules')
      .select('*')
      .eq('org_id', org_id)
      .order('category', { ascending: true })
      .order('action_name', { ascending: true })

    if (error) {
      logger.error('Failed to fetch point rules', { error, org_id })
      throw InternalError(error.message)
    }

    logger.info('Fetched point rules', { org_id, count: data?.length || 0 })

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
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      throw AuthenticationError()
    }

    const org_id = user.user_metadata?.org_id

    if (!org_id) {
      throw ValidationError('Organization not found')
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
        org_id,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      logger.error('Failed to create point rule', { error, org_id, action_type: validated.action_type })

      // Handle unique constraint violation
      if (error.code === '23505') {
        throw ConflictError('A point rule with this action type already exists')
      }

      throw InternalError(error.message)
    }

    logger.info('Created point rule', {
      org_id,
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
