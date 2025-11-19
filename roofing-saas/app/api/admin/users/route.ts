import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId, isAdmin } from '@/lib/auth/session'
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
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
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

    return NextResponse.json({
      users,
      total: users.length,
    })
  } catch (error) {
    console.error('Error in GET /api/admin/users:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
