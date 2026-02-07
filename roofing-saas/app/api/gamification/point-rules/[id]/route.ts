/**
 * Point Rule by ID API
 * Update and delete operations for specific point rule
 */

import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { pointRuleConfigSchema } from '@/lib/gamification/types'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * PATCH /api/gamification/point-rules/[id]
 * Update a point rule
 */
export const PATCH = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Parse and validate request body
    const body = await request.json()
    const validationResult = pointRuleConfigSchema.partial().safeParse(body)

    if (!validationResult.success) {
      throw ValidationError('Validation failed')
    }

    const validated = validationResult.data

    // Update point rule (RLS ensures tenant_id isolation)
    const { data, error } = await supabase
      .from('point_rules')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      logger.error('Failed to update point rule', { error, tenant_id: tenantId, rule_id: id })

      if (error.code === 'PGRST116') {
        throw NotFoundError('Point rule not found')
      }

      throw InternalError(error.message)
    }

    logger.info('Updated point rule', {
      tenant_id: tenantId,
      rule_id: data.id,
      action_type: data.action_type,
    })

    return successResponse(data)
  } catch (error) {
    logger.error('Point rule PATCH error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/gamification/point-rules/[id]
 * Delete a point rule
 */
export const DELETE = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Soft delete point rule (RLS ensures tenant_id isolation)
    const { error } = await supabase
      .from('point_rules')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      logger.error('Failed to delete point rule', { error, tenant_id: tenantId, rule_id: id })
      throw InternalError(error.message)
    }

    logger.info('Soft deleted point rule', { tenant_id: tenantId, rule_id: id })

    return successResponse(null)
  } catch (error) {
    logger.error('Point rule DELETE error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
