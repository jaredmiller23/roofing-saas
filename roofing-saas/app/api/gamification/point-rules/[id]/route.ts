/**
 * Point Rule by ID API
 * Update and delete operations for specific point rule
 */

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

/**
 * PATCH /api/gamification/point-rules/[id]
 * Update a point rule
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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
    const validationResult = pointRuleConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    // Update point rule (RLS ensures tenantId isolation)
    const { data, error } = await supabase
      .from('point_rules')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenantId', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update point rule', { error, tenantId, rule_id: id })

      if (error.code === 'PGRST116') {
        throw NotFoundError('Point rule not found')
      }

      throw InternalError(error.message)
    }

    logger.info('Updated point rule', {
      tenantId,
      rule_id: data.id,
      action_type: data.action_type,
    })

    return successResponse({ data, success: true })
  } catch (error) {
    logger.error('Point rule PATCH error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/gamification/point-rules/[id]
 * Delete a point rule
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
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

    // Delete point rule (RLS ensures tenantId isolation)
    const { error } = await supabase
      .from('point_rules')
      .delete()
      .eq('id', id)
      .eq('tenantId', tenantId)

    if (error) {
      logger.error('Failed to delete point rule', { error, tenantId, rule_id: id })
      throw InternalError(error.message)
    }

    logger.info('Deleted point rule', { tenantId, rule_id: id })

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Point rule DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
