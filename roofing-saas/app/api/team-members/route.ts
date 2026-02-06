import { createClient } from '@/lib/supabase/server'
import { withAuth, type AuthContext } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export interface TeamMember {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name: string
  role: string
}

/**
 * GET /api/team-members
 * Get list of team members in the current tenant
 * Available to all authenticated users (for event assignment, etc.)
 */
export const GET = withAuth(async (_request, { tenantId }: AuthContext) => {
  try {
    const supabase = await createClient()

    // Step 1: Fetch tenant_users for this tenant
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from('tenant_users')
      .select('user_id, role')
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: true })

    if (tenantUsersError) {
      logger.error('Error fetching tenant users:', { error: tenantUsersError })
      throw InternalError('Failed to fetch team members')
    }

    if (!tenantUsers || tenantUsers.length === 0) {
      return successResponse({ members: [], total: 0 })
    }

    // Step 2: Fetch user details from public.users table
    const userIds = tenantUsers.map(tu => tu.user_id)
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .in('id', userIds)

    if (usersError) {
      logger.error('Error fetching user details:', { error: usersError })
      throw InternalError('Failed to fetch team member details')
    }

    // Create a lookup map for user data
    const userMap = new Map(
      (usersData || []).map(u => [u.id, u])
    )

    // Step 3: Join the data in code
    const members: TeamMember[] = tenantUsers.map((tu) => {
      const userData = userMap.get(tu.user_id)
      const metadata = (userData?.raw_user_meta_data as {
        first_name?: string
        last_name?: string
        name?: string
        full_name?: string
      }) || {}

      // Try multiple sources for name
      const fullNameFromMeta = metadata.full_name || metadata.name || ''
      const firstName = metadata.first_name || fullNameFromMeta.split(' ')[0] || ''
      const lastName = metadata.last_name || fullNameFromMeta.split(' ').slice(1).join(' ') || ''
      const fullName = fullNameFromMeta || `${firstName} ${lastName}`.trim() || userData?.email || 'Unknown'

      return {
        id: tu.user_id,
        email: userData?.email || '',
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        role: tu.role ?? 'viewer',
      }
    })

    return successResponse({
      members,
      total: members.length,
    })
  } catch (error) {
    logger.error('Error in GET /api/team-members:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
