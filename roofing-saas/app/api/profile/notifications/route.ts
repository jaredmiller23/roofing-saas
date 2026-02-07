// =============================================
// Notification Preferences API Route
// =============================================
// Route: GET/PUT /api/profile/notifications
// Purpose: Get and update user notification preferences
// Author: Claude Code
// Date: 2025-12-13
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type {
  NotificationPreferences,
  UpdateNotificationPreferencesInput
} from '@/lib/types/notification-preferences'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notification-preferences'

/**
 * GET /api/profile/notifications
 * Get current user's notification preferences
 */
export const GET = withAuth(async (_request, { userId, tenantId }) => {
  try {
    const supabase = await createClient()

    // Try to get existing preferences
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is OK for first-time users
      logger.error('Error fetching notification preferences:', { error })
      throw InternalError('Failed to fetch notification preferences')
    }

    // If no preferences exist, return defaults
    if (!data) {
      const defaultPrefs: Partial<NotificationPreferences> = {
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        user_id: userId,
        tenant_id: tenantId,
      }
      return successResponse(defaultPrefs)
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in GET /api/profile/notifications:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PUT /api/profile/notifications
 * Update user notification preferences (upsert)
 */
export const PUT = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    const body: UpdateNotificationPreferencesInput = await request.json()

    // Validate input
    if (!body || typeof body !== 'object') {
      throw ValidationError('Invalid request body')
    }

    const supabase = await createClient()

    // Build the upsert data
    const prefsData = {
      tenant_id: tenantId,
      user_id: userId,
      ...body,
      updated_at: new Date().toISOString(),
    }

    // Upsert preferences
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert(prefsData, {
        onConflict: 'tenant_id,user_id',
      })
      .select()
      .single()

    if (error) {
      logger.error('Error updating notification preferences:', { error })
      throw InternalError('Failed to update notification preferences')
    }

    return successResponse(data)
  } catch (error) {
    logger.error('Error in PUT /api/profile/notifications:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
