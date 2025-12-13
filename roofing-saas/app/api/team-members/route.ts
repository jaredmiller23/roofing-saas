import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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
      .order('created_at', { ascending: true })

    if (usersError) {
      logger.error('Error fetching team members:', { error: usersError })
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      )
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
        role: tu.role,
      }
    })

    return NextResponse.json({
      members,
      total: members.length,
    })
  } catch (error) {
    logger.error('Error in GET /api/team-members:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
