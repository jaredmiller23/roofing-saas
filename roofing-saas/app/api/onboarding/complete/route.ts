/**
 * Onboarding Complete API
 *
 * Marks the tenant's onboarding as complete and saves wizard metadata.
 * Called when the user finishes (or skips through) the onboarding wizard.
 */

import { withAuth } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { InternalError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'

export const POST = withAuth(async (request, { tenantId }) => {
  try {
    const body = await request.json()
    const { priorities, stepsCompleted, stepsSkipped } = body

    const adminClient = await createAdminClient()

    const onboardingData = {
      wizard_completed: true,
      wizard_completed_at: new Date().toISOString(),
      steps_completed: stepsCompleted || [],
      steps_skipped: stepsSkipped || [],
      priorities: priorities || [],
      checklist: {
        add_contact: false,
        create_project: false,
        setup_pipeline: false,
        send_estimate: false,
        invite_team: false,
        log_call: false,
        dismissed: false,
        dismissed_at: null,
      },
    }

    // Mark tenant as onboarded
    const { error: tenantError } = await adminClient
      .from('tenants')
      .update({ onboarding_completed: true })
      .eq('id', tenantId)

    if (tenantError) {
      logger.error('Failed to mark onboarding complete', { tenantId, error: tenantError })
      throw InternalError('Failed to complete onboarding')
    }

    // Save onboarding data to tenant_settings
    // Upsert: create if not exists, update if exists
    const { data: existingSettings } = await adminClient
      .from('tenant_settings')
      .select('id, custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    if (existingSettings) {
      const updatedSettings = {
        ...(existingSettings.custom_settings as Record<string, unknown> || {}),
        onboarding: onboardingData,
      }

      await adminClient
        .from('tenant_settings')
        .update({ custom_settings: updatedSettings as Json })
        .eq('id', existingSettings.id)
    } else {
      await adminClient
        .from('tenant_settings')
        .insert({
          tenant_id: tenantId,
          custom_settings: { onboarding: onboardingData } as Json,
        })
    }

    logger.info('Onboarding completed', { tenantId, stepsCompleted, stepsSkipped })

    return successResponse({ completed: true })
  } catch (error) {
    logger.error('Error completing onboarding', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to complete onboarding'))
  }
})
