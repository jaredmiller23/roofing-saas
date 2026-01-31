/**
 * Campaign Trigger Handler
 *
 * Handles event-based triggers and enrolls contacts into campaigns
 * when trigger conditions are met.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import type { StageChangeTriggerConfig, TriggerType } from './types'

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
 * Check for matching campaign triggers and enroll contacts
 */
export async function handleStageChange(event: StageChangeEvent): Promise<void> {
  const supabase = await createClient()

  try {
    logger.info('[Campaign] Checking triggers for stage change', {
      projectId: event.projectId,
      fromStage: event.fromStage,
      toStage: event.toStage,
    })

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
  const { data: enrollment, error: enrollError } = await supabase
    .from('campaign_enrollments')
    .insert({
      campaign_id: params.campaignId,
      tenant_id: params.tenantId,
      contact_id: contactId,
      project_id: params.projectId,
      status: 'active',
      enrollment_source: params.source,
      trigger_data: params.triggerData || {},
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
