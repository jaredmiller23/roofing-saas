import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * GET /api/campaigns/stats
 * Get aggregate campaign statistics for current tenant
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const supabase = await createClient()

    // Get campaign counts by status
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, status')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (campaignsError) {
      logger.error('Error fetching campaigns for stats', { error: campaignsError })
      throw InternalError('Failed to fetch campaign stats')
    }

    const totalCampaigns = campaigns?.length || 0
    const activeCampaigns = campaigns?.filter((c) => c.status === 'active').length || 0
    const pausedCampaigns = campaigns?.filter((c) => c.status === 'paused').length || 0
    const draftCampaigns = campaigns?.filter((c) => c.status === 'draft').length || 0

    // Get enrollment counts
    const { count: totalEnrollments, error: enrollmentError } = await supabase
      .from('campaign_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    if (enrollmentError) {
      logger.error('Error fetching enrollment count', { error: enrollmentError })
    }

    // Get execution counts by status
    // We need to join through enrollments to filter by tenant
    const { data: executionCounts, error: executionError } = await supabase
      .from('campaign_step_executions')
      .select(`
        status,
        campaign_enrollments!inner(tenant_id)
      `)
      .eq('campaign_enrollments.tenant_id', tenantId)

    if (executionError) {
      logger.error('Error fetching execution counts', { error: executionError })
    }

    const executions = executionCounts || []
    const totalExecutions = executions.length
    const completedExecutions = executions.filter((e) => e.status === 'completed').length
    const failedExecutions = executions.filter((e) => e.status === 'failed').length
    const pendingExecutions = executions.filter((e) => e.status === 'pending').length
    const runningExecutions = executions.filter((e) => e.status === 'running').length

    const stats = {
      total_campaigns: totalCampaigns,
      active_campaigns: activeCampaigns,
      paused_campaigns: pausedCampaigns,
      draft_campaigns: draftCampaigns,
      total_enrollments: totalEnrollments || 0,
      total_executions: totalExecutions,
      completed_executions: completedExecutions,
      failed_executions: failedExecutions,
      pending_executions: pendingExecutions,
      running_executions: runningExecutions,
      success_rate:
        totalExecutions > 0
          ? Math.round((completedExecutions / totalExecutions) * 100 * 10) / 10
          : 0,
    }

    return successResponse(stats)
  } catch (error) {
    logger.error('Error in GET /api/campaigns/stats', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
