// =============================================
// Reactivate User API Route
// =============================================
// Route: POST /api/admin/team/[userId]/reactivate
// Purpose: Re-enable a deactivated team member's account
// =============================================

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/team/[userId]/reactivate
 * Reactivate a deactivated team member's account
 */
export const POST = withAuthParams(async (_request: NextRequest, { user, tenantId }, { params }) => {
  try {
    const { userId } = await params

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
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

    // Check if user is deactivated
    if (existingMember.status !== 'deactivated') {
      throw ValidationError('User is not deactivated')
    }

    // Reactivate the user
    const { error: updateError } = await supabase
      .from('tenant_users')
      .update({
        status: 'active',
        // The trigger will clear deactivated_at, deactivated_by, and deactivation_reason
      })
      .eq('id', existingMember.id)

    if (updateError) {
      logger.error('Error reactivating team member', { error: updateError })
      throw InternalError('Failed to reactivate team member')
    }

    logger.info('User reactivated', { userId, reactivatedBy: user.id })

    return successResponse({
      message: 'User has been reactivated',
      user_id: userId,
      status: 'active',
    })
  } catch (error) {
    logger.error('Error in POST /api/admin/team/[userId]/reactivate', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
