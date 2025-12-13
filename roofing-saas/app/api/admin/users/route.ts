import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import type { UserForImpersonation } from '@/lib/impersonation/types'

/**
 * GET /api/admin/users
 * Get list of users in the tenant (for impersonation picker)
 * Query params:
 * - exclude_admins: If true, exclude users with role='admin' (default: false)
 */
export async function GET(request: NextRequest) {
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

    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const excludeAdmins = searchParams.get('exclude_admins') === 'true'

    // Fetch all users in tenant with their roles
    let query = supabase
      .from('tenant_users')
      .select(
        `
        user_id,
        role,
        users:user_id (
          email,
          raw_user_meta_data,
          last_sign_in_at
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Exclude admins if requested
    if (excludeAdmins) {
      query = query.neq('role', 'admin')
    }

    const { data: tenantUsers, error: usersError } = await query

    if (usersError) {
      logger.error('Error fetching users', { error: usersError })
      throw InternalError('Failed to fetch users')
    }

    // Transform to UserForImpersonation format
    const users: UserForImpersonation[] = (tenantUsers || []).map(
      (tu) => {
        const userData = tu.users as { email?: string; raw_user_meta_data?: { first_name?: string; last_name?: string; name?: string }; last_sign_in_at?: string } | null
        const metadata = userData?.raw_user_meta_data || {}

        return {
          id: tu.user_id,
          email: userData?.email || '',
          first_name: metadata.first_name || metadata.name?.split(' ')[0],
          last_name: metadata.last_name || metadata.name?.split(' ')[1],
          role: tu.role,
          last_active: userData?.last_sign_in_at,
          is_admin: tu.role === 'admin',
        }
      }
    )

    return successResponse({
      users,
      total: users.length,
    })
  } catch (error) {
    logger.error('Error in GET /api/admin/users', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
