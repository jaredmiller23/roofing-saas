import { NextRequest } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { UserForImpersonation } from '@/lib/impersonation/types'

interface AuthUserData {
  email: string
  first_name: string | undefined
  last_name: string | undefined
  last_sign_in_at: string | undefined
}

/**
 * GET /api/admin/users
 * Get list of users in the tenant (for impersonation picker)
 * Query params:
 * - exclude_admins: If true, exclude users with role='admin' (default: false)
 */
export const GET = withAuth(async (request: NextRequest, { user, tenantId }) => {
  try {
    // Verify user is admin
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin access required')
    }

    const supabase = await createClient()
    const adminClient = await createAdminClient()
    const searchParams = request.nextUrl.searchParams
    const excludeAdmins = searchParams.get('exclude_admins') === 'true'

    // Fetch all users in tenant with their roles (without auth.users join)
    let query = supabase
      .from('tenant_users')
      .select('user_id, role, joined_at')
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: false })

    // Exclude admins if requested
    if (excludeAdmins) {
      query = query.neq('role', 'admin')
    }

    const { data: tenantUsers, error: usersError } = await query

    if (usersError) {
      logger.error('Error fetching users', { error: usersError })
      throw InternalError('Failed to fetch users')
    }

    // Get user details from auth.users via admin API
    const userIds = tenantUsers?.map(tu => tu.user_id) || []
    const { data: authUsers, error: authError } = await adminClient.auth.admin.listUsers()

    if (authError) {
      logger.error('Error fetching auth users', { error: authError })
      throw InternalError('Failed to fetch user details')
    }

    // Create a map of user details
    const userMap = new Map<string, AuthUserData>(
      authUsers.users
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, {
          email: u.email || '',
          first_name: u.user_metadata?.first_name || u.user_metadata?.name?.split(' ')[0] || undefined,
          last_name: u.user_metadata?.last_name || u.user_metadata?.name?.split(' ')[1] || undefined,
          last_sign_in_at: u.last_sign_in_at || undefined,
        }])
    )

    // Transform to UserForImpersonation format
    const users: UserForImpersonation[] = (tenantUsers || []).map(tu => {
      const authUser = userMap.get(tu.user_id) ?? { email: '', first_name: undefined, last_name: undefined, last_sign_in_at: undefined }
      return {
        id: tu.user_id,
        email: authUser.email,
        first_name: authUser.first_name,
        last_name: authUser.last_name,
        role: tu.role ?? 'viewer',
        last_active: authUser.last_sign_in_at,
        is_admin: tu.role === 'admin',
      }
    })

    return successResponse({
      users,
      total: users.length,
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/users', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
