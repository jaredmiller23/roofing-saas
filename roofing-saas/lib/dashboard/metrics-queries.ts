/**
 * Dashboard Metrics Query Functions
 *
 * Tier-specific query functions for the dashboard metrics API.
 * Each function is STANDALONE - no nested function calls.
 *
 * Tiers:
 * - field: 2 queries, personal stats only
 * - manager: 4 queries, field data + pipeline/conversion
 * - full: 10 queries, all metrics in single parallel batch
 */

import { SupabaseClient } from '@supabase/supabase-js'
import type {
  FieldMetrics,
  ManagerMetrics,
  FullMetrics,
  RecentWin,
  PipelineStatus,
  ActivityTrendPoint,
  RevenueTrendPoint,
} from './metrics-types'

export type DashboardScope = 'company' | 'team' | 'personal'

// =============================================================================
// Field Tier Metrics (Mobile-optimized, <100ms target)
// =============================================================================

/**
 * Get metrics for field tier (door knockers on mobile)
 * Minimal data: personal knocks and recent wins only
 */
export async function getFieldMetrics(
  supabase: SupabaseClient,
  tenantId: string,
  userId: string
): Promise<FieldMetrics> {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [knocksResult, recentWinsResult] = await Promise.all([
    // Personal knock count (7 days)
    // Note: activities table does not have is_deleted column
    supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'door_knock')
      .eq('created_by', userId)
      .gte('created_at', last7Days.toISOString()),

    // Personal recent wins (30 days, limit 5)
    supabase
      .from('projects')
      .select('id, name, final_value, approved_value, estimated_value, updated_at')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .eq('created_by', userId)
      .gte('updated_at', last30Days.toISOString())
      .order('updated_at', { ascending: false })
      .limit(5),
  ])

  const knockCount = knocksResult.count || 0
  const recentWins: RecentWin[] = (recentWinsResult.data || []).map((p) => ({
    id: p.id,
    name: p.name || 'Unnamed Project',
    value: p.final_value || p.approved_value || p.estimated_value || 0,
    date: p.updated_at,
  }))

  return {
    knocks: {
      value: knockCount,
      change: 0, // Would need historical data for comparison
      trend: knockCount > 0 ? 'up' : 'down',
    },
    recentWins,
  }
}

// =============================================================================
// Manager Tier Metrics (Tablet-optimized, <200ms target)
// =============================================================================

/**
 * Get metrics for manager tier (admins on tablet)
 * Includes field-level metrics + pipeline and conversion data
 * STANDALONE: Does not call getFieldMetrics() - runs all queries directly
 */
export async function getManagerMetrics(
  supabase: SupabaseClient,
  tenantId: string,
  scope: DashboardScope,
  userId: string
): Promise<ManagerMetrics> {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Run all queries in parallel (field-level + manager-level)
  const [knocksResult, recentWinsResult, pipelineResult, conversionResult] =
    await Promise.all([
      // Field-level: Personal knock count (7 days)
      supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('type', 'door_knock')
        .eq('created_by', userId)
        .gte('created_at', last7Days.toISOString()),

      // Field-level: Personal recent wins (30 days, limit 5)
      supabase
        .from('projects')
        .select(
          'id, name, final_value, approved_value, estimated_value, updated_at'
        )
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .eq('status', 'won')
        .eq('created_by', userId)
        .gte('updated_at', last30Days.toISOString())
        .order('updated_at', { ascending: false })
        .limit(5),

      // Manager-level: Pipeline summary (uses database function)
      supabase.rpc('get_pipeline_summary', { p_tenant_id: tenantId }),

      // Manager-level: Conversion counts (uses database function)
      supabase.rpc('get_conversion_counts', { p_tenant_id: tenantId }),
    ])

  // Process field-level data
  const knockCount = knocksResult.count || 0
  const recentWins: RecentWin[] = (recentWinsResult.data || []).map((p) => ({
    id: p.id,
    name: p.name || 'Unnamed Project',
    value: p.final_value || p.approved_value || p.estimated_value || 0,
    date: p.updated_at,
  }))

  // Process pipeline data
  const pipelineData = (pipelineResult.data || []) as Array<{
    status: string
    count: number
    total_value: number
  }>

  const pipelineStatus: PipelineStatus[] = pipelineData.map((p) => ({
    status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    count: Number(p.count),
    value: Number(p.total_value),
  }))

  const totalPipelineValue = pipelineData.reduce(
    (sum, p) => sum + Number(p.total_value),
    0
  )
  const totalPipelineCount = pipelineData.reduce(
    (sum, p) => sum + Number(p.count),
    0
  )

  // Process conversion data
  const conversionData = conversionResult.data?.[0] || {
    total_projects: 0,
    won_projects: 0,
  }
  const totalProjects = Number(conversionData.total_projects)
  const wonProjects = Number(conversionData.won_projects)
  const conversionRate =
    totalProjects > 0 ? (wonProjects / totalProjects) * 100 : 0

  return {
    knocks: {
      value: knockCount,
      change: 0,
      trend: knockCount > 0 ? 'up' : 'down',
    },
    recentWins,
    pipeline: {
      value: totalPipelineValue,
      change: totalPipelineCount,
      trend: totalPipelineCount > 0 ? 'up' : 'down',
    },
    conversion: {
      value: Math.round(conversionRate * 10) / 10,
      change: 0,
      trend: conversionRate > 20 ? 'up' : 'down',
    },
    pipelineStatus,
  }
}

// =============================================================================
// Full Tier Metrics (Desktop, <500ms target)
// =============================================================================

/**
 * Get metrics for full tier (owners on desktop)
 * Complete analytics including trends and extended stats
 * STANDALONE: Does not call getManagerMetrics() - runs all queries directly
 */
export async function getFullMetrics(
  supabase: SupabaseClient,
  tenantId: string,
  scope: DashboardScope,
  userId: string
): Promise<FullMetrics> {
  const now = new Date()
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  // Run ALL queries in parallel (field + manager + full tier)
  const [
    // Field-level queries
    knocksResult,
    recentWinsResult,
    // Manager-level queries
    pipelineResult,
    conversionResult,
    // Full-tier queries
    revenueResult,
    revenueTrendResult,
    contactsResult,
    activeProjectsResult,
    wonProjectsResult,
    activitiesResult,
  ] = await Promise.all([
    // Field-level: Personal knock count (7 days)
    supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('type', 'door_knock')
      .eq('created_by', userId)
      .gte('created_at', last7Days.toISOString()),

    // Field-level: Personal recent wins (30 days, limit 5)
    supabase
      .from('projects')
      .select(
        'id, name, final_value, approved_value, estimated_value, updated_at'
      )
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .eq('created_by', userId)
      .gte('updated_at', last30Days.toISOString())
      .order('updated_at', { ascending: false })
      .limit(5),

    // Manager-level: Pipeline summary (uses database function)
    supabase.rpc('get_pipeline_summary', { p_tenant_id: tenantId }),

    // Manager-level: Conversion counts (uses database function)
    supabase.rpc('get_conversion_counts', { p_tenant_id: tenantId }),

    // Full-tier: Revenue summary (uses database function)
    supabase.rpc('get_revenue_summary', { p_tenant_id: tenantId }),

    // Full-tier: Revenue trend (uses database function)
    supabase.rpc('get_revenue_trend', { p_tenant_id: tenantId, p_months: 6 }),

    // Full-tier: Total contacts count
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false),

    // Full-tier: Active projects count
    supabase
      .from('projects')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('status', 'won')
      .neq('status', 'lost'),

    // Full-tier: Won projects for avg job value and sales cycle
    supabase
      .from('projects')
      .select(
        'final_value, approved_value, estimated_value, created_at, updated_at'
      )
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('status', 'won')
      .limit(100)
      .order('updated_at', { ascending: false }),

    // Full-tier: Activities for trend (7 days)
    supabase
      .from('activities')
      .select('type, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', last7Days.toISOString())
      .limit(500),
  ])

  // Process field-level data
  const knockCount = knocksResult.count || 0
  const recentWins: RecentWin[] = (recentWinsResult.data || []).map((p) => ({
    id: p.id,
    name: p.name || 'Unnamed Project',
    value: p.final_value || p.approved_value || p.estimated_value || 0,
    date: p.updated_at,
  }))

  // Process manager-level pipeline data
  const pipelineData = (pipelineResult.data || []) as Array<{
    status: string
    count: number
    total_value: number
  }>

  const pipelineStatus: PipelineStatus[] = pipelineData.map((p) => ({
    status: p.status.charAt(0).toUpperCase() + p.status.slice(1),
    count: Number(p.count),
    value: Number(p.total_value),
  }))

  const totalPipelineValue = pipelineData.reduce(
    (sum, p) => sum + Number(p.total_value),
    0
  )
  const totalPipelineCount = pipelineData.reduce(
    (sum, p) => sum + Number(p.count),
    0
  )

  // Process manager-level conversion data
  const conversionData = conversionResult.data?.[0] || {
    total_projects: 0,
    won_projects: 0,
  }
  const totalProjects = Number(conversionData.total_projects)
  const wonProjectCount = Number(conversionData.won_projects)
  const conversionRate =
    totalProjects > 0 ? (wonProjectCount / totalProjects) * 100 : 0

  // Process full-tier revenue data
  const revenueData = revenueResult.data?.[0] || {
    current_month_revenue: 0,
    previous_month_revenue: 0,
  }
  const currentRevenue = Number(revenueData.current_month_revenue)
  const prevRevenue = Number(revenueData.previous_month_revenue)
  const revenueChange =
    prevRevenue > 0
      ? Math.round(((currentRevenue - prevRevenue) / prevRevenue) * 100)
      : 0

  // Process revenue trend
  const revenueTrend: RevenueTrendPoint[] = (revenueTrendResult.data || []).map(
    (r: { month_key: string; revenue: number }) => ({
      month: r.month_key,
      revenue: Number(r.revenue),
    })
  )

  // Calculate avg job value and sales cycle
  const wonProjects = wonProjectsResult.data || []
  const avgJobValue =
    wonProjects.length > 0
      ? wonProjects.reduce(
          (sum, p) =>
            sum + (p.final_value || p.approved_value || p.estimated_value || 0),
          0
        ) / wonProjects.length
      : 0

  const avgSalesCycle =
    wonProjects.length > 0
      ? wonProjects.reduce((sum, p) => {
          const days =
            (new Date(p.updated_at).getTime() -
              new Date(p.created_at).getTime()) /
            (1000 * 60 * 60 * 24)
          return sum + days
        }, 0) / wonProjects.length
      : 0

  // Process activity trend (7 days)
  const activities = activitiesResult.data || []
  const activityTrend: ActivityTrendPoint[] = Array.from(
    { length: 7 },
    (_, i) => {
      const date = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
      const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })

      const dayActivities = activities.filter((a) => {
        const activityDate = new Date(a.created_at)
        return activityDate.toDateString() === date.toDateString()
      })

      return {
        date: dateStr,
        count: dayActivities.length,
        doorKnocks: dayActivities.filter((a) => a.type === 'door_knock').length,
        calls: dayActivities.filter((a) => a.type === 'call').length,
        emails: dayActivities.filter((a) => a.type === 'email').length,
      }
    }
  )

  return {
    // Field-level metrics
    knocks: {
      value: knockCount,
      change: 0,
      trend: knockCount > 0 ? 'up' : 'down',
    },
    recentWins,
    // Manager-level metrics
    pipeline: {
      value: totalPipelineValue,
      change: totalPipelineCount,
      trend: totalPipelineCount > 0 ? 'up' : 'down',
    },
    conversion: {
      value: Math.round(conversionRate * 10) / 10,
      change: 0,
      trend: conversionRate > 20 ? 'up' : 'down',
    },
    pipelineStatus,
    // Full-tier metrics
    revenue: {
      value: currentRevenue,
      change: revenueChange,
      trend: revenueChange >= 0 ? 'up' : 'down',
    },
    revenueTrend,
    activityTrend,
    totalContacts: contactsResult.count || 0,
    activeProjects: activeProjectsResult.count || 0,
    avgJobValue: Math.round(avgJobValue),
    avgSalesCycle: Math.round(avgSalesCycle * 10) / 10,
  }
}

// =============================================================================
// Scope-aware variants (for future enhancement)
// =============================================================================

/**
 * Apply scope filter to query builder
 * Currently returns the same query; can be extended for team/personal filtering
 */
export function applyScopeFilter<T>(
  query: T,
  _scope: DashboardScope,
  _userId?: string
): T {
  // For now, all scopes return company-wide data
  // Future: Add team_id filter for 'team' scope
  // Future: Add created_by filter for 'personal' scope
  return query
}
