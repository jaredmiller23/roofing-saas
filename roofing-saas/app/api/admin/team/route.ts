import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { checkPermission } from '@/lib/auth/check-permission'
import { ApiError, ErrorCode, ValidationError, ConflictError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { z } from 'zod'

interface TeamMember {
  id: string
  user_id: string
  email: string
  name: string | null
  role: string
  status: string
  joined_at: string
  last_sign_in_at: string | null
  deactivated_at: string | null
  deactivation_reason: string | null
}

/**
 * GET /api/admin/team
 * Get list of team members for the tenant
 */
export const GET = withAuth(async (_request: NextRequest, { userId, tenantId }) => {
  try {
    const canView = await checkPermission(userId, 'users', 'view', tenantId)
    if (!canView) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to view team members', 403))
    }

    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Fetch all users in tenant with auth data using view
    const { data: tenantUsers, error: usersError } = await supabase
      .from('tenant_users')
      .select(`
        id,
        user_id,
        role,
        status,
        joined_at,
        deactivated_at,
        deactivation_reason
      `)
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: true })

    if (usersError) {
      logger.error('Error fetching team members', { error: usersError })
      throw InternalError('Failed to fetch team members')
    }

    // Get user details from auth.users via RPC or direct query
    const userIds = tenantUsers?.map(tu => tu.user_id) || []

    // Use service role to query auth.users
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      logger.error('Error fetching auth users', { error: authError })
      throw InternalError('Failed to fetch user details')
    }

    // Create a map of user details
    const userMap = new Map(
      authUsers.users
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, {
          email: u.email || '',
          name: u.user_metadata?.name || null,
          last_sign_in_at: u.last_sign_in_at || null,
        }])
    )

    // Transform to TeamMember format
    const members: TeamMember[] = (tenantUsers || []).map(tu => {
      const authUser = userMap.get(tu.user_id) || { email: '', name: null, last_sign_in_at: null }
      return {
        id: tu.id,
        user_id: tu.user_id,
        email: authUser.email,
        name: authUser.name,
        role: tu.role ?? 'viewer',
        status: tu.status || 'active',
        joined_at: tu.joined_at ?? new Date().toISOString(),
        last_sign_in_at: authUser.last_sign_in_at,
        deactivated_at: tu.deactivated_at || null,
        deactivation_reason: tu.deactivation_reason || null,
      }
    })

    return successResponse({
      members,
      total: members.length,
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/team', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['user', 'admin']).default('user'),
})

/**
 * POST /api/admin/team
 * Invite a new team member
 */
export const POST = withAuth(async (request: NextRequest, { user, tenantId }) => {
  try {
    const canEdit = await checkPermission(user.id, 'users', 'edit', tenantId)
    if (!canEdit) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to invite team members', 403))
    }

    const body = await request.json()
    const validation = inviteSchema.safeParse(body)

    if (!validation.success) {
      throw ValidationError(validation.error.issues[0].message)
    }

    const { email, name, role } = validation.data
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Check if user already exists in auth
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existingUser = existingUsers?.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

    let userId: string

    if (existingUser) {
      // User exists - check if already in tenant
      const { data: existingMember } = await supabase
        .from('tenant_users')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('user_id', existingUser.id)
        .single()

      if (existingMember) {
        throw ConflictError('User is already a member of this team')
      }

      userId = existingUser.id
    } else {
      // Create new auth user
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { name },
      })

      if (createError) {
        logger.error('Error creating user', { error: createError })
        throw InternalError('Failed to create user account')
      }

      userId = newUser.user.id

      // Send password reset email
      await adminClient.auth.admin.generateLink({
        type: 'recovery',
        email,
      })
    }

    // Add user to tenant
    const { data: membership, error: memberError } = await supabase
      .from('tenant_users')
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        role,
      })
      .select()
      .single()

    if (memberError) {
      logger.error('Error adding user to tenant', { error: memberError })
      throw InternalError('Failed to add user to team')
    }

    // Send password reset/invite email via Supabase
    const { error: emailError } = await supabase.auth.resetPasswordForEmail(email)
    if (emailError) {
      logger.warn('Failed to send invite email', { error: emailError })
      // Don't fail the request, just log the warning
    }

    return successResponse({
      member: {
        id: membership.id,
        user_id: userId,
        email,
        name,
        role,
        status: 'active',
        joined_at: membership.joined_at,
        last_sign_in_at: null,
        deactivated_at: null,
        deactivation_reason: null,
      },
      message: `Invited ${name} (${email}) to the team. They will receive an email to set their password.`,
    })
  } catch (error) {
    logger.error('Error in POST /api/admin/team', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
