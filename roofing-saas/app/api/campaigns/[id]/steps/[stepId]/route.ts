import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, NotFoundError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type {
  CampaignStep,
  UpdateCampaignStepRequest,
  UpdateCampaignStepResponse,
} from '@/lib/campaigns/types'

/**
 * PATCH /api/campaigns/:id/steps/:stepId
 * Update campaign step (admin only)
 *
 * Body: UpdateCampaignStepRequest
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const { id: campaign_id, stepId } = await params
    const body: UpdateCampaignStepRequest = await request.json()

    // Build update object
    const updates: Record<string, unknown> = {}

    if (body.step_order !== undefined) updates.step_order = body.step_order
    if (body.step_type !== undefined) updates.step_type = body.step_type
    if (body.step_config !== undefined) updates.step_config = body.step_config
    if (body.delay_value !== undefined) updates.delay_value = body.delay_value
    if (body.delay_unit !== undefined) updates.delay_unit = body.delay_unit
    if (body.conditions !== undefined) updates.conditions = body.conditions
    if (body.true_path_step_id !== undefined)
      updates.true_path_step_id = body.true_path_step_id
    if (body.false_path_step_id !== undefined)
      updates.false_path_step_id = body.false_path_step_id

    // Validate step_type if provided
    if (body.step_type !== undefined) {
      const validStepTypes = [
        'send_email',
        'send_sms',
        'create_task',
        'wait',
        'update_field',
        'manage_tags',
        'notify',
        'webhook',
        'conditional',
        'exit_campaign',
      ]
      if (!validStepTypes.includes(body.step_type)) {
        throw ValidationError('Invalid step_type')
      }
    }

    // Validate delay_value if provided
    if (body.delay_value !== undefined && body.delay_value < 0) {
      throw ValidationError('delay_value must be >= 0')
    }

    // Validate delay_unit if provided
    if (body.delay_unit !== undefined) {
      const validDelayUnits = ['hours', 'days', 'weeks']
      if (!validDelayUnits.includes(body.delay_unit)) {
        throw ValidationError('Invalid delay_unit')
      }
    }

    if (Object.keys(updates).length === 0) {
      throw ValidationError('No fields to update')
    }

    const supabase = await createClient()

    // Verify campaign belongs to tenant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantId)
      .single()

    if (campaignError || !campaign) {
      throw NotFoundError('Campaign')
    }

    const { data, error } = await supabase
      .from('campaign_steps')
      .update(updates)
      .eq('id', stepId)
      .eq('campaign_id', campaign_id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating campaign step', { error, stepId })
      if (error.code === 'PGRST116') {
        throw NotFoundError('Step')
      }
      throw InternalError('Failed to update step')
    }

    const response: UpdateCampaignStepResponse = {
      step: data as CampaignStep,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in PATCH /api/campaigns/:id/steps/:stepId', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/campaigns/:id/steps/:stepId
 * Delete campaign step (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const { id: campaign_id, stepId } = await params
    const supabase = await createClient()

    // Verify campaign belongs to tenant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantId)
      .single()

    if (campaignError || !campaign) {
      throw NotFoundError('Campaign')
    }

    // Hard delete (cascades to executions)
    const { error } = await supabase
      .from('campaign_steps')
      .delete()
      .eq('id', stepId)
      .eq('campaign_id', campaign_id)

    if (error) {
      logger.error('Error deleting campaign step', { error, stepId })
      throw InternalError('Failed to delete step')
    }

    return successResponse({ success: true })
  } catch (error) {
    logger.error('Error in DELETE /api/campaigns/:id/steps/:stepId', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
