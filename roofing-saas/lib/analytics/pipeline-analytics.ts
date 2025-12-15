/**
 * Pipeline Analytics Engine
 *
 * Core analytics calculations for pipeline conversion funnels,
 * velocity tracking, and performance metrics
 */

import { Project, PipelineStage } from '@/lib/types/api'
import {
  ConversionFunnel,
  FunnelStage,
  PipelineVelocity,
  StageVelocity,
  WinLossAnalysis,
  LossReason,
  TeamMemberPerformance,
  AnalyticsFilters,
  PipelineAnalytics,
} from './analytics-types'

// Stage order for funnel analysis
const STAGE_ORDER: PipelineStage[] = [
  'prospect',
  'qualified',
  'quote_sent',
  'negotiation',
  'won',
  'production',
  'complete',
  'lost'
]

const STAGE_NAMES: Record<PipelineStage, string> = {
  prospect: 'Prospect',
  qualified: 'Qualified',
  quote_sent: 'Quote Sent',
  negotiation: 'Negotiation',
  won: 'Won',
  production: 'Production',
  complete: 'Complete',
  lost: 'Lost'
}

// Default loss reasons for analysis
const DEFAULT_LOSS_REASONS = [
  'Price too high',
  'Chose competitor',
  'Project delayed',
  'Budget constraints',
  'No response',
  'Insurance denial',
  'Other'
]

/**
 * Calculate conversion funnel metrics
 */
export function calculateConversionFunnel(
  projects: Project[],
  filters: AnalyticsFilters
): ConversionFunnel {
  // Filter projects based on date range and criteria
  const filteredProjects = filterProjects(projects, filters)

  // Count projects in each stage
  const stageCounts = STAGE_ORDER.reduce((counts, stage) => {
    counts[stage] = filteredProjects.filter(p => p.pipeline_stage === stage).length
    return counts
  }, {} as Record<PipelineStage, number>)

  // Calculate stage values (revenue)
  const stageValues = STAGE_ORDER.reduce((values, stage) => {
    const stageProjects = filteredProjects.filter(p => p.pipeline_stage === stage)
    values[stage] = stageProjects.reduce((sum, p) => {
      const value = p.final_value || p.approved_value || p.estimated_value || 0
      return sum + value
    }, 0)
    return values
  }, {} as Record<PipelineStage, number>)

  // Calculate average days in each stage
  const stageVelocities = calculateStageVelocities(filteredProjects)
  const stageDays = stageVelocities.reduce((days, sv) => {
    days[sv.stage] = sv.averageDays
    return days
  }, {} as Record<PipelineStage, number>)

  // Build funnel stages with conversion rates
  const funnelStages: FunnelStage[] = []
  let previousCount = 0

  for (const stage of STAGE_ORDER) {
    if (stage === 'lost') continue // Skip lost in funnel progression

    const count = stageCounts[stage]
    const value = stageValues[stage]
    const averageDaysInStage = stageDays[stage] || 0

    let conversionRate = 0
    let dropOffRate = 0

    if (previousCount > 0) {
      conversionRate = (count / previousCount) * 100
      dropOffRate = 100 - conversionRate
    } else if (stage === 'prospect') {
      conversionRate = 100 // Starting stage
      previousCount = count
    }

    funnelStages.push({
      stage,
      stageName: STAGE_NAMES[stage],
      count,
      value,
      conversionRate,
      dropOffRate,
      averageDaysInStage,
    })

    if (stage !== 'prospect') {
      previousCount = count
    }
  }

  // Calculate overall metrics
  const totalProspects = stageCounts.prospect
  const totalWon = stageCounts.won + stageCounts.production + stageCounts.complete
  const totalRevenue = stageValues.won + stageValues.production + stageValues.complete
  const overallConversionRate = totalProspects > 0 ? (totalWon / totalProspects) * 100 : 0

  // Calculate average lead-to-win time
  const wonProjects = filteredProjects.filter(p =>
    p.pipeline_stage === 'won' || p.pipeline_stage === 'production' || p.pipeline_stage === 'complete'
  )
  const averageLeadToWin = calculateAverageLeadToWin(wonProjects)

  return {
    stages: funnelStages,
    overallConversionRate,
    totalProspects,
    totalWon,
    totalRevenue,
    averageLeadToWin,
  }
}

/**
 * Calculate pipeline velocity metrics
 */
export function calculatePipelineVelocity(
  projects: Project[],
  filters: AnalyticsFilters
): PipelineVelocity {
  const filteredProjects = filterProjects(projects, filters)
  const stageVelocities = calculateStageVelocities(filteredProjects)

  // Calculate overall velocity (average days from prospect to close)
  const closedProjects = filteredProjects.filter(p =>
    p.pipeline_stage === 'won' || p.pipeline_stage === 'complete' || p.pipeline_stage === 'lost'
  )
  const overallVelocity = calculateAverageLeadToWin(closedProjects)

  // Find fastest and slowest deals
  const projectVelocities = closedProjects
    .map(p => ({
      project: p,
      velocity: calculateProjectVelocity(p)
    }))
    .filter(pv => pv.velocity > 0)
    .sort((a, b) => a.velocity - b.velocity)

  const fastestDeals = projectVelocities.slice(0, 5).map(pv => pv.project)
  const slowestDeals = projectVelocities.slice(-5).reverse().map(pv => pv.project)

  // Identify bottlenecks (stages with highest average days)
  const sortedByDays = [...stageVelocities].sort((a, b) => b.averageDays - a.averageDays)
  const bottlenecks = sortedByDays.slice(0, 3).map(sv => sv.stage)

  return {
    stages: stageVelocities,
    overallVelocity,
    fastestDeals,
    slowestDeals,
    bottlenecks,
  }
}

/**
 * Calculate win/loss analysis
 */
export function calculateWinLossAnalysis(
  projects: Project[],
  filters: AnalyticsFilters
): WinLossAnalysis {
  const filteredProjects = filterProjects(projects, filters)

  const wonProjects = filteredProjects.filter(p =>
    p.pipeline_stage === 'won' || p.pipeline_stage === 'production' || p.pipeline_stage === 'complete'
  )
  const lostProjects = filteredProjects.filter(p => p.pipeline_stage === 'lost')
  const totalDeals = wonProjects.length + lostProjects.length

  const winRate = totalDeals > 0 ? (wonProjects.length / totalDeals) * 100 : 0

  // Calculate revenue metrics
  const totalWonRevenue = wonProjects.reduce((sum, p) => {
    const value = p.final_value || p.approved_value || p.estimated_value || 0
    return sum + value
  }, 0)

  const totalLostRevenue = lostProjects.reduce((sum, p) => {
    const value = p.estimated_value || 0
    return sum + value
  }, 0)

  const averageWonValue = wonProjects.length > 0 ? totalWonRevenue / wonProjects.length : 0
  const averageLostValue = lostProjects.length > 0 ? totalLostRevenue / lostProjects.length : 0

  // Lead source performance
  const leadSources = [...new Set(filteredProjects.map(p => p.lead_source).filter(Boolean))]
  const leadSourcePerformance = leadSources.map(source => {
    const sourceProjects = filteredProjects.filter(p => p.lead_source === source)
    const sourceWon = sourceProjects.filter(p =>
      p.pipeline_stage === 'won' || p.pipeline_stage === 'production' || p.pipeline_stage === 'complete'
    )
    const sourceTotal = sourceProjects.filter(p =>
      p.pipeline_stage === 'won' || p.pipeline_stage === 'production' ||
      p.pipeline_stage === 'complete' || p.pipeline_stage === 'lost'
    )

    const sourceWinRate = sourceTotal.length > 0 ? (sourceWon.length / sourceTotal.length) * 100 : 0
    const sourceRevenue = sourceWon.reduce((sum, p) => {
      const value = p.final_value || p.approved_value || p.estimated_value || 0
      return sum + value
    }, 0)

    return {
      source: source || 'Unknown',
      totalDeals: sourceTotal.length,
      wonDeals: sourceWon.length,
      winRate: sourceWinRate,
      totalRevenue: sourceRevenue,
    }
  })

  // Loss reasons analysis (mock data since not in schema yet)
  const lossReasons: LossReason[] = DEFAULT_LOSS_REASONS.map((reason, index) => {
    // Distribute lost deals across reasons with some randomness for demo
    const count = Math.floor(lostProjects.length / DEFAULT_LOSS_REASONS.length) +
                  (index < lostProjects.length % DEFAULT_LOSS_REASONS.length ? 1 : 0)
    const percentage = lostProjects.length > 0 ? (count / lostProjects.length) * 100 : 0
    const reasonProjects = lostProjects.slice(
      index * Math.floor(lostProjects.length / DEFAULT_LOSS_REASONS.length),
      (index + 1) * Math.floor(lostProjects.length / DEFAULT_LOSS_REASONS.length)
    )

    const averageValue = reasonProjects.length > 0 ?
      reasonProjects.reduce((sum, p) => sum + (p.estimated_value || 0), 0) / reasonProjects.length : 0
    const totalLostValue = reasonProjects.reduce((sum, p) => sum + (p.estimated_value || 0), 0)

    return {
      reason,
      count,
      percentage,
      averageValue,
      totalLostValue,
    }
  }).filter(lr => lr.count > 0)

  // Time analysis
  const averageWonTime = calculateAverageLeadToWin(wonProjects)
  const averageLostTime = calculateAverageLeadToWin(lostProjects)

  return {
    totalDeals,
    wonDeals: wonProjects.length,
    lostDeals: lostProjects.length,
    winRate,
    totalWonRevenue,
    totalLostRevenue,
    averageWonValue,
    averageLostValue,
    leadSourcePerformance,
    lossReasons,
    averageWonTime,
    averageLostTime,
  }
}

/**
 * Calculate team member performance
 */
export function calculateTeamPerformance(
  projects: Project[],
  filters: AnalyticsFilters
): TeamMemberPerformance[] {
  const filteredProjects = filterProjects(projects, filters)

  // Group projects by created_by (team member)
  const teamProjects = filteredProjects.reduce((groups, project) => {
    const userId = project.created_by
    if (!groups[userId]) {
      groups[userId] = []
    }
    groups[userId].push(project)
    return groups
  }, {} as Record<string, Project[]>)

  return Object.entries(teamProjects).map(([userId, userProjects]) => {
    const wonProjects = userProjects.filter(p =>
      p.pipeline_stage === 'won' || p.pipeline_stage === 'production' || p.pipeline_stage === 'complete'
    )
    const lostProjects = userProjects.filter(p => p.pipeline_stage === 'lost')
    const closedProjects = [...wonProjects, ...lostProjects]

    const winRate = closedProjects.length > 0 ? (wonProjects.length / closedProjects.length) * 100 : 0

    const totalRevenue = wonProjects.reduce((sum, p) => {
      const value = p.final_value || p.approved_value || p.estimated_value || 0
      return sum + value
    }, 0)

    const averageDealSize = wonProjects.length > 0 ? totalRevenue / wonProjects.length : 0
    const averageVelocity = calculateAverageLeadToWin(closedProjects)

    const activeProjects = userProjects.filter(p =>
      p.pipeline_stage !== 'complete' && p.pipeline_stage !== 'lost'
    )
    const pipelineValue = activeProjects.reduce((sum, p) => {
      const value = p.estimated_value || p.approved_value || 0
      return sum + value
    }, 0)

    // Calculate conversion rates by stage
    const conversionRates = STAGE_ORDER.reduce((rates, stage) => {
      const stageProjects = userProjects.filter(p => p.pipeline_stage === stage)
      rates[stage] = userProjects.length > 0 ? (stageProjects.length / userProjects.length) * 100 : 0
      return rates
    }, {} as Record<PipelineStage, number>)

    return {
      userId,
      userName: `User ${userId.slice(-4)}`, // Mock name - would come from user table
      totalDeals: userProjects.length,
      wonDeals: wonProjects.length,
      lostDeals: lostProjects.length,
      winRate,
      totalRevenue,
      averageDealSize,
      averageVelocity,
      dealsInPipeline: activeProjects.length,
      pipelineValue,
      conversionRates,
    }
  })
}

/**
 * Generate complete pipeline analytics
 */
export function generatePipelineAnalytics(
  projects: Project[],
  filters: AnalyticsFilters
): PipelineAnalytics {
  const conversionFunnel = calculateConversionFunnel(projects, filters)
  const velocity = calculatePipelineVelocity(projects, filters)
  const winLossAnalysis = calculateWinLossAnalysis(projects, filters)
  const teamPerformance = calculateTeamPerformance(projects, filters)

  // Calculate data quality metrics
  const filteredProjects = filterProjects(projects, filters)
  const missingValues = filteredProjects.filter(p =>
    !p.estimated_value && !p.approved_value && !p.final_value
  ).length
  const incompleteProjects = filteredProjects.filter(p =>
    !p.contact || !p.lead_source
  ).length

  return {
    conversionFunnel,
    velocity,
    winLossAnalysis,
    revenueForecast: {
      periods: [],
      totalPipelineValue: 0,
      overallWinRate: winLossAnalysis.winRate,
      averageDealSize: winLossAnalysis.averageWonValue,
      monthlyRunRate: 0,
      pipelineGrowth: 0,
      dealSizeTrend: 0,
      velocityTrend: 0,
    }, // Will be calculated by forecasting module
    teamPerformance,
    filters,
    lastUpdated: new Date().toISOString(),
    dataQuality: {
      missingValues,
      incompleteProjects,
      outliers: 0, // Could be calculated based on deal size or velocity outliers
    },
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Filter projects based on analytics filters
 */
function filterProjects(projects: Project[], filters: AnalyticsFilters): Project[] {
  return projects.filter(project => {
    // Date range filter
    const projectDate = new Date(project.created_at)
    if (projectDate < filters.dateRange.start || projectDate > filters.dateRange.end) {
      return false
    }

    // Stage filter
    if (filters.stages && !filters.stages.includes(project.pipeline_stage)) {
      return false
    }

    // Lead source filter
    if (filters.leadSources && filters.leadSources.length > 0) {
      if (!project.lead_source || !filters.leadSources.includes(project.lead_source)) {
        return false
      }
    }

    // Value range filter
    const projectValue = project.final_value || project.approved_value || project.estimated_value || 0
    if (filters.minValue && projectValue < filters.minValue) {
      return false
    }
    if (filters.maxValue && projectValue > filters.maxValue) {
      return false
    }

    // Assigned to filter
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      if (!filters.assignedTo.includes(project.created_by)) {
        return false
      }
    }

    return true
  })
}

/**
 * Calculate velocity metrics for each stage
 */
function calculateStageVelocities(projects: Project[]): StageVelocity[] {
  return STAGE_ORDER.map(stage => {
    const stageProjects = projects.filter(p => p.pipeline_stage === stage)
    const currentDeals = stageProjects.length

    // Calculate days in stage for projects that have stage_changed_at
    const daysInStage = stageProjects
      .filter(p => p.stage_changed_at)
      .map(p => {
        const stageDate = new Date(p.stage_changed_at!)
        const now = new Date()
        return Math.floor((now.getTime() - stageDate.getTime()) / (1000 * 60 * 60 * 24))
      })
      .filter(days => days >= 0)

    const averageDays = daysInStage.length > 0 ?
      daysInStage.reduce((sum, days) => sum + days, 0) / daysInStage.length : 0

    // Calculate median
    const sortedDays = [...daysInStage].sort((a, b) => a - b)
    const medianDays = sortedDays.length > 0 ?
      sortedDays[Math.floor(sortedDays.length / 2)] : 0

    // Mock trend calculation (would compare to previous period)
    const trend: 'faster' | 'slower' | 'stable' = 'stable'
    const trendPercentage = 0

    return {
      stage,
      stageName: STAGE_NAMES[stage],
      averageDays,
      medianDays,
      currentDeals,
      trend,
      trendPercentage,
    }
  })
}

/**
 * Calculate average lead-to-win time for projects
 */
function calculateAverageLeadToWin(projects: Project[]): number {
  const projectTimes = projects
    .filter(p => p.stage_changed_at && p.created_at)
    .map(p => {
      const startDate = new Date(p.created_at)
      const endDate = new Date(p.stage_changed_at!)
      return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    })
    .filter(days => days >= 0)

  return projectTimes.length > 0 ?
    projectTimes.reduce((sum, days) => sum + days, 0) / projectTimes.length : 0
}

/**
 * Calculate velocity for a single project
 */
function calculateProjectVelocity(project: Project): number {
  if (!project.created_at || !project.stage_changed_at) return 0

  const startDate = new Date(project.created_at)
  const endDate = new Date(project.stage_changed_at)
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Create default analytics filters for a time period
 */
export function createDefaultFilters(period: '30_day' | '90_day' | '6_month' | '1_year' = '90_day'): AnalyticsFilters {
  const end = new Date()
  const start = new Date()

  switch (period) {
    case '30_day':
      start.setDate(end.getDate() - 30)
      break
    case '90_day':
      start.setDate(end.getDate() - 90)
      break
    case '6_month':
      start.setMonth(end.getMonth() - 6)
      break
    case '1_year':
      start.setFullYear(end.getFullYear() - 1)
      break
  }

  return {
    dateRange: {
      start,
      end,
      period: period === '30_day' ? 'last_30_days' :
              period === '90_day' ? 'last_90_days' :
              period === '6_month' ? 'last_6_months' : 'last_year'
    }
  }
}