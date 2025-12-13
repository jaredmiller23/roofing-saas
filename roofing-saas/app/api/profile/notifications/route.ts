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
import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
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
export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)

    if (!tenantId) {
      throw AuthenticationError('User not associated with a tenant')
    }

    const supabase = await createClient()

    // Try to get existing preferences
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id)
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
        user_id: user.id,
        tenant_id: tenantId,
      }
      return successResponse({ success: true, preferences: defaultPrefs, isDefault: true })
    }

    return successResponse({ success: true, preferences: data, isDefault: false })
  } catch (error) {
    logger.error('Error in GET /api/profile/notifications:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * PUT /api/profile/notifications
 * Update user notification preferences (upsert)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)

    if (!tenantId) {
      throw AuthenticationError('User not associated with a tenant')
    }

    const body: UpdateNotificationPreferencesInput = await request.json()

    // Validate input
    if (!body || typeof body !== 'object') {
      throw ValidationError('Invalid request body')
    }

    const supabase = await createClient()

    // Build the upsert data
    const prefsData = {
      tenant_id: tenantId,
      user_id: user.id,
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

    return successResponse({
      success: true,
      preferences: data,
      message: 'Notification preferences updated successfully',
    })
  } catch (error) {
    logger.error('Error in PUT /api/profile/notifications:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
