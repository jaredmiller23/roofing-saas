import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { cookies } from 'next/headers'
import { AuthenticationError, AuthorizationError, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type {
  StartImpersonationRequest,
  StartImpersonationResponse,
  StopImpersonationResponse,
  ImpersonationCookie,
} from '@/lib/impersonation/types'
import { IMPERSONATION_COOKIE_NAME, IMPERSONATION_DURATION_HOURS } from '@/lib/impersonation/types'

/**
 * POST /api/admin/impersonate
 * Start impersonating another user
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Verify user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    // Check if already impersonating
    const cookieStore = await cookies()
    const existingSession = cookieStore.get(IMPERSONATION_COOKIE_NAME)
    if (existingSession) {
      throw ConflictError('Already impersonating another user. Please exit current session first.')
    }

    const body: StartImpersonationRequest = await request.json()
    const { user_id: targetUserId, reason } = body

    if (!targetUserId) {
      throw ValidationError('user_id is required')
    }

    // Prevent self-impersonation
    if (targetUserId === user.id) {
      throw ValidationError('Cannot impersonate yourself')
    }

    const supabase = await createClient()

    // Verify target user exists and is in same tenant
    const { data: targetUser, error: targetError } = await supabase
      .from('tenant_users')
      .select(`
        user_id,
        tenant_id,
        role,
        users:user_id (
          email
        )
      `)
      .eq('user_id', targetUserId)
      .eq('tenant_id', tenantId)
      .single()

    if (targetError || !targetUser) {
      throw ValidationError('Target user not found in your tenant')
    }

    // Prevent impersonating another admin
    if (targetUser.role === 'admin') {
      throw AuthorizationError('Cannot impersonate another admin')
    }

    // Get admin user email
    const { data: adminData } = await supabase
      .from('tenant_users')
      .select(`
        users:user_id (
          email
        )
      `)
      .eq('user_id', user.id)
      .single()

    // Calculate expiration time
    const startedAt = new Date()
    const expiresAt = new Date(startedAt.getTime() + IMPERSONATION_DURATION_HOURS * 60 * 60 * 1000)

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // Create impersonation log
    const { data: log, error: logError } = await supabase
      .from('impersonation_logs')
      .insert({
        tenant_id: tenantId,
        admin_user_id: user.id,
        impersonated_user_id: targetUserId,
        started_at: startedAt.toISOString(),
        reason: reason || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'active',
      })
      .select()
      .single()

    if (logError || !log) {
      logger.error('Failed to create impersonation log', { error: logError })
      throw InternalError('Failed to start impersonation session')
    }

    // Create session cookie
    const sessionData: ImpersonationCookie = {
      admin_user_id: user.id,
      impersonated_user_id: targetUserId,
      started_at: startedAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      reason: reason || undefined,
      log_id: log.id,
    }

    // Set secure cookie
    // SECURITY: Always use secure cookies - localhost is treated specially by browsers
    // and will still work with secure: true in development
    cookieStore.set(IMPERSONATION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      expires: expiresAt,
      path: '/',
    })

    const adminUserData = adminData?.users as { email?: string } | null
    const impersonatedUserData = targetUser.users as { email?: string } | null

    const response: StartImpersonationResponse = {
      success: true,
      session: {
        admin_user_id: user.id,
        admin_email: adminUserData?.email || user.email || '',
        impersonated_user_id: targetUserId,
        impersonated_email: impersonatedUserData?.email || '',
        impersonated_role: targetUser.role,
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        reason: reason || undefined,
        log_id: log.id,
      },
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in POST /api/admin/impersonate', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/admin/impersonate
 * Stop impersonating (exit impersonation session)
 */
export async function DELETE(_request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)

    if (!sessionCookie) {
      throw ValidationError('No active impersonation session')
    }

    const sessionData: ImpersonationCookie = JSON.parse(sessionCookie.value)

    // Verify this is the admin who started the session
    if (sessionData.admin_user_id !== user.id) {
      throw AuthorizationError('Session mismatch')
    }

    const supabase = await createClient()

    // Update log with end time
    const endedAt = new Date()
    const { error: updateError } = await supabase
      .from('impersonation_logs')
      .update({
        ended_at: endedAt.toISOString(),
        status: 'ended',
      })
      .eq('id', sessionData.log_id)

    if (updateError) {
      logger.error('Failed to update impersonation log', { error: updateError })
    }

    // Calculate duration
    const startedAt = new Date(sessionData.started_at)
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000)

    // Clear cookie
    cookieStore.delete(IMPERSONATION_COOKIE_NAME)

    const response: StopImpersonationResponse = {
      success: true,
      duration_seconds: durationSeconds,
    }

    return successResponse(response)
  } catch (error) {
    logger.error('Error in DELETE /api/admin/impersonate', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
