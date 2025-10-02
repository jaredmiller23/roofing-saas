import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * Projects Filters API
 * GET /api/projects/filters - Get available filter options
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

    // Fetch all projects to extract unique filter values
    const { data: projects, error } = await supabase
      .from('projects')
      .select('custom_fields')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('custom_fields->>proline_pipeline', 'OLD RECRUITING') // Exclude HR data

    if (error) {
      console.error('Filters fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Extract unique values
    const pipelinesSet = new Set<string>()
    const stagesSet = new Set<string>()
    const assigneesSet = new Set<string>()

    projects?.forEach((project) => {
      const customFields = project.custom_fields as any

      if (customFields?.proline_pipeline) {
        pipelinesSet.add(customFields.proline_pipeline)
      }
      if (customFields?.proline_stage) {
        stagesSet.add(customFields.proline_stage)
      }
      if (customFields?.assigned_to) {
        assigneesSet.add(customFields.assigned_to)
      }
    })

    // Convert to sorted arrays
    const pipelines = Array.from(pipelinesSet).sort()
    const stages = Array.from(stagesSet).sort()
    const assignees = Array.from(assigneesSet).sort()

    return NextResponse.json({
      success: true,
      pipelines,
      stages,
      assignees,
    })
  } catch (error) {
    console.error('Filters API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
