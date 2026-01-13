import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

interface ActivityItem {
  id: string
  type: 'project_won' | 'project_lost' | 'project_created' | 'contact_added' | 'status_change'
  title: string
  description: string
  timestamp: string
  metadata?: {
    user?: string
    value?: number
    project_name?: string
    contact_name?: string
    old_status?: string
    new_status?: string
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('Unauthorized')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()
    const activities: ActivityItem[] = []

    // Get recent projects with status changes (last 7 days)
    const { data: recentProjects } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        status,
        estimated_value,
        approved_value,
        final_value,
        created_at,
        updated_at,
        created_by,
        contact_id,
        contacts:contact_id (
          first_name,
          last_name
        )
      `)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('updated_at', { ascending: false })
      .limit(20)

    // Get recent contacts (last 7 days)
    const { data: recentContacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, created_at, created_by, stage')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    // Collect all unique user IDs for batch lookup
    const userIds = new Set<string>()
    if (recentProjects) {
      for (const project of recentProjects) {
        if (project.created_by) userIds.add(project.created_by)
      }
    }
    if (recentContacts) {
      for (const contact of recentContacts) {
        if (contact.created_by) userIds.add(contact.created_by)
      }
    }

    // Batch lookup user names from tenant_users -> auth.users
    const userMap = new Map<string, string>()
    if (userIds.size > 0) {
      const { data: users } = await supabase
        .from('tenant_users')
        .select(`
          user_id,
          users:user_id (
            email,
            raw_user_meta_data
          )
        `)
        .eq('tenant_id', tenantId)
        .in('user_id', Array.from(userIds))

      if (users) {
        for (const tu of users) {
          const userData = tu.users as {
            email?: string
            raw_user_meta_data?: {
              first_name?: string
              last_name?: string
              name?: string
              full_name?: string
            }
          } | null
          const metadata = userData?.raw_user_meta_data || {}
          const firstName = metadata.first_name || metadata.name?.split(' ')[0] || ''
          const lastName = metadata.last_name || metadata.name?.split(' ').slice(1).join(' ') || ''
          const fullName = metadata.full_name || `${firstName} ${lastName}`.trim() || userData?.email?.split('@')[0] || 'Team Member'
          userMap.set(tu.user_id, fullName)
        }
      }
    }

    // Helper to get user name from map
    const getUserName = (userId: string | null | undefined): string => {
      if (!userId) return 'Team Member'
      return userMap.get(userId) || 'Team Member'
    }

    // Process projects into activity items
    if (recentProjects) {
      for (const project of recentProjects) {
        // Supabase join returns single object for many-to-one, but TypeScript infers array
        const contactData = project.contacts as unknown as { first_name: string; last_name: string } | null
        const contactName = contactData
          ? `${contactData.first_name} ${contactData.last_name}`.trim()
          : project.name
        const userName = getUserName(project.created_by)

        if (project.status === 'won') {
          activities.push({
            id: `project_won_${project.id}`,
            type: 'project_won',
            title: 'Deal Won! 🎉',
            description: `Closed deal with ${contactName}`,
            timestamp: project.updated_at,
            metadata: {
              user: userName,
              project_name: project.name,
              contact_name: contactName,
              value: project.final_value || project.approved_value || project.estimated_value || 0
            }
          })
        } else if (project.status === 'lost') {
          activities.push({
            id: `project_lost_${project.id}`,
            type: 'project_lost',
            title: 'Deal Lost',
            description: `${contactName} - ${project.name}`,
            timestamp: project.updated_at,
            metadata: {
              user: userName,
              project_name: project.name,
              contact_name: contactName
            }
          })
        } else if (project.created_at === project.updated_at) {
          // New project
          activities.push({
            id: `project_created_${project.id}`,
            type: 'project_created',
            title: 'New Project',
            description: `${project.name} added to pipeline`,
            timestamp: project.created_at,
            metadata: {
              user: userName,
              project_name: project.name,
              value: project.estimated_value || 0
            }
          })
        }
      }
    }

    // Process contacts into activity items
    if (recentContacts) {
      for (const contact of recentContacts) {
        const contactName = `${contact.first_name} ${contact.last_name}`.trim()
        const userName = getUserName(contact.created_by)
        activities.push({
          id: `contact_added_${contact.id}`,
          type: 'contact_added',
          title: 'New Contact',
          description: `${contactName} added to ${contact.stage || 'pipeline'}`,
          timestamp: contact.created_at,
          metadata: {
            user: userName,
            contact_name: contactName
          }
        })
      }
    }

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    // Limit to most recent 15
    const limitedActivities = activities.slice(0, 15)

    return NextResponse.json({
      success: true,
      data: {
        activities: limitedActivities,
        count: limitedActivities.length
      }
    })
  } catch (error) {
    console.error('Error fetching activity feed:', error)
    return errorResponse(error as Error)
  }
}
