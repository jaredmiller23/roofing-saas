import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import type {
  ImpersonationStatusResponse,
  ImpersonationCookie,
} from '@/lib/impersonation/types'
import { IMPERSONATION_COOKIE_NAME } from '@/lib/impersonation/types'
import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/impersonate/status
 * Check if currently impersonating another user
 */
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)

    // No active session
    if (!sessionCookie) {
      return successResponse({
        is_impersonating: false,
      } as ImpersonationStatusResponse)
    }

    const sessionData: ImpersonationCookie = JSON.parse(sessionCookie.value)

    // Verify session hasn't expired
    const expiresAt = new Date(sessionData.expires_at)
    const now = new Date()

    if (now > expiresAt) {
      // Session expired - clean up cookie
      cookieStore.delete(IMPERSONATION_COOKIE_NAME)

      // Update log to expired status
      const supabase = await createClient()
      await supabase
        .from('impersonation_logs')
        .update({ status: 'expired', ended_at: now.toISOString() })
        .eq('id', sessionData.log_id)

      return successResponse({
        is_impersonating: false,
      } as ImpersonationStatusResponse)
    }

    // Verify this is the admin who started the session
    if (sessionData.admin_user_id !== user.id) {
      throw AuthorizationError('Session mismatch')
    }

    const supabase = await createClient()

    // Get admin and impersonated user details
    // Two-step query: tenant_users FK references auth.users, not public.users
    const { data: impersonatedTenantData } = await supabase
      .from('tenant_users')
      .select('role')
      .eq('user_id', sessionData.impersonated_user_id)
      .single()

    // Get user emails from public.users
    const { data: usersData } = await supabase
      .from('users')
      .select('id, email')
      .in('id', [sessionData.admin_user_id, sessionData.impersonated_user_id])

    // Calculate time remaining
    const timeRemainingMs = expiresAt.getTime() - now.getTime()
    const timeRemainingSeconds = Math.floor(timeRemainingMs / 1000)

    const adminUserData = usersData?.find(u => u.id === sessionData.admin_user_id)
    const impersonatedUserData = usersData?.find(u => u.id === sessionData.impersonated_user_id)
    const impersonatedData = impersonatedTenantData

    const response: ImpersonationStatusResponse = {
      is_impersonating: true,
      admin_user: {
        id: sessionData.admin_user_id,
        email: adminUserData?.email || user.email || '',
      },
      impersonated_user: {
        id: sessionData.impersonated_user_id,
        email: impersonatedUserData?.email || '',
        role: impersonatedData?.role ?? 'user',
      },
      started_at: sessionData.started_at,
      expires_at: sessionData.expires_at,
      time_remaining_seconds: timeRemainingSeconds,
      reason: sessionData.reason,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in GET /api/admin/impersonate/status', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
