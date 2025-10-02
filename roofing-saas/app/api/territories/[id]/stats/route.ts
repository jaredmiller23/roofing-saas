import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/territories/[id]/stats
 * Get statistics for a territory
 *
 * Returns:
 * - Total contacts in territory
 * - Contacts by pipeline stage
 * - Total projects in territory
 * - Projects by status
 * - Photos taken in territory
 * - Activities in territory
 * - Recent activity
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()

  try {
    // Authenticate user
    const user = await getCurrentUser()
    if (!user) {
      return errorResponse(new Error('User not authenticated'), 401)
    }

    // Get tenant ID
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return errorResponse(new Error('No tenant found for user'), 403)
    }

    const { id } = await params
    const supabase = await createClient()
    const territoryId = id

    // Verify territory exists and belongs to tenant
    const { data: territory, error: territoryError } = await supabase
      .from('territories')
      .select('*')
      .eq('id', territoryId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (territoryError || !territory) {
      return errorResponse(new Error('Territory not found'), 404)
    }

    // For now, we'll return basic stats
    // In a production app, you'd typically store territory_id on contacts
    // or use PostGIS to query contacts within the territory boundary

    // Count contacts (simplified - would need territory assignment field)
    const { count: contactCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Count projects (simplified)
    const { count: projectCount } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Count photos (simplified)
    const { count: photoCount } = await supabase
      .from('photos')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Count activities (simplified)
    const { count: activityCount } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // Get pipeline stage breakdown
    const { data: stageBreakdown } = await supabase
      .from('contacts')
      .select('pipeline_stage')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    const stageStats = stageBreakdown?.reduce((acc: Record<string, number>, contact: Record<string, unknown>) => {
      const stage = (contact.pipeline_stage as string) || 'unassigned'
      acc[stage] = (acc[stage] || 0) + 1
      return acc
    }, {}) || {}

    // Get project status breakdown
    const { data: projectStatusData } = await supabase
      .from('projects')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    const projectStatusStats = projectStatusData?.reduce((acc: Record<string, number>, project: Record<string, unknown>) => {
      const status = (project.status as string) || 'unknown'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {}) || {}

    // Get recent activities (last 10)
    const { data: recentActivities, error: activitiesError } = await supabase
      .from('activities')
      .select('id, activity_type, notes, created_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10)

    const duration = Date.now() - startTime
    logger.apiResponse('GET', `/api/territories/${territoryId}/stats`, 200, duration)

    return successResponse({
      territory_id: territoryId,
      territory_name: territory.name,
      assigned_to: territory.assigned_to,
      stats: {
        contacts: {
          total: contactCount || 0,
          by_stage: stageStats,
        },
        projects: {
          total: projectCount || 0,
          by_status: projectStatusStats,
        },
        photos: {
          total: photoCount || 0,
        },
        activities: {
          total: activityCount || 0,
          recent: recentActivities || [],
        },
      },
      note: 'Territory stats are simplified. In production, contacts/projects should be explicitly assigned to territories for accurate metrics.',
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Territory stats error', { error, duration })
    return errorResponse(error as Error)
  }
}
