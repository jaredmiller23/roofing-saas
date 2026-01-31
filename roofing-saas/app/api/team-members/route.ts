import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
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
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()

    // Fetch all users in tenant
    const { data: tenantUsers, error: usersError } = await supabase
      .from('tenant_users')
      .select(
        `
        user_id,
        role,
        users:user_id (
          email,
          raw_user_meta_data
        )
      `
      )
      .eq('tenant_id', tenantId)
      .order('joined_at', { ascending: true })

    if (usersError) {
      logger.error('Error fetching team members:', { error: usersError })
      throw InternalError('Failed to fetch team members')
    }

    // Transform to TeamMember format
    const members: TeamMember[] = (tenantUsers || []).map((tu) => {
      const userData = tu.users as {
        email?: string
        raw_user_meta_data?: {
          first_name?: string
          last_name?: string
          name?: string
        }
      } | null
      const metadata = userData?.raw_user_meta_data || {}

      const firstName = metadata.first_name || metadata.name?.split(' ')[0] || ''
      const lastName = metadata.last_name || metadata.name?.split(' ').slice(1).join(' ') || ''
      const fullName = `${firstName} ${lastName}`.trim() || userData?.email || 'Unknown'

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
}
