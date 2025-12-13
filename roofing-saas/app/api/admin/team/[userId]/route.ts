import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ userId: string }>
}

const updateRoleSchema = z.object({
  role: z.enum(['user', 'admin', 'owner']),
})

/**
 * PATCH /api/admin/team/[userId]
 * Update a team member's role
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const body = await request.json()
    const validation = updateRoleSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const { role } = validation.data
    const supabase = await createClient()

    // Check if target user exists in tenant
    const { data: existingMember, error: findError } = await supabase
      .from('tenant_users')
      .select('id, role, user_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (findError || !existingMember) {
      throw NotFoundError('Team member not found')
    }

    // Cannot change owner role
    if (existingMember.role === 'owner') {
      throw ValidationError('Cannot modify the owner role')
    }

    // Cannot set owner role (must be transferred via separate process)
    if (role === 'owner') {
      throw ValidationError('Owner role cannot be assigned directly')
    }

    // Cannot change your own role
    if (existingMember.user_id === user.id) {
      throw ValidationError('You cannot change your own role')
    }

    // Update the role
    const { error: updateError } = await supabase
      .from('tenant_users')
      .update({ role })
      .eq('id', existingMember.id)

    if (updateError) {
      logger.error('Error updating member role', { error: updateError })
      throw InternalError('Failed to update team member role')
    }

    return successResponse({
      message: `Updated role to ${role}`,
      user_id: userId,
      role,
    })
  } catch (error) {
    logger.error('Error in PATCH /api/admin/team/[userId]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * DELETE /api/admin/team/[userId]
 * Remove a team member from the tenant
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const supabase = await createClient()

    // Check if target user exists in tenant
    const { data: existingMember, error: findError } = await supabase
      .from('tenant_users')
      .select('id, role, user_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .single()

    if (findError || !existingMember) {
      throw NotFoundError('Team member not found')
    }

    // Cannot remove owner
    if (existingMember.role === 'owner') {
      throw ValidationError('Cannot remove the tenant owner')
    }

    // Cannot remove yourself
    if (existingMember.user_id === user.id) {
      throw ValidationError('You cannot remove yourself from the team')
    }

    // Remove the membership
    const { error: deleteError } = await supabase
      .from('tenant_users')
      .delete()
      .eq('id', existingMember.id)

    if (deleteError) {
      logger.error('Error removing team member', { error: deleteError })
      throw InternalError('Failed to remove team member')
    }

    return successResponse({
      message: 'Team member removed successfully',
      user_id: userId,
    })
  } catch (error) {
    logger.error('Error in DELETE /api/admin/team/[userId]', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
