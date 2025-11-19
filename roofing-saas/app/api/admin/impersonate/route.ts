import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { cookies } from 'next/headers'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    // Check if already impersonating
    const cookieStore = await cookies()
    const existingSession = cookieStore.get(IMPERSONATION_COOKIE_NAME)
    if (existingSession) {
      return NextResponse.json(
        { error: 'Already impersonating another user. Please exit current session first.' },
        { status: 409 }
      )
    }

    const body: StartImpersonationRequest = await request.json()
    const { user_id: targetUserId, reason } = body

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      )
    }

    // Prevent self-impersonation
    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot impersonate yourself' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: 'Target user not found in your tenant' },
        { status: 404 }
      )
    }

    // Prevent impersonating another admin
    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot impersonate another admin' },
        { status: 403 }
      )
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
      console.error('Failed to create impersonation log:', logError)
      return NextResponse.json(
        { error: 'Failed to start impersonation session' },
        { status: 500 }
      )
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
    cookieStore.set(IMPERSONATION_COOKIE_NAME, JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in POST /api/admin/impersonate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get(IMPERSONATION_COOKIE_NAME)

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'No active impersonation session' },
        { status: 400 }
      )
    }

    const sessionData: ImpersonationCookie = JSON.parse(sessionCookie.value)

    // Verify this is the admin who started the session
    if (sessionData.admin_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Session mismatch' },
        { status: 403 }
      )
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
      console.error('Failed to update impersonation log:', updateError)
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

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in DELETE /api/admin/impersonate:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
