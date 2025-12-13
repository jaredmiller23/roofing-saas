import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * Dashboard Metrics API
 * GET /api/dashboard/metrics?scope=user|company
 *
 * Returns comprehensive KPI metrics for the dashboard:
 * - Lead conversion rate
 * - Average job value
 * - Sales cycle length
 * - Doors knocked per day (from activities)
 * - Crew utilization
 * - Gross margin by job type
 * - Customer acquisition cost
 *
 * Scope options:
 * - user: Show only current user's data (created_by = user.id)
 * - company: Show all tenant data (default)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    // Get scope from query params
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'company'

    const supabase = await createClient()

    // Get current date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // === Total Contacts ===
    let contactsQuery = supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (scope === 'user') {
      contactsQuery = contactsQuery.eq('created_by', user.id)
    }

    const { count: totalContacts } = await contactsQuery

    // === Active Projects (in pipeline) ===
    let activeProjectsQuery = supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('status', 'won')
      .neq('status', 'lost')

    if (scope === 'user') {
      activeProjectsQuery = activeProjectsQuery.eq('created_by', user.id)
    }

    const { count: activeProjects } = await activeProjectsQuery

    // === Won Projects (this month) ===
    let wonProjectsThisMonthQuery = supabase
      .from('projects')
      .select('final_value, approved_value, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .gte('updated_at', startOfMonth.toISOString())

    if (scope === 'user') {
      wonProjectsThisMonthQuery = wonProjectsThisMonthQuery.eq('created_by', user.id)
    }

    const { data: wonProjectsThisMonth } = await wonProjectsThisMonthQuery

    const monthlyRevenue = wonProjectsThisMonth?.reduce((sum, p) =>
      sum + (p.final_value || p.approved_value || p.estimated_value || 0), 0
    ) || 0

    // === Revenue Trend (last 6 months) ===
    let revenueDataQuery = supabase
      .from('projects')
      .select('final_value, approved_value, estimated_value, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .gte('updated_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
      .order('updated_at', { ascending: true })

    if (scope === 'user') {
      revenueDataQuery = revenueDataQuery.eq('created_by', user.id)
    }

    const { data: revenueData } = await revenueDataQuery

    // Group revenue by month
    const revenueByMonth: { [key: string]: number } = {}
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      revenueByMonth[monthKey] = 0
    }

    revenueData?.forEach(project => {
      const projectDate = new Date(project.updated_at)
      const monthKey = projectDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      const projectValue = project.final_value || project.approved_value || project.estimated_value || 0
      if (revenueByMonth[monthKey] !== undefined) {
        revenueByMonth[monthKey] += projectValue
      }
    })

    const revenueTrend = Object.entries(revenueByMonth).map(([month, revenue]) => ({
      month,
      revenue
    }))

    // === Lead Conversion Rate ===
    let allProjectsQuery = supabase
      .from('projects')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (scope === 'user') {
      allProjectsQuery = allProjectsQuery.eq('created_by', user.id)
    }

    const { data: allProjects } = await allProjectsQuery

    const totalLeads = allProjects?.length || 0
    const wonLeads = allProjects?.filter(p => p.status === 'won').length || 0
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100) : 0

    // === Average Job Value ===
    let wonProjectsQuery = supabase
      .from('projects')
      .select('final_value, approved_value, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')

    if (scope === 'user') {
      wonProjectsQuery = wonProjectsQuery.eq('created_by', user.id)
    }

    const { data: wonProjects } = await wonProjectsQuery

    const avgJobValue = wonProjects && wonProjects.length > 0
      ? wonProjects.reduce((sum, p) =>
          sum + (p.final_value || p.approved_value || p.estimated_value || 0), 0
        ) / wonProjects.length
      : 0

    // === Sales Cycle Length ===
    let wonProjectsWithDatesQuery = supabase
      .from('projects')
      .select('created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .limit(50)

    if (scope === 'user') {
      wonProjectsWithDatesQuery = wonProjectsWithDatesQuery.eq('created_by', user.id)
    }

    const { data: wonProjectsWithDates } = await wonProjectsWithDatesQuery

    const avgSalesCycle = wonProjectsWithDates && wonProjectsWithDates.length > 0
      ? wonProjectsWithDates.reduce((sum, p) => {
          const days = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / wonProjectsWithDates.length
      : 0

    // === Activities (Doors Knocked) ===
    let activities30DaysQuery = supabase
      .from('activities')
      .select('type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', last30Days.toISOString())

    if (scope === 'user') {
      activities30DaysQuery = activities30DaysQuery.eq('created_by', user.id)
    }

    const { data: activities30Days } = await activities30DaysQuery

    let activities7DaysQuery = supabase
      .from('activities')
      .select('type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', last7Days.toISOString())

    if (scope === 'user') {
      activities7DaysQuery = activities7DaysQuery.eq('created_by', user.id)
    }

    const { data: activities7Days } = await activities7DaysQuery

    const doorsKnocked30Days = activities30Days?.filter(a => a.type === 'door_knock').length || 0
    const doorsKnockedPerDay = doorsKnocked30Days / 30

    const doorsKnocked7Days = activities7Days?.filter(a => a.type === 'door_knock').length || 0

    // === Pipeline by Status ===
    let pipelineDataQuery = supabase
      .from('projects')
      .select('status, final_value, approved_value, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('status', 'won')
      .neq('status', 'lost')

    if (scope === 'user') {
      pipelineDataQuery = pipelineDataQuery.eq('created_by', user.id)
    }

    const { data: pipelineData } = await pipelineDataQuery

    const pipelineByStatus: { [key: string]: { count: number; value: number } } = {}
    pipelineData?.forEach(project => {
      if (!pipelineByStatus[project.status]) {
        pipelineByStatus[project.status] = { count: 0, value: 0 }
      }
      const projectValue = project.final_value || project.approved_value || project.estimated_value || 0
      pipelineByStatus[project.status].count++
      pipelineByStatus[project.status].value += projectValue
    })

    const pipelineStatus = Object.entries(pipelineByStatus).map(([status, data]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count: data.count,
      value: data.value
    }))

    // === Activity Trend (last 7 days) ===
    const activityTrend = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const dayActivities = activities7Days?.filter(a => {
        const activityDate = new Date(a.created_at)
        return activityDate.toDateString() === date.toDateString()
      }) || []

      return {
        date: dateStr,
        count: dayActivities.length,
        doorKnocks: dayActivities.filter(a => a.type === 'door_knock').length,
        calls: dayActivities.filter(a => a.type === 'call').length,
        emails: dayActivities.filter(a => a.type === 'email').length,
      }
    })

    // Return comprehensive metrics
    return successResponse({
      metrics: {
        // Top-level KPIs
        totalContacts: totalContacts || 0,
        activeProjects: activeProjects || 0,
        monthlyRevenue,
        conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
        avgJobValue: Math.round(avgJobValue),
        avgSalesCycle: Math.round(avgSalesCycle * 10) / 10, // Days with 1 decimal
        doorsKnockedPerDay: Math.round(doorsKnockedPerDay * 10) / 10,
        doorsKnocked7Days,

        // Charts data
        revenueTrend,
        pipelineStatus,
        activityTrend,
      }
    })
  } catch (error) {
    logger.error('Dashboard metrics error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
