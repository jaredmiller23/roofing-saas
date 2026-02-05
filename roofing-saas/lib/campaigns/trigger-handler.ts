/**
 * Campaign Trigger Handler
 *
 * Handles event-based triggers and enrolls contacts into campaigns
 * when trigger conditions are met. Also handles auto-canceling enrollments
 * when contacts exit the stage that triggered their enrollment.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { StageChangeTriggerConfig, TriggerType, ExitReason } from './types'

interface StageChangeEvent {
  tenantId: string
  projectId: string
  contactId: string | null
  fromStage: string | null
  toStage: string
  changedBy: string
  changedAt: string
}

/**
 * Check for matching campaign triggers and enroll contacts.
 * Also exit contacts from campaigns when they leave the stage that triggered enrollment.
 */
export async function handleStageChange(event: StageChangeEvent): Promise<void> {
  const supabase = await createClient()

  try {
    logger.info('[Campaign] Checking triggers for stage change', {
      projectId: event.projectId,
      fromStage: event.fromStage,
      toStage: event.toStage,
    })

    // First, handle auto-cancel for enrollments triggered by entering the stage we're leaving
    if (event.fromStage) {
      await exitEnrollmentsForStageExit(supabase, event)
    }

    // Find active campaigns with stage_change triggers that match
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select(`
        id,
        name,
        campaign_type,
        enrollment_type,
        campaign_steps (
          id,
          step_order
        )
      `)
      .eq('tenant_id', event.tenantId)
      .eq('status', 'active')
      .eq('campaign_type', 'stage_change' as TriggerType)

    if (error) {
      logger.error('[Campaign] Error fetching campaigns', { error: error.message })
      return
    }

    if (!campaigns || campaigns.length === 0) {
      logger.info('[Campaign] No active stage_change campaigns found')
      return
    }

    // Check each campaign's trigger config
    for (const campaign of campaigns) {
      const config = campaign.enrollment_type as unknown as StageChangeTriggerConfig

      // Check if trigger matches
      if (!matchesStageTrigger(config, event)) {
        continue
      }

      logger.info('[Campaign] Trigger matched, enrolling contact', {
        campaignId: campaign.id,
        campaignName: campaign.name,
        contactId: event.contactId,
        projectId: event.projectId,
      })

      // Enroll the contact (or project's contact) into the campaign
      await enrollInCampaign({
        campaignId: campaign.id,
        tenantId: event.tenantId,
        contactId: event.contactId,
        projectId: event.projectId,
        source: 'automatic_trigger',
        triggerData: {
          event_type: 'stage_change',
          from_stage: event.fromStage,
          to_stage: event.toStage,
          project_id: event.projectId,
          triggered_at: event.changedAt,
        },
        firstStepId: (campaign.campaign_steps as unknown as Array<{ id: string; step_order: number }> | null)?.[0]?.id,
      })
    }
  } catch (error) {
    logger.error('[Campaign] Error handling stage change', {
      error: error instanceof Error ? error.message : String(error),
      event,
    })
  }
}

/**
 * Check if a stage change event matches a campaign trigger config
 */
function matchesStageTrigger(
  config: StageChangeTriggerConfig,
  event: StageChangeEvent
): boolean {
  // Must be project entity type (for now)
  if (config.entity_type !== 'project') {
    return false
  }

  // Check to_stage matches (required)
  if (config.to_stage !== event.toStage) {
    return false
  }

  // Check from_stage matches (if specified)
  if (config.from_stage !== null && config.from_stage !== undefined) {
    if (config.from_stage !== event.fromStage) {
      return false
    }
  }

  return true
}

interface EnrollmentParams {
  campaignId: string
  tenantId: string
  contactId: string | null
  projectId: string | null
  source: 'automatic_trigger' | 'manual_admin' | 'api' | 'bulk_import'
  triggerData?: Record<string, unknown>
  firstStepId?: string
}

/**
 * Enroll a contact into a campaign
 */
export async function enrollInCampaign(params: EnrollmentParams): Promise<string | null> {
  const supabase = await createClient()

  // Need a contact to enroll
  let contactId = params.contactId

  // If no contact ID but we have a project, get the project's contact
  if (!contactId && params.projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('contact_id')
      .eq('id', params.projectId)
      .single()

    contactId = project?.contact_id || null
  }

  if (!contactId) {
    logger.warn('[Campaign] Cannot enroll without contact', {
      campaignId: params.campaignId,
      projectId: params.projectId,
    })
    return null
  }

  // Check if contact is already enrolled in this campaign
  const { data: existing } = await supabase
    .from('campaign_enrollments')
    .select('id, status')
    .eq('campaign_id', params.campaignId)
    .eq('contact_id', contactId)
    .in('status', ['active', 'paused'])
    .maybeSingle()

  if (existing) {
    logger.info('[Campaign] Contact already enrolled in campaign', {
      campaignId: params.campaignId,
      contactId,
      existingEnrollmentId: existing.id,
    })
    return existing.id
  }

  // Create enrollment
  // Note: trigger_data and project_id columns don't exist in the current schema,
  // so we only insert the columns that exist in database.types.ts
  const { data: enrollment, error: enrollError } = await supabase
    .from('campaign_enrollments')
    .insert({
      campaign_id: params.campaignId,
      tenant_id: params.tenantId,
      contact_id: contactId,
      status: 'active',
      enrollment_source: params.source,
      current_step_id: params.firstStepId || null,
      current_step_order: 0,
      enrolled_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (enrollError || !enrollment) {
    logger.error('[Campaign] Failed to create enrollment', {
      error: enrollError?.message,
      campaignId: params.campaignId,
      contactId,
    })
    return null
  }

  logger.info('[Campaign] Contact enrolled successfully', {
    enrollmentId: enrollment.id,
    campaignId: params.campaignId,
    contactId,
  })

  // Schedule the first step if we have one
  if (params.firstStepId) {
    const { error: stepError } = await supabase.from('campaign_step_executions').insert({
      enrollment_id: enrollment.id,
      step_id: params.firstStepId,
      status: 'pending',
      scheduled_at: new Date().toISOString(), // Execute immediately
    })

    if (stepError) {
      logger.error('[Campaign] Failed to schedule first step', {
        error: stepError.message,
        enrollmentId: enrollment.id,
      })
    }
  }

  // Update campaign enrollment count
  await supabase.rpc('increment_campaign_enrollments', { campaign_id: params.campaignId })

  return enrollment.id
}

/**
 * Exit enrollments when a project leaves the stage that triggered the enrollment.
 *
 * When a project moves OUT of a stage, we check if any active enrollments
 * were triggered by entering that stage. If so, we exit them automatically.
 *
 * Example: If a campaign enrolls contacts when entering "proposal" stage,
 * and the project moves from "proposal" to "negotiation", we exit the enrollment.
 */
async function exitEnrollmentsForStageExit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: StageChangeEvent
): Promise<void> {
  const fromStage = event.fromStage
  if (!fromStage) {
    return
  }

  // Get the contact ID - either from the event or from the project
  let contactId = event.contactId
  if (!contactId && event.projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('contact_id')
      .eq('id', event.projectId)
      .single()

    contactId = project?.contact_id || null
  }

  if (!contactId) {
    logger.warn('[Campaign] Cannot check enrollments without contact', {
      projectId: event.projectId,
    })
    return
  }

  // Find active enrollments for this contact that were triggered by stage_change
  // and where the trigger's to_stage matches the stage we're leaving (fromStage)
  const { data: enrollments, error: fetchError } = await supabase
    .from('campaign_enrollments')
    .select(`
      id,
      campaign_id,
      campaigns!inner(
        id,
        name,
        campaign_triggers(
          id,
          trigger_type,
          trigger_config
        )
      )
    `)
    .eq('contact_id', contactId)
    .eq('status', 'active')

  if (fetchError) {
    logger.error('[Campaign] Error fetching enrollments for stage exit check', {
      error: fetchError.message,
      contactId,
    })
    return
  }

  if (!enrollments || enrollments.length === 0) {
    logger.info('[Campaign] No active enrollments to check for stage exit', {
      contactId,
      fromStage,
    })
    return
  }

  // Filter enrollments where a stage_change trigger's to_stage matches the stage we're leaving
  const enrollmentsToExit: Array<{ id: string; campaignName: string }> = []

  for (const enrollment of enrollments) {
    // Type assertion for the nested campaign data
    const campaign = enrollment.campaigns as unknown as {
      id: string
      name: string
      campaign_triggers: Array<{
        id: string
        trigger_type: string
        trigger_config: StageChangeTriggerConfig | Record<string, unknown>
      }> | null
    }

    if (!campaign?.campaign_triggers || campaign.campaign_triggers.length === 0) {
      continue
    }

    // Check if any trigger's to_stage matches the stage we're leaving
    const hasMatchingTrigger = campaign.campaign_triggers.some((trigger) => {
      if (trigger.trigger_type !== 'stage_change') {
        return false
      }

      const config = trigger.trigger_config as StageChangeTriggerConfig
      // If the trigger enrolled contacts when entering the fromStage, exit them now
      return config.to_stage === fromStage
    })

    if (hasMatchingTrigger) {
      enrollmentsToExit.push({
        id: enrollment.id,
        campaignName: campaign.name,
      })
    }
  }

  if (enrollmentsToExit.length === 0) {
    logger.info('[Campaign] No enrollments match the exited stage', {
      contactId,
      fromStage,
      checkedEnrollments: enrollments.length,
    })
    return
  }

  // Exit the matching enrollments
  const exitReason: ExitReason = 'stage_changed'
  const exitedAt = new Date().toISOString()

  for (const enrollment of enrollmentsToExit) {
    const { error: updateError } = await supabase
      .from('campaign_enrollments')
      .update({
        status: 'exited',
        exit_reason: exitReason,
        exited_at: exitedAt,
      })
      .eq('id', enrollment.id)

    if (updateError) {
      logger.error('[Campaign] Failed to exit enrollment', {
        error: updateError.message,
        enrollmentId: enrollment.id,
        campaignName: enrollment.campaignName,
      })
    } else {
      logger.info('[Campaign] Enrollment auto-exited due to stage change', {
        enrollmentId: enrollment.id,
        campaignName: enrollment.campaignName,
        contactId,
        fromStage,
        toStage: event.toStage,
        exitReason,
      })
    }
  }

  logger.info('[Campaign] Stage exit processing complete', {
    contactId,
    fromStage,
    toStage: event.toStage,
    enrollmentsExited: enrollmentsToExit.length,
  })
}
