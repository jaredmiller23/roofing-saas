import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { NotFoundError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, noContentResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const triggerUpdateSchema = z.object({
  trigger_type: z.enum(['stage_change', 'time_based', 'manual', 'form_submission', 'tag_added']).optional(),
  trigger_config: z.record(z.string(), z.unknown()).optional(),
  enrollment_conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  exclusion_conditions: z.record(z.string(), z.unknown()).nullable().optional(),
  is_active: z.boolean().optional(),
  priority: z.number().int().min(0).optional(),
})

/**
 * PATCH /api/campaigns/[id]/triggers/[triggerId]
 * Update a campaign trigger
 */
export const PATCH = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id: campaignId, triggerId } = await params
    const supabase = await createClient()

    // Verify campaign belongs to tenant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .single()

    if (campaignError || !campaign) {
      throw NotFoundError('Campaign')
    }

    const body = await request.json()
    const validation = triggerUpdateSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const updates = validation.data
    const updatePayload: Record<string, unknown> = {}

    if (updates.trigger_type !== undefined) updatePayload.trigger_type = updates.trigger_type
    if (updates.trigger_config !== undefined) updatePayload.trigger_config = JSON.parse(JSON.stringify(updates.trigger_config))
    if (updates.enrollment_conditions !== undefined) {
      updatePayload.enrollment_conditions = updates.enrollment_conditions
        ? JSON.parse(JSON.stringify(updates.enrollment_conditions))
        : null
    }
    if (updates.exclusion_conditions !== undefined) {
      updatePayload.exclusion_conditions = updates.exclusion_conditions
        ? JSON.parse(JSON.stringify(updates.exclusion_conditions))
        : null
    }
    if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active
    if (updates.priority !== undefined) updatePayload.priority = updates.priority

    const { data, error } = await supabase
      .from('campaign_triggers')
      .update(updatePayload)
      .eq('id', triggerId)
      .eq('campaign_id', campaignId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw NotFoundError('Trigger')
      }
      logger.error('Error updating campaign trigger', { error, campaignId, triggerId })
      throw InternalError('Failed to update trigger')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in PATCH /api/campaigns/[id]/triggers/[triggerId]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/campaigns/[id]/triggers/[triggerId]
 * Delete a campaign trigger
 */
export const DELETE = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id: campaignId, triggerId } = await params
    const supabase = await createClient()

    // Verify campaign belongs to tenant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('tenant_id', tenantId)
      .single()

    if (campaignError || !campaign) {
      throw NotFoundError('Campaign')
    }

    const { error } = await supabase
      .from('campaign_triggers')
      .delete()
      .eq('id', triggerId)
      .eq('campaign_id', campaignId)

    if (error) {
      logger.error('Error deleting campaign trigger', { error, campaignId, triggerId })
      throw InternalError('Failed to delete trigger')
    }

    return noContentResponse()
  } catch (error) {
    logger.error('Error in DELETE /api/campaigns/[id]/triggers/[triggerId]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
