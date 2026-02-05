/**
 * Onboarding Checklist API
 *
 * GET: Evaluate checklist completion from real data
 * POST: Dismiss the checklist
 */

import { withAuth } from '@/lib/auth/with-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { InternalError } from '@/lib/api/errors'
import { evaluateChecklist } from '@/lib/onboarding/checklist-evaluator'
import { logger } from '@/lib/logger'
import type { Json } from '@/lib/types/database.types'

export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    const result = await evaluateChecklist(tenantId)
    return successResponse(result)
  } catch (error) {
    logger.error('Error evaluating checklist', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to evaluate checklist'))
  }
})

export const POST = withAuth(async (request, { tenantId }) => {
  try {
    const body = await request.json()
    const { action } = body

    if (action !== 'dismiss') {
      return errorResponse(new Error('Invalid action'), 400)
    }

    const adminClient = await createAdminClient()

    const { data: existingSettings } = await adminClient
      .from('tenant_settings')
      .select('id, custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    if (existingSettings) {
      const currentSettings = (existingSettings.custom_settings as Record<string, unknown>) || {}
      const onboarding = (currentSettings.onboarding as Record<string, unknown>) || {}
      const checklist = (onboarding.checklist as Record<string, unknown>) || {}

      const updatedSettings = {
        ...currentSettings,
        onboarding: {
          ...onboarding,
          checklist: {
            ...checklist,
            dismissed: true,
            dismissed_at: new Date().toISOString(),
          },
        },
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
          custom_settings: {
            onboarding: {
              checklist: {
                dismissed: true,
                dismissed_at: new Date().toISOString(),
              },
            },
          } as Json,
        })
    }

    return successResponse({ dismissed: true })
  } catch (error) {
    logger.error('Error dismissing checklist', { error })
    return errorResponse(error instanceof Error ? error : InternalError('Failed to dismiss checklist'))
  }
})
