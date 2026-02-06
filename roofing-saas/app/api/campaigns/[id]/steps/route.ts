import type { Json } from '@/lib/types/database.types'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { AuthorizationError, NotFoundError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse, createdResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type {
  CampaignStep,
  CreateCampaignStepRequest,
} from '@/lib/campaigns/types'

/**
 * GET /api/campaigns/:id/steps
 * Get all steps for a campaign
 */
export const GET = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id: campaign_id } = await params
    const supabase = await createClient()

    // First verify campaign belongs to tenant
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
      .select('*')
      .eq('campaign_id', campaign_id)
      .order('step_order', { ascending: true })

    if (error) {
      logger.error('Error fetching campaign steps', { error, campaignId: campaign_id })
      throw InternalError('Failed to fetch steps')
    }

    return successResponse((data || []) as CampaignStep[])
  } catch (error) {
    logger.error('Error in GET /api/campaigns/:id/steps', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/campaigns/:id/steps
 * Create new step in campaign (admin only)
 *
 * Body: CreateCampaignStepRequest
 */
export const POST = withAuthParams(async (request, { userId, tenantId }, { params }) => {
  try {
    const userIsAdmin = await isAdmin(userId)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const { id: campaign_id } = await params
    const body: CreateCampaignStepRequest = await request.json()

    // Validate required fields
    if (
      body.step_order === undefined ||
      !body.step_type ||
      !body.step_config
    ) {
      throw ValidationError('Missing required fields: step_order, step_type, step_config')
    }

    // Validate step_type
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

    const supabase = await createClient()

    // Check if campaign exists and belongs to tenant
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('tenant_id', tenantId)
      .single()

    if (campaignError || !campaign) {
      throw NotFoundError('Campaign')
    }

    // Insert step
    const { data, error } = await supabase
      .from('campaign_steps')
      .insert({
        campaign_id,
        parent_step_id: body.parent_step_id || null,
        step_order: body.step_order,
        step_type: body.step_type,
        step_config: body.step_config as Json,
        delay_value: body.delay_value ?? 0,
        delay_unit: body.delay_unit || 'days',
        conditions: (body.conditions || null) as Json | null,
        true_path_step_id: body.true_path_step_id || null,
        false_path_step_id: body.false_path_step_id || null,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating campaign step', { error, campaignId: campaign_id })
      throw InternalError('Failed to create step')
    }

    return createdResponse(data as CampaignStep)
  } catch (error) {
    logger.error('Error in POST /api/campaigns/:id/steps', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
