/**
 * Onboarding Progress API
 *
 * GET: Fetch current onboarding progress (for wizard resume)
 * PUT: Save partial progress (per-step saves)
 */

import { withAuth } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { InternalError } from '@/lib/api/errors'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'

export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    const adminClient = await createAdminClient()

    // Get tenant info for pre-filling wizard
    const { data: tenant } = await adminClient
      .from('tenants')
      .select('name, phone, onboarding_completed')
      .eq('id', tenantId)
      .single()

    // Get saved progress from tenant_settings
    const { data: settings } = await adminClient
      .from('tenant_settings')
      .select('custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    const onboardingProgress = (settings?.custom_settings as Record<string, unknown>)?.onboarding || null

    return successResponse({
      tenant: {
        name: tenant?.name || '',
        phone: tenant?.phone || '',
        onboarding_completed: tenant?.onboarding_completed || false,
      },
      progress: onboardingProgress,
    })
  } catch (error) {
    logger.error('Error fetching onboarding progress', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to fetch progress'))
  }
})

export const PUT = withAuth(async (request, { tenantId }) => {
  try {
    const body = await request.json()
    const { currentStep, stepsCompleted, stepsSkipped, priorities } = body

    const adminClient = await createAdminClient()

    // Get existing settings
    const { data: existingSettings } = await adminClient
      .from('tenant_settings')
      .select('id, custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    const progressData = {
      current_step: currentStep,
      steps_completed: stepsCompleted || [],
      steps_skipped: stepsSkipped || [],
      priorities: priorities || [],
      updated_at: new Date().toISOString(),
    }

    if (existingSettings) {
      const updatedSettings = {
        ...(existingSettings.custom_settings as Record<string, unknown> || {}),
        onboarding_progress: progressData,
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
          custom_settings: { onboarding_progress: progressData } as Json,
        })
    }

    return successResponse({ saved: true })
  } catch (error) {
    logger.error('Error saving onboarding progress', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to save progress'))
  }
})
