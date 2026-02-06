// =============================================
// Deactivate User API Route
// =============================================
// Route: POST /api/admin/team/[userId]/deactivate
// Purpose: Soft-disable a team member's account
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { revokeAllOtherSessions } from '@/lib/auth/sessions'
import { AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const deactivateSchema = z.object({
  reason: z.string().optional(),
})

/**
 * POST /api/admin/team/[userId]/deactivate
 * Deactivate a team member's account
 */
export const POST = withAuthParams(async (request: NextRequest, { user, tenantId }, { params }) => {
  try {
    const { userId } = await params

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    // Parse optional reason from body
    let reason: string | undefined
    try {
      const body = await request.json()
      const validation = deactivateSchema.safeParse(body)
      if (validation.success) {
        reason = validation.data.reason
      }
    } catch {
      // No body is fine
    }

    const supabase = await createClient()

    // Check if target user exists in tenant
    const { data: existingMember, error: findError } = await supabase
      .from('tenant_users')
      .select('id, role, user_id, status')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (findError || !existingMember) {
      throw NotFoundError('Team member not found')
    }

    // Cannot deactivate owner
    if (existingMember.role === 'owner') {
      throw ValidationError('Cannot deactivate the tenant owner')
    }

    // Cannot deactivate yourself
    if (existingMember.user_id === user.id) {
      throw ValidationError('You cannot deactivate yourself')
    }

    // Check if already deactivated
    if (existingMember.status === 'deactivated') {
      throw ValidationError('User is already deactivated')
    }

    // Deactivate the user
    const { error: updateError } = await supabase
      .from('tenant_users')
      .update({
        status: 'deactivated',
        deactivated_by: user.id,
        deactivation_reason: reason || null,
      })
      .eq('id', existingMember.id)

    if (updateError) {
      logger.error('Error deactivating team member', { error: updateError })
      throw InternalError('Failed to deactivate team member')
    }

    // Revoke all active sessions for this user
    try {
      await revokeAllOtherSessions(userId, undefined) // Pass undefined to revoke ALL sessions
    } catch (sessionError) {
      logger.warn('Failed to revoke sessions for deactivated user', { error: sessionError, userId })
      // Continue even if session revocation fails - user is still deactivated
    }

    logger.info('User deactivated', { userId, deactivatedBy: user.id, reason })

    return successResponse({
      message: 'User has been deactivated',
      user_id: userId,
      status: 'deactivated',
    })
  } catch (error) {
    logger.error('Error in POST /api/admin/team/[userId]/deactivate', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
