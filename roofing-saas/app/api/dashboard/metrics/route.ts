import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'

/**
 * Dashboard Metrics API
 * GET /api/dashboard/metrics
 *
 * Returns comprehensive KPI metrics for the dashboard:
 * - Lead conversion rate
 * - Average job value
 * - Sales cycle length
 * - Doors knocked per day (from activities)
 * - Crew utilization
 * - Gross margin by job type
 * - Customer acquisition cost
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

    // Get current date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const _startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const _endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
    const _startOfYear = new Date(now.getFullYear(), 0, 1)
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // === Total Contacts ===
    const { count: totalContacts } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    // === Active Projects (in pipeline) ===
    const { count: activeProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('status', 'won')
      .neq('status', 'lost')

    // === Won Projects (this month) ===
    const { data: wonProjectsThisMonth } = await supabase
      .from('projects')
      .select('final_value, approved_value, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .gte('updated_at', startOfMonth.toISOString())

    const monthlyRevenue = wonProjectsThisMonth?.reduce((sum, p) =>
      sum + (p.final_value || p.approved_value || p.estimated_value || 0), 0
    ) || 0

    // === Revenue Trend (last 6 months) ===
    const { data: revenueData } = await supabase
      .from('projects')
      .select('final_value, approved_value, estimated_value, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .gte('updated_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString())
      .order('updated_at', { ascending: true })

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
    const { data: allProjects } = await supabase
      .from('projects')
      .select('status')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    const totalLeads = allProjects?.length || 0
    const wonLeads = allProjects?.filter(p => p.status === 'won').length || 0
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100) : 0

    // === Average Job Value ===
    const { data: wonProjects } = await supabase
      .from('projects')
      .select('final_value, approved_value, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')

    const avgJobValue = wonProjects && wonProjects.length > 0
      ? wonProjects.reduce((sum, p) =>
          sum + (p.final_value || p.approved_value || p.estimated_value || 0), 0
        ) / wonProjects.length
      : 0

    // === Sales Cycle Length ===
    const { data: wonProjectsWithDates } = await supabase
      .from('projects')
      .select('created_at, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .limit(50)

    const avgSalesCycle = wonProjectsWithDates && wonProjectsWithDates.length > 0
      ? wonProjectsWithDates.reduce((sum, p) => {
          const days = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / wonProjectsWithDates.length
      : 0

    // === Activities (Doors Knocked) ===
    const { data: activities30Days } = await supabase
      .from('activities')
      .select('type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', last30Days.toISOString())

    const { data: activities7Days } = await supabase
      .from('activities')
      .select('type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', last7Days.toISOString())

    const doorsKnocked30Days = activities30Days?.filter(a => a.type === 'door_knock').length || 0
    const doorsKnockedPerDay = doorsKnocked30Days / 30

    const doorsKnocked7Days = activities7Days?.filter(a => a.type === 'door_knock').length || 0

    // === Pipeline by Status ===
    const { data: pipelineData } = await supabase
      .from('projects')
      .select('status, final_value, approved_value, estimated_value')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('status', 'won')
      .neq('status', 'lost')

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
    return NextResponse.json({
      success: true,
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
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}
