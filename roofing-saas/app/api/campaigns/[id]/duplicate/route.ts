import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { requireFeature } from '@/lib/billing/feature-gates'
import {
  AuthorizationError,
  NotFoundError,
  InternalError,
} from '@/lib/api/errors'
import { createdResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { Json, Database } from '@/lib/types/database.types'
import type { Campaign } from '@/lib/campaigns/types'

// Database row types for working with Supabase results
type DbCampaignStep = Database['public']['Tables']['campaign_steps']['Row']
type DbCampaignTrigger = Database['public']['Tables']['campaign_triggers']['Row']

/**
 * POST /api/campaigns/:id/duplicate
 * Duplicate a campaign with all its steps and triggers
 *
 * This creates a complete copy of the campaign including:
 * - Campaign configuration with "(Copy)" suffix on name
 * - All campaign triggers
 * - All campaign steps with proper ID mapping for branching
 */
export const POST = withAuthParams(async (_request, { userId, tenantId }, { params }) => {
  try {
    // Check feature access
    try {
      await requireFeature(tenantId, 'campaigns')
    } catch {
      throw AuthorizationError('Campaigns requires Professional plan or higher')
    }

    const userIsAdmin = await isAdmin(userId)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const { id: originalCampaignId } = await params
    const supabase = await createClient()

    // 1. Fetch the original campaign
    const { data: originalCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', originalCampaignId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (campaignError || !originalCampaign) {
      logger.error('Campaign not found for duplication', {
        campaignId: originalCampaignId,
        error: campaignError,
      })
      throw NotFoundError('Campaign')
    }

    // 2. Fetch original campaign's triggers
    const { data: originalTriggers, error: triggersError } = await supabase
      .from('campaign_triggers')
      .select('*')
      .eq('campaign_id', originalCampaignId)
      .order('priority', { ascending: true })

    if (triggersError) {
      logger.error('Error fetching triggers for duplication', {
        campaignId: originalCampaignId,
        error: triggersError,
      })
      throw InternalError('Failed to fetch campaign triggers')
    }

    // 3. Fetch original campaign's steps
    const { data: originalSteps, error: stepsError } = await supabase
      .from('campaign_steps')
      .select('*')
      .eq('campaign_id', originalCampaignId)
      .order('step_order', { ascending: true })

    if (stepsError) {
      logger.error('Error fetching steps for duplication', {
        campaignId: originalCampaignId,
        error: stepsError,
      })
      throw InternalError('Failed to fetch campaign steps')
    }

    // 4. Create the new campaign (as draft, with "(Copy)" suffix)
    const { data: newCampaign, error: createError } = await supabase
      .from('campaigns')
      .insert({
        tenant_id: tenantId,
        name: `${originalCampaign.name} (Copy)`,
        description: originalCampaign.description,
        campaign_type: originalCampaign.campaign_type,
        status: 'draft', // Always start as draft
        goal_type: originalCampaign.goal_type,
        goal_target: originalCampaign.goal_target,
        allow_re_enrollment: originalCampaign.allow_re_enrollment,
        re_enrollment_delay_days: originalCampaign.re_enrollment_delay_days,
        respect_business_hours: originalCampaign.respect_business_hours,
        business_hours: originalCampaign.business_hours,
        enrollment_type: originalCampaign.enrollment_type,
        max_enrollments: originalCampaign.max_enrollments,
        created_by: userId,
      })
      .select()
      .single()

    if (createError || !newCampaign) {
      logger.error('Error creating duplicate campaign', {
        originalId: originalCampaignId,
        error: createError,
      })
      throw InternalError('Failed to create duplicate campaign')
    }

    const newCampaignId = newCampaign.id

    // 5. Copy triggers to new campaign
    if (originalTriggers && originalTriggers.length > 0) {
      const triggersToInsert = originalTriggers.map((trigger: DbCampaignTrigger) => ({
        campaign_id: newCampaignId,
        trigger_type: trigger.trigger_type,
        trigger_config: trigger.trigger_config as Json,
        enrollment_conditions: trigger.enrollment_conditions as Json | null,
        exclusion_conditions: trigger.exclusion_conditions as Json | null,
        priority: trigger.priority,
        is_active: trigger.is_active,
      }))

      const { error: insertTriggersError } = await supabase
        .from('campaign_triggers')
        .insert(triggersToInsert)

      if (insertTriggersError) {
        logger.error('Error copying triggers', {
          newCampaignId,
          error: insertTriggersError,
        })
        // Clean up the new campaign on failure
        await supabase.from('campaigns').delete().eq('id', newCampaignId)
        throw InternalError('Failed to copy campaign triggers')
      }
    }

    // 6. Copy steps to new campaign (with ID mapping for branching)
    if (originalSteps && originalSteps.length > 0) {
      // Map old step IDs to new step IDs
      const stepIdMapping: Record<string, string> = {}

      // First pass: Create all steps without branch references
      const stepsToInsert = originalSteps.map((step: DbCampaignStep) => ({
        campaign_id: newCampaignId,
        // parent_step_id, true_path_step_id, false_path_step_id will be updated in second pass
        parent_step_id: null,
        step_order: step.step_order,
        step_type: step.step_type,
        step_config: step.step_config as Json,
        delay_value: step.delay_value,
        delay_unit: step.delay_unit,
        conditions: step.conditions as Json | null,
        true_path_step_id: null,
        false_path_step_id: null,
      }))

      const { data: newSteps, error: insertStepsError } = await supabase
        .from('campaign_steps')
        .insert(stepsToInsert)
        .select()

      if (insertStepsError || !newSteps) {
        logger.error('Error copying steps', {
          newCampaignId,
          error: insertStepsError,
        })
        // Clean up on failure
        await supabase.from('campaign_triggers').delete().eq('campaign_id', newCampaignId)
        await supabase.from('campaigns').delete().eq('id', newCampaignId)
        throw InternalError('Failed to copy campaign steps')
      }

      // Build the ID mapping (original step ID -> new step ID)
      // Match by step_order since that's the unique identifier within a campaign
      for (let i = 0; i < originalSteps.length; i++) {
        const originalStep = originalSteps[i]
        const newStep = newSteps.find(
          (s) => s.step_order === originalStep.step_order
        )
        if (newStep) {
          stepIdMapping[originalStep.id] = newStep.id
        }
      }

      // Second pass: Update steps with branch references
      const stepsNeedingUpdate = originalSteps.filter(
        (step) =>
          step.parent_step_id || step.true_path_step_id || step.false_path_step_id
      )

      for (const originalStep of stepsNeedingUpdate) {
        const newStepId = stepIdMapping[originalStep.id]
        if (!newStepId) continue

        const updates: Record<string, string | null> = {}

        if (originalStep.parent_step_id && stepIdMapping[originalStep.parent_step_id]) {
          updates.parent_step_id = stepIdMapping[originalStep.parent_step_id]
        }
        if (originalStep.true_path_step_id && stepIdMapping[originalStep.true_path_step_id]) {
          updates.true_path_step_id = stepIdMapping[originalStep.true_path_step_id]
        }
        if (originalStep.false_path_step_id && stepIdMapping[originalStep.false_path_step_id]) {
          updates.false_path_step_id = stepIdMapping[originalStep.false_path_step_id]
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('campaign_steps')
            .update(updates)
            .eq('id', newStepId)

          if (updateError) {
            logger.warn('Error updating step branch references', {
              stepId: newStepId,
              error: updateError,
            })
            // Continue - this is not a critical failure
          }
        }
      }
    }

    logger.info('Campaign duplicated successfully', {
      originalId: originalCampaignId,
      newId: newCampaignId,
      triggersCount: originalTriggers?.length || 0,
      stepsCount: originalSteps?.length || 0,
    })

    return createdResponse({
      ...(newCampaign as Campaign),
      triggers_copied: originalTriggers?.length || 0,
      steps_copied: originalSteps?.length || 0,
    })
  } catch (error) {
    logger.error('Error in POST /api/campaigns/:id/duplicate', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
