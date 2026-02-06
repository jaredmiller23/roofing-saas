import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { NotFoundError, InternalError, ValidationError } from '@/lib/api/errors'
import { successResponse, createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const triggerSchema = z.object({
  trigger_type: z.enum(['stage_change', 'time_based', 'manual', 'form_submission', 'tag_added']),
  trigger_config: z.record(z.string(), z.unknown()),
  enrollment_conditions: z.record(z.string(), z.unknown()).optional(),
  exclusion_conditions: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().default(true),
  priority: z.number().int().min(0).default(0),
})

/**
 * GET /api/campaigns/[id]/triggers
 * List triggers for a campaign
 */
export const GET = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id: campaignId } = await params
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

    const { data, error } = await supabase
      .from('campaign_triggers')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('priority', { ascending: true })

    if (error) {
      logger.error('Error fetching campaign triggers', { error, campaignId })
      throw InternalError('Failed to fetch triggers')
    }

    return successResponse(data || [])
  } catch (error) {
    logger.error('Error in GET /api/campaigns/[id]/triggers', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * POST /api/campaigns/[id]/triggers
 * Create a new trigger for a campaign
 */
export const POST = withAuthParams(async (request, { tenantId }, { params }) => {
  try {
    const { id: campaignId } = await params
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
    const validation = triggerSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const { data, error } = await supabase
      .from('campaign_triggers')
      .insert({
        campaign_id: campaignId,
        trigger_type: validation.data.trigger_type,
        trigger_config: JSON.parse(JSON.stringify(validation.data.trigger_config)),
        enrollment_conditions: validation.data.enrollment_conditions
          ? JSON.parse(JSON.stringify(validation.data.enrollment_conditions))
          : null,
        exclusion_conditions: validation.data.exclusion_conditions
          ? JSON.parse(JSON.stringify(validation.data.exclusion_conditions))
          : null,
        is_active: validation.data.is_active,
        priority: validation.data.priority,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating campaign trigger', { error, campaignId })
      throw InternalError('Failed to create trigger')
    }

    return createdResponse(data)
  } catch (error) {
    logger.error('Error in POST /api/campaigns/[id]/triggers', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
