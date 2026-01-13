/**
 * ARIA Analytics & Coaching Functions (Phase 12)
 *
 * Provides ARIA with business intelligence capabilities:
 * - Daily summaries and performance snapshots
 * - Sales metrics and conversion analysis
 * - Call/activity analytics
 * - Bottleneck identification
 * - AI-powered coaching recommendations
 * - Period comparisons
 */

import { ariaFunctionRegistry } from '../function-registry'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get date range for a period
 */
function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const end = new Date(now)
  const start = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'yesterday':
      start.setDate(start.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'this_week':
      const dayOfWeek = start.getDay()
      start.setDate(start.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
      break
    case 'last_week':
      const lastWeekDay = start.getDay()
      start.setDate(start.getDate() - lastWeekDay - 7)
      start.setHours(0, 0, 0, 0)
      end.setDate(end.getDate() - lastWeekDay - 1)
      end.setHours(23, 59, 59, 999)
      break
    case 'this_month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'last_month':
      start.setMonth(start.getMonth() - 1)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setDate(0) // Last day of previous month
      end.setHours(23, 59, 59, 999)
      break
    case 'last_30_days':
      start.setDate(start.getDate() - 30)
      break
    case 'last_90_days':
      start.setDate(start.getDate() - 90)
      break
    case 'this_quarter':
      const quarter = Math.floor(start.getMonth() / 3)
      start.setMonth(quarter * 3)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'this_year':
      start.setMonth(0)
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    default:
      start.setDate(start.getDate() - 30)
  }

  return { start, end }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return amount > 0 ? `$${amount.toLocaleString()}` : '$0'
}

/**
 * Format percentage for display
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/**
 * Calculate percentage change
 */
function calculateChange(current: number, previous: number): { value: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    return { value: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' }
  }
  const change = ((current - previous) / previous) * 100
  return {
    value: Math.abs(change),
    direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'flat',
  }
}

// =============================================================================
// ARIA Function: Get Daily Summary
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_daily_summary',
  category: 'reporting',
  description: 'Get a comprehensive summary of business performance for today or a specific day.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_daily_summary',
    description:
      'Get a daily business performance summary. Use for questions like "How did we do today?" or "Give me a summary of yesterday"',
    parameters: {
      type: 'object',
      properties: {
        date: {
          type: 'string',
          description: 'The date to summarize: "today", "yesterday", or a specific date (YYYY-MM-DD)',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { date = 'today' } = args as { date?: string }

      // Determine date range
      let targetDate = new Date()
      if (date === 'yesterday') {
        targetDate.setDate(targetDate.getDate() - 1)
      } else if (date !== 'today' && date) {
        targetDate = new Date(date)
      }

      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)

      // Get yesterday for comparison
      const yesterdayStart = new Date(startOfDay)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)
      const yesterdayEnd = new Date(yesterdayStart)
      yesterdayEnd.setHours(23, 59, 59, 999)

      // Fetch data in parallel
      const [
        activitiesResult,
        yesterdayActivitiesResult,
        newLeadsResult,
        wonDealsResult,
        lostDealsResult,
        estimatesSentResult,
        tasksCompletedResult,
      ] = await Promise.all([
        // Today's activities
        supabase
          .from('activities')
          .select('type, direction')
          .eq('tenant_id', context.tenantId)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),

        // Yesterday's activities for comparison
        supabase
          .from('activities')
          .select('type')
          .eq('tenant_id', context.tenantId)
          .gte('created_at', yesterdayStart.toISOString())
          .lte('created_at', yesterdayEnd.toISOString()),

        // New leads today
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString()),

        // Won deals today
        supabase
          .from('projects')
          .select('final_value, approved_value, estimated_value')
          .eq('tenant_id', context.tenantId)
          .eq('status', 'won')
          .gte('updated_at', startOfDay.toISOString())
          .lte('updated_at', endOfDay.toISOString()),

        // Lost deals today
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .eq('status', 'lost')
          .gte('updated_at', startOfDay.toISOString())
          .lte('updated_at', endOfDay.toISOString()),

        // Estimates sent today
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .eq('pipeline_stage', 'quote_sent')
          .gte('updated_at', startOfDay.toISOString())
          .lte('updated_at', endOfDay.toISOString()),

        // Tasks completed today
        supabase
          .from('tasks')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .eq('status', 'completed')
          .gte('completed_at', startOfDay.toISOString())
          .lte('completed_at', endOfDay.toISOString()),
      ])

      const activities = activitiesResult.data || []
      const yesterdayActivities = yesterdayActivitiesResult.data || []

      // Count activities by type
      const callsToday = activities.filter((a) => a.type === 'call').length
      const callsYesterday = yesterdayActivities.filter((a) => a.type === 'call').length
      const doorKnocksToday = activities.filter((a) => a.type === 'door_knock').length
      const doorKnocksYesterday = yesterdayActivities.filter((a) => a.type === 'door_knock').length
      const emailsToday = activities.filter((a) => a.type === 'email').length
      const smsToday = activities.filter((a) => a.type === 'sms').length

      // Calculate won revenue
      const wonDeals = wonDealsResult.data || []
      const revenueWon = wonDeals.reduce(
        (sum, d) => sum + (d.final_value || d.approved_value || d.estimated_value || 0),
        0
      )

      const dateStr = targetDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })

      return {
        success: true,
        date: dateStr,
        summary: {
          activities: {
            total: activities.length,
            calls: callsToday,
            door_knocks: doorKnocksToday,
            emails: emailsToday,
            sms: smsToday,
            vs_yesterday: calculateChange(activities.length, yesterdayActivities.length),
          },
          leads: {
            new: newLeadsResult.count || 0,
          },
          deals: {
            won: wonDeals.length,
            lost: lostDealsResult.count || 0,
            revenue_won: formatCurrency(revenueWon),
          },
          estimates_sent: estimatesSentResult.count || 0,
          tasks_completed: tasksCompletedResult.count || 0,
        },
        highlights: [
          wonDeals.length > 0 ? `Won ${wonDeals.length} deal(s) worth ${formatCurrency(revenueWon)}` : null,
          newLeadsResult.count && newLeadsResult.count > 0 ? `${newLeadsResult.count} new lead(s)` : null,
          callsToday > callsYesterday ? `Calls up ${callsToday - callsYesterday} from yesterday` : null,
          doorKnocksToday > doorKnocksYesterday
            ? `Door knocks up ${doorKnocksToday - doorKnocksYesterday} from yesterday`
            : doorKnocksToday > 10
              ? `Strong door knocking day: ${doorKnocksToday} knocks`
              : null,
        ].filter(Boolean),
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_daily_summary', { error })
      return { success: false, error: 'Failed to generate daily summary' }
    }
  },
})

// =============================================================================
// ARIA Function: Get Sales Metrics
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_sales_metrics',
  category: 'reporting',
  description: 'Get key sales performance metrics including close rate, average deal size, and pipeline value.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_sales_metrics',
    description:
      'Get sales performance metrics. Use for questions like "What\'s our close rate?" or "How is our pipeline looking?"',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description:
            'Time period: "this_month", "last_month", "this_quarter", "last_30_days", "last_90_days", "this_year"',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { period = 'this_month' } = args as { period?: string }

      const { start, end } = getDateRange(period)

      // Fetch data in parallel
      const [
        pipelineResult,
        wonResult,
        lostResult,
        allProjectsResult,
      ] = await Promise.all([
        // Pipeline summary
        supabase.rpc('get_pipeline_summary', { p_tenant_id: context.tenantId }),

        // Won projects in period
        supabase
          .from('projects')
          .select('final_value, approved_value, estimated_value, created_at, updated_at')
          .eq('tenant_id', context.tenantId)
          .eq('status', 'won')
          .eq('is_deleted', false)
          .gte('updated_at', start.toISOString())
          .lte('updated_at', end.toISOString()),

        // Lost projects in period
        supabase
          .from('projects')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', context.tenantId)
          .eq('status', 'lost')
          .eq('is_deleted', false)
          .gte('updated_at', start.toISOString())
          .lte('updated_at', end.toISOString()),

        // All closed projects for close rate
        supabase
          .from('projects')
          .select('status')
          .eq('tenant_id', context.tenantId)
          .eq('is_deleted', false)
          .in('status', ['won', 'lost'])
          .gte('updated_at', start.toISOString())
          .lte('updated_at', end.toISOString()),
      ])

      const wonProjects = wonResult.data || []
      const lostCount = lostResult.count || 0
      const allClosed = allProjectsResult.data || []

      // Calculate metrics
      const totalWon = wonProjects.length
      const totalRevenue = wonProjects.reduce(
        (sum, p) => sum + (p.final_value || p.approved_value || p.estimated_value || 0),
        0
      )
      const avgDealSize = totalWon > 0 ? totalRevenue / totalWon : 0

      // Close rate
      const totalClosed = allClosed.length
      const closeRate = totalClosed > 0 ? (totalWon / totalClosed) * 100 : 0

      // Average sales cycle
      const salesCycles = wonProjects.map((p) => {
        const created = new Date(p.created_at)
        const closed = new Date(p.updated_at)
        return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
      })
      const avgSalesCycle =
        salesCycles.length > 0
          ? salesCycles.reduce((a, b) => a + b, 0) / salesCycles.length
          : 0

      // Pipeline value
      const pipelineData = (pipelineResult.data || []) as Array<{
        status: string
        count: number
        total_value: number
      }>
      const totalPipelineValue = pipelineData.reduce(
        (sum, p) => sum + Number(p.total_value),
        0
      )
      const totalPipelineDeals = pipelineData.reduce(
        (sum, p) => sum + Number(p.count),
        0
      )

      return {
        success: true,
        period,
        metrics: {
          close_rate: formatPercent(closeRate),
          average_deal_size: formatCurrency(avgDealSize),
          average_sales_cycle: `${avgSalesCycle.toFixed(1)} days`,
          total_revenue: formatCurrency(totalRevenue),
          deals_won: totalWon,
          deals_lost: lostCount,
        },
        pipeline: {
          total_value: formatCurrency(totalPipelineValue),
          total_deals: totalPipelineDeals,
          breakdown: pipelineData.map((p) => ({
            stage: p.status,
            deals: Number(p.count),
            value: formatCurrency(Number(p.total_value)),
          })),
        },
        insights: [
          closeRate > 30 ? 'Strong close rate - above industry average' : null,
          closeRate < 20 ? 'Close rate below target - review lost deal reasons' : null,
          avgSalesCycle > 60 ? 'Long sales cycle - look for ways to accelerate' : null,
          totalPipelineValue > totalRevenue * 3 ? 'Healthy pipeline coverage' : null,
        ].filter(Boolean),
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_sales_metrics', { error })
      return { success: false, error: 'Failed to get sales metrics' }
    }
  },
})

// =============================================================================
// ARIA Function: Get Activity Analytics
// =============================================================================

ariaFunctionRegistry.register({
  name: 'get_activity_analytics',
  category: 'reporting',
  description: 'Get analytics on calls, emails, door knocks, and other activities.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'get_activity_analytics',
    description:
      'Get activity analytics. Use for questions like "How many calls did we make this week?" or "What\'s our activity level?"',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          description: 'Time period: "today", "this_week", "last_week", "this_month", "last_30_days"',
        },
        activity_type: {
          type: 'string',
          description: 'Filter by type: "call", "email", "sms", "door_knock", or "all"',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { period = 'this_week', activity_type = 'all' } = args as {
        period?: string
        activity_type?: string
      }

      const { start, end } = getDateRange(period)

      // Get previous period for comparison
      const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const prevStart = new Date(start)
      prevStart.setDate(prevStart.getDate() - periodDays)
      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)

      // Build queries
      let currentQuery = supabase
        .from('activities')
        .select('type, direction, created_by, created_at')
        .eq('tenant_id', context.tenantId)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())

      let prevQuery = supabase
        .from('activities')
        .select('type')
        .eq('tenant_id', context.tenantId)
        .gte('created_at', prevStart.toISOString())
        .lte('created_at', prevEnd.toISOString())

      if (activity_type !== 'all') {
        currentQuery = currentQuery.eq('type', activity_type)
        prevQuery = prevQuery.eq('type', activity_type)
      }

      const [currentResult, prevResult] = await Promise.all([currentQuery, prevQuery])

      const activities = currentResult.data || []
      const prevActivities = prevResult.data || []

      // Group by type
      const byType: Record<string, number> = {}
      for (const activity of activities) {
        byType[activity.type] = (byType[activity.type] || 0) + 1
      }

      // Group by day for trend
      const byDay: Record<string, number> = {}
      for (const activity of activities) {
        const day = new Date(activity.created_at).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
        byDay[day] = (byDay[day] || 0) + 1
      }

      // Calculate direction breakdown for calls
      const calls = activities.filter((a) => a.type === 'call')
      const inboundCalls = calls.filter((a) => a.direction === 'inbound').length
      const outboundCalls = calls.filter((a) => a.direction === 'outbound').length

      const change = calculateChange(activities.length, prevActivities.length)

      return {
        success: true,
        period,
        activity_type: activity_type === 'all' ? 'All activities' : activity_type,
        summary: {
          total: activities.length,
          vs_previous_period: {
            change: formatPercent(change.value),
            direction: change.direction,
            previous_total: prevActivities.length,
          },
        },
        breakdown_by_type: Object.entries(byType)
          .map(([type, count]) => ({ type, count }))
          .sort((a, b) => b.count - a.count),
        calls: {
          total: calls.length,
          inbound: inboundCalls,
          outbound: outboundCalls,
        },
        trend_by_day: Object.entries(byDay).map(([day, count]) => ({ day, count })),
        insights: [
          change.direction === 'up' ? `Activity up ${formatPercent(change.value)} vs previous period` : null,
          change.direction === 'down' ? `Activity down ${formatPercent(change.value)} - consider increasing outreach` : null,
          outboundCalls > inboundCalls * 2 ? 'Strong proactive outreach' : null,
          byType['door_knock'] && byType['door_knock'] > 20 ? 'Excellent door knocking activity' : null,
        ].filter(Boolean),
      }
    } catch (error) {
      logger.error('[ARIA] Error in get_activity_analytics', { error })
      return { success: false, error: 'Failed to get activity analytics' }
    }
  },
})

// =============================================================================
// ARIA Function: Identify Bottlenecks
// =============================================================================

ariaFunctionRegistry.register({
  name: 'identify_bottlenecks',
  category: 'reporting',
  description: 'Identify where deals are getting stuck in the pipeline.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'identify_bottlenecks',
    description:
      'Find bottlenecks in the sales pipeline. Use for questions like "Where are deals getting stuck?" or "What\'s slowing us down?"',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()

      // Get projects with their stage durations
      const { data: projects } = await supabase
        .from('projects')
        .select('id, name, pipeline_stage, status, created_at, updated_at, estimated_value, approved_value')
        .eq('tenant_id', context.tenantId)
        .eq('is_deleted', false)
        .in('status', ['active', 'pending'])

      if (!projects || projects.length === 0) {
        return {
          success: true,
          found: false,
          message: 'No active projects in pipeline to analyze.',
        }
      }

      // Calculate days in current stage
      const now = new Date()
      const projectsWithDuration = projects.map((p) => {
        const updated = new Date(p.updated_at)
        const daysInStage = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
        return { ...p, daysInStage }
      })

      // Group by stage
      const byStage: Record<string, typeof projectsWithDuration> = {}
      for (const project of projectsWithDuration) {
        const stage = project.pipeline_stage || 'unknown'
        if (!byStage[stage]) byStage[stage] = []
        byStage[stage].push(project)
      }

      // Find bottlenecks (stages with deals stuck > 14 days)
      const bottlenecks: Array<{
        stage: string
        stuck_deals: number
        avg_days: number
        total_value: number
        deals: Array<{ name: string; days: number; value: number }>
      }> = []

      for (const [stage, stageProjects] of Object.entries(byStage)) {
        const stuckDeals = stageProjects.filter((p) => p.daysInStage > 14)
        if (stuckDeals.length > 0) {
          const avgDays =
            stuckDeals.reduce((sum, p) => sum + p.daysInStage, 0) / stuckDeals.length
          const totalValue = stuckDeals.reduce(
            (sum, p) => sum + (p.approved_value || p.estimated_value || 0),
            0
          )

          bottlenecks.push({
            stage,
            stuck_deals: stuckDeals.length,
            avg_days: Math.round(avgDays),
            total_value: totalValue,
            deals: stuckDeals
              .sort((a, b) => b.daysInStage - a.daysInStage)
              .slice(0, 5)
              .map((p) => ({
                name: p.name || 'Unnamed',
                days: p.daysInStage,
                value: p.approved_value || p.estimated_value || 0,
              })),
          })
        }
      }

      // Sort by severity (stuck deals * avg days)
      bottlenecks.sort((a, b) => b.stuck_deals * b.avg_days - a.stuck_deals * a.avg_days)

      // Generate recommendations
      const recommendations: string[] = []
      for (const bottleneck of bottlenecks.slice(0, 3)) {
        if (bottleneck.stage === 'quote_sent' || bottleneck.stage === 'negotiation') {
          recommendations.push(
            `${bottleneck.stuck_deals} deals stuck in ${bottleneck.stage} - consider follow-up calls`
          )
        } else if (bottleneck.stage === 'qualified') {
          recommendations.push(
            `${bottleneck.stuck_deals} qualified leads waiting - prioritize sending estimates`
          )
        } else if (bottleneck.stage === 'prospect') {
          recommendations.push(
            `${bottleneck.stuck_deals} prospects need qualification - schedule discovery calls`
          )
        }
      }

      return {
        success: true,
        found: bottlenecks.length > 0,
        total_projects_analyzed: projects.length,
        bottlenecks: bottlenecks.map((b) => ({
          stage: b.stage,
          stuck_deals: b.stuck_deals,
          avg_days_stuck: b.avg_days,
          at_risk_value: formatCurrency(b.total_value),
          top_stuck_deals: b.deals.map((d) => ({
            name: d.name,
            days_stuck: d.days,
            value: formatCurrency(d.value),
          })),
        })),
        summary:
          bottlenecks.length > 0
            ? `Found ${bottlenecks.reduce((sum, b) => sum + b.stuck_deals, 0)} deals stuck across ${bottlenecks.length} stages`
            : 'No significant bottlenecks found - pipeline is flowing well',
        recommendations,
      }
    } catch (error) {
      logger.error('[ARIA] Error in identify_bottlenecks', { error })
      return { success: false, error: 'Failed to identify bottlenecks' }
    }
  },
})

// =============================================================================
// ARIA Function: Suggest Improvements
// =============================================================================

ariaFunctionRegistry.register({
  name: 'suggest_improvements',
  category: 'reporting',
  description: 'Get AI-powered suggestions to improve sales performance based on current data.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'suggest_improvements',
    description:
      'Get coaching recommendations. Use for questions like "How can we improve?" or "What should we focus on?"',
    parameters: {
      type: 'object',
      properties: {
        focus_area: {
          type: 'string',
          description:
            'Area to focus suggestions on: "conversion", "velocity", "activity", "revenue", or "all"',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { focus_area = 'all' } = args as { focus_area?: string }

      // Gather data for analysis
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const [
        pipelineResult,
        conversionResult,
        activitiesResult,
        wonResult,
        lostResult,
      ] = await Promise.all([
        supabase.rpc('get_pipeline_summary', { p_tenant_id: context.tenantId }),
        supabase.rpc('get_conversion_counts', { p_tenant_id: context.tenantId }),
        supabase
          .from('activities')
          .select('type')
          .eq('tenant_id', context.tenantId)
          .gte('created_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('projects')
          .select('final_value, created_at, updated_at')
          .eq('tenant_id', context.tenantId)
          .eq('status', 'won')
          .gte('updated_at', thirtyDaysAgo.toISOString()),
        supabase
          .from('projects')
          .select('id')
          .eq('tenant_id', context.tenantId)
          .eq('status', 'lost')
          .gte('updated_at', thirtyDaysAgo.toISOString()),
      ])

      const pipeline = pipelineResult.data || []
      const conversionData = conversionResult.data?.[0] || { total_projects: 0, won_projects: 0 }
      const activities = activitiesResult.data || []
      const wonDeals = wonResult.data || []
      const lostDeals = lostResult.data || []

      // Calculate metrics
      const totalProjects = Number(conversionData.total_projects)
      const wonProjects = Number(conversionData.won_projects)
      const closeRate = totalProjects > 0 ? (wonProjects / totalProjects) * 100 : 0

      const avgSalesCycle =
        wonDeals.length > 0
          ? wonDeals.reduce((sum, p) => {
              const days = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / (1000 * 60 * 60 * 24)
              return sum + days
            }, 0) / wonDeals.length
          : 0

      const activityCount = activities.length
      const callCount = activities.filter((a) => a.type === 'call').length
      const knockCount = activities.filter((a) => a.type === 'door_knock').length

      // Generate recommendations based on data
      const recommendations: Array<{
        area: string
        priority: 'high' | 'medium' | 'low'
        insight: string
        action: string
      }> = []

      // Conversion recommendations
      if (focus_area === 'all' || focus_area === 'conversion') {
        if (closeRate < 20) {
          recommendations.push({
            area: 'conversion',
            priority: 'high',
            insight: `Close rate is ${formatPercent(closeRate)}, below the 20-30% target`,
            action: 'Review lost deals for patterns - are we qualifying leads properly?',
          })
        }
        if (lostDeals.length > wonDeals.length * 2) {
          recommendations.push({
            area: 'conversion',
            priority: 'high',
            insight: 'Losing more than twice as many deals as winning',
            action: 'Implement win/loss analysis calls to understand objections',
          })
        }
      }

      // Velocity recommendations
      if (focus_area === 'all' || focus_area === 'velocity') {
        if (avgSalesCycle > 45) {
          recommendations.push({
            area: 'velocity',
            priority: 'medium',
            insight: `Average sales cycle is ${avgSalesCycle.toFixed(0)} days`,
            action: 'Identify stages with longest dwell time and streamline',
          })
        }
        const quoteSentCount = pipeline.find((p: { status: string }) => p.status === 'quote_sent')?.count || 0
        if (quoteSentCount > 10) {
          recommendations.push({
            area: 'velocity',
            priority: 'high',
            insight: `${quoteSentCount} deals stuck at quote_sent stage`,
            action: 'Schedule follow-up calls within 48 hours of sending quotes',
          })
        }
      }

      // Activity recommendations
      if (focus_area === 'all' || focus_area === 'activity') {
        if (activityCount < 100) {
          recommendations.push({
            area: 'activity',
            priority: 'medium',
            insight: `Only ${activityCount} activities in the last 30 days`,
            action: 'Increase daily activity targets - aim for 15-20 touches per day',
          })
        }
        if (callCount < knockCount / 3) {
          recommendations.push({
            area: 'activity',
            priority: 'medium',
            insight: 'Low call-to-knock ratio',
            action: 'Follow up door knocks with phone calls within 24 hours',
          })
        }
      }

      // Revenue recommendations
      if (focus_area === 'all' || focus_area === 'revenue') {
        const totalPipelineValue = pipeline.reduce(
          (sum: number, p: { total_value: number }) => sum + Number(p.total_value),
          0
        )
        const wonRevenue = wonDeals.reduce(
          (sum, p) => sum + (p.final_value || 0),
          0
        )
        if (totalPipelineValue < wonRevenue * 3) {
          recommendations.push({
            area: 'revenue',
            priority: 'high',
            insight: 'Pipeline coverage below 3x - at risk of missing targets',
            action: 'Focus on lead generation to build pipeline',
          })
        }
      }

      // Sort by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 }
      recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

      return {
        success: true,
        focus_area,
        current_state: {
          close_rate: formatPercent(closeRate),
          avg_sales_cycle: `${avgSalesCycle.toFixed(0)} days`,
          monthly_activities: activityCount,
          deals_won: wonDeals.length,
          deals_lost: lostDeals.length,
        },
        recommendations: recommendations.slice(0, 5),
        summary:
          recommendations.length > 0
            ? `Found ${recommendations.length} areas for improvement`
            : 'Performance is solid - maintain current momentum',
      }
    } catch (error) {
      logger.error('[ARIA] Error in suggest_improvements', { error })
      return { success: false, error: 'Failed to generate improvement suggestions' }
    }
  },
})

// =============================================================================
// ARIA Function: Compare Periods
// =============================================================================

ariaFunctionRegistry.register({
  name: 'compare_periods',
  category: 'reporting',
  description: 'Compare performance between two time periods.',
  riskLevel: 'low',
  enabledByDefault: true,
  voiceDefinition: {
    type: 'function',
    name: 'compare_periods',
    description:
      'Compare performance between time periods. Use for questions like "How does this month compare to last month?" or "Are we doing better than last quarter?"',
    parameters: {
      type: 'object',
      properties: {
        current_period: {
          type: 'string',
          description: 'Current period: "this_month", "this_week", "this_quarter"',
        },
        compare_to: {
          type: 'string',
          description:
            'Period to compare: "last_month", "last_week", "last_quarter", "same_period_last_year"',
        },
      },
      required: [],
    },
  },
  execute: async (args, context) => {
    try {
      const supabase = await createAdminClient()
      const { current_period = 'this_month', compare_to = 'last_month' } = args as {
        current_period?: string
        compare_to?: string
      }

      const currentRange = getDateRange(current_period)
      const compareRange = getDateRange(compare_to)

      // Fetch data for both periods
      const fetchPeriodData = async (start: Date, end: Date) => {
        const [wonResult, lostResult, activitiesResult, leadsResult] = await Promise.all([
          supabase
            .from('projects')
            .select('final_value, approved_value, estimated_value')
            .eq('tenant_id', context.tenantId)
            .eq('status', 'won')
            .gte('updated_at', start.toISOString())
            .lte('updated_at', end.toISOString()),
          supabase
            .from('projects')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', context.tenantId)
            .eq('status', 'lost')
            .gte('updated_at', start.toISOString())
            .lte('updated_at', end.toISOString()),
          supabase
            .from('activities')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', context.tenantId)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
          supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .eq('tenant_id', context.tenantId)
            .gte('created_at', start.toISOString())
            .lte('created_at', end.toISOString()),
        ])

        const wonDeals = wonResult.data || []
        const revenue = wonDeals.reduce(
          (sum, p) => sum + (p.final_value || p.approved_value || p.estimated_value || 0),
          0
        )

        return {
          deals_won: wonDeals.length,
          deals_lost: lostResult.count || 0,
          revenue,
          activities: activitiesResult.count || 0,
          new_leads: leadsResult.count || 0,
        }
      }

      const [currentData, compareData] = await Promise.all([
        fetchPeriodData(currentRange.start, currentRange.end),
        fetchPeriodData(compareRange.start, compareRange.end),
      ])

      // Calculate comparisons
      const comparisons: Array<{
        metric: string
        current: string | number
        previous: string | number
        change: string
        direction: 'up' | 'down' | 'flat'
        is_positive: boolean
      }> = []

      // Revenue
      const revenueChange = calculateChange(currentData.revenue, compareData.revenue)
      comparisons.push({
        metric: 'Revenue',
        current: formatCurrency(currentData.revenue),
        previous: formatCurrency(compareData.revenue),
        change: formatPercent(revenueChange.value),
        direction: revenueChange.direction,
        is_positive: revenueChange.direction === 'up',
      })

      // Deals won
      const dealsChange = calculateChange(currentData.deals_won, compareData.deals_won)
      comparisons.push({
        metric: 'Deals Won',
        current: currentData.deals_won,
        previous: compareData.deals_won,
        change: formatPercent(dealsChange.value),
        direction: dealsChange.direction,
        is_positive: dealsChange.direction === 'up',
      })

      // Close rate
      const currentTotal = currentData.deals_won + currentData.deals_lost
      const compareTotal = compareData.deals_won + compareData.deals_lost
      const currentCloseRate = currentTotal > 0 ? (currentData.deals_won / currentTotal) * 100 : 0
      const compareCloseRate = compareTotal > 0 ? (compareData.deals_won / compareTotal) * 100 : 0
      const closeRateChange = calculateChange(currentCloseRate, compareCloseRate)
      comparisons.push({
        metric: 'Close Rate',
        current: formatPercent(currentCloseRate),
        previous: formatPercent(compareCloseRate),
        change: formatPercent(closeRateChange.value),
        direction: closeRateChange.direction,
        is_positive: closeRateChange.direction === 'up',
      })

      // Activities
      const activitiesChange = calculateChange(currentData.activities, compareData.activities)
      comparisons.push({
        metric: 'Activities',
        current: currentData.activities,
        previous: compareData.activities,
        change: formatPercent(activitiesChange.value),
        direction: activitiesChange.direction,
        is_positive: activitiesChange.direction === 'up',
      })

      // New leads
      const leadsChange = calculateChange(currentData.new_leads, compareData.new_leads)
      comparisons.push({
        metric: 'New Leads',
        current: currentData.new_leads,
        previous: compareData.new_leads,
        change: formatPercent(leadsChange.value),
        direction: leadsChange.direction,
        is_positive: leadsChange.direction === 'up',
      })

      // Overall assessment
      const positiveMetrics = comparisons.filter((c) => c.is_positive).length
      const assessment =
        positiveMetrics >= 4
          ? 'Excellent progress! Most metrics are trending up.'
          : positiveMetrics >= 2
            ? 'Mixed results. Some areas improving, others need attention.'
            : 'Challenging period. Multiple metrics declined - review strategy.'

      return {
        success: true,
        comparing: {
          current: current_period,
          previous: compare_to,
        },
        comparisons,
        summary: {
          metrics_improved: positiveMetrics,
          metrics_declined: comparisons.length - positiveMetrics,
          assessment,
        },
        highlights: comparisons
          .filter((c) => c.direction !== 'flat')
          .map((c) => `${c.metric}: ${c.direction === 'up' ? '↑' : '↓'} ${c.change}`)
          .slice(0, 3),
      }
    } catch (error) {
      logger.error('[ARIA] Error in compare_periods', { error })
      return { success: false, error: 'Failed to compare periods' }
    }
  },
})
