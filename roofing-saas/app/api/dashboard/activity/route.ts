import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
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

    // Process projects into activity items
    if (recentProjects) {
      for (const project of recentProjects) {
        const contactArray = project.contacts as { first_name: string; last_name: string }[] | null
        const contact = contactArray?.[0] || null
        const contactName = contact
          ? `${contact.first_name} ${contact.last_name}`.trim()
          : project.name

        if (project.status === 'won') {
          activities.push({
            id: `project_won_${project.id}`,
            type: 'project_won',
            title: 'Deal Won! 🎉',
            description: `Closed deal with ${contactName}`,
            timestamp: project.updated_at,
            metadata: {
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
              project_name: project.name,
              value: project.estimated_value || 0
            }
          })
        }
      }
    }

    // Get recent contacts (last 7 days)
    const { data: recentContacts } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, created_at, stage')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10)

    if (recentContacts) {
      for (const contact of recentContacts) {
        const contactName = `${contact.first_name} ${contact.last_name}`.trim()
        activities.push({
          id: `contact_added_${contact.id}`,
          type: 'contact_added',
          title: 'New Contact',
          description: `${contactName} added to ${contact.stage || 'pipeline'}`,
          timestamp: contact.created_at,
          metadata: {
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch activity feed'
      },
      { status: 500 }
    )
  }
}
