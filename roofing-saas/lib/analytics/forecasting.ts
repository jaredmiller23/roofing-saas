/**
 * Revenue Forecasting Module
 *
 * Predictive analytics for revenue forecasting based on pipeline data
 * and historical performance
 */

import { Project, PipelineStage } from '@/lib/types/api'
import {
  RevenueForecast,
  ForecastPeriod,
  AnalyticsFilters,
} from './analytics-types'
import { calculateWinLossAnalysis } from './pipeline-analytics'

// Stage probability weights for pipeline forecasting
const STAGE_PROBABILITIES: Record<PipelineStage, number> = {
  prospect: 0.1,     // 10% chance of closing
  qualified: 0.25,   // 25% chance of closing
  quote_sent: 0.5,   // 50% chance of closing
  negotiation: 0.75, // 75% chance of closing
  won: 1.0,          // 100% - already won
  production: 1.0,   // 100% - already won, in production
  complete: 1.0,     // 100% - completed
  lost: 0.0,         // 0% - lost
}

// Expected close timeframes by stage (in days)
const STAGE_CLOSE_TIMEFRAMES: Record<PipelineStage, number> = {
  prospect: 90,      // 90 days from prospect to close
  qualified: 60,     // 60 days from qualified to close
  quote_sent: 45,    // 45 days from quote sent to close
  negotiation: 21,   // 21 days from negotiation to close
  won: 7,            // 7 days from won to complete
  production: 30,    // 30 days from production to complete
  complete: 0,       // Already complete
  lost: 0,           // Lost deals don't close
}

/**
 * Generate comprehensive revenue forecast
 */
export function generateRevenueForecast(
  projects: Project[],
  filters: AnalyticsFilters
): RevenueForecast {
  const filteredProjects = filterProjectsWithHistory(projects, filters)

  // Calculate historical baselines
  const historicalData = calculateHistoricalBaselines(filteredProjects)
  const winLossAnalysis = calculateWinLossAnalysis(filteredProjects, filters)

  // Get current pipeline
  const currentPipeline = getCurrentPipeline(projects)

  // Generate forecasts for different periods
  const periods: ForecastPeriod[] = [
    generatePeriodForecast(currentPipeline, historicalData, '30_day', '30-Day'),
    generatePeriodForecast(currentPipeline, historicalData, '60_day', '60-Day'),
    generatePeriodForecast(currentPipeline, historicalData, '90_day', '90-Day'),
  ]

  // Calculate overall metrics
  const totalPipelineValue = currentPipeline.reduce((sum, p) => {
    const value = p.estimated_value || p.approved_value || 0
    return sum + value
  }, 0)

  const averageDealSize = winLossAnalysis.averageWonValue || 0
  const monthlyRunRate = calculateMonthlyRunRate(filteredProjects)

  // Calculate trends (comparing current period to previous period)
  const trends = calculateTrends(filteredProjects, filters)

  return {
    periods,
    totalPipelineValue,
    overallWinRate: winLossAnalysis.winRate,
    averageDealSize,
    monthlyRunRate,
    pipelineGrowth: trends.pipelineGrowth,
    dealSizeTrend: trends.dealSizeTrend,
    velocityTrend: trends.velocityTrend,
  }
}

/**
 * Generate forecast for a specific time period
 */
function generatePeriodForecast(
  currentPipeline: Project[],
  historicalData: HistoricalData,
  period: '30_day' | '60_day' | '90_day',
  periodName: string
): ForecastPeriod {
  const periodDays = parseInt(period.split('_')[0])

  // Pipeline-based forecast
  const pipelineResults = calculatePipelineForecast(currentPipeline, periodDays)

  // Historical forecast
  const historicalForecast = historicalData.averageMonthlyRevenue * (periodDays / 30)

  // Combined forecast (weighted average)
  const pipelineWeight = 0.7 // 70% weight on pipeline
  const historicalWeight = 0.3 // 30% weight on historical

  const combinedForecast = (pipelineResults.weightedValue * pipelineWeight) +
                          (historicalForecast * historicalWeight)

  // Determine confidence level
  const confidence = determineConfidence(
    currentPipeline.length,
    historicalData.dataQuality,
    pipelineResults.weightedValue,
    historicalForecast
  )

  // Get expected closures for this period
  const expectedClosures = getExpectedClosures(currentPipeline, periodDays)

  return {
    period,
    periodName,
    pipelineForecast: pipelineResults.totalValue,
    weightedPipelineValue: pipelineResults.weightedValue,
    historicalForecast,
    historicalAverage: historicalData.averageMonthlyRevenue,
    combinedForecast,
    confidence,
    expectedClosures,
  }
}

/**
 * Calculate pipeline-based forecast
 */
function calculatePipelineForecast(
  pipeline: Project[],
  periodDays: number
): { totalValue: number; weightedValue: number } {
  let totalValue = 0
  let weightedValue = 0

  for (const project of pipeline) {
    const projectValue = project.estimated_value || project.approved_value || 0
    if (projectValue === 0) continue

    const stage = project.pipeline_stage
    const probability = STAGE_PROBABILITIES[stage]
    const expectedCloseTime = STAGE_CLOSE_TIMEFRAMES[stage]

    // Include in forecast if expected to close within the period
    if (expectedCloseTime <= periodDays) {
      totalValue += projectValue
      weightedValue += projectValue * probability

      // Apply time-based probability adjustment
      if (expectedCloseTime > 0) {
        const timeFactor = Math.max(0, 1 - (expectedCloseTime / periodDays))
        weightedValue += projectValue * timeFactor * 0.1 // Small boost for deals closing sooner
      }
    }
  }

  return { totalValue, weightedValue }
}

/**
 * Get expected closures for a period
 */
function getExpectedClosures(
  pipeline: Project[],
  periodDays: number
): Array<{
  projectId: string
  projectName: string
  probability: number
  value: number
  expectedCloseDate: string
}> {
  const now = new Date()

  return pipeline
    .filter(p => {
      const expectedCloseTime = STAGE_CLOSE_TIMEFRAMES[p.pipeline_stage]
      return expectedCloseTime <= periodDays && expectedCloseTime > 0
    })
    .map(project => {
      const stage = project.pipeline_stage
      const expectedCloseTime = STAGE_CLOSE_TIMEFRAMES[stage]
      const expectedCloseDate = new Date(now.getTime() + expectedCloseTime * 24 * 60 * 60 * 1000)

      return {
        projectId: project.id,
        projectName: project.name,
        probability: STAGE_PROBABILITIES[stage],
        value: project.estimated_value || project.approved_value || 0,
        expectedCloseDate: expectedCloseDate.toISOString(),
      }
    })
    .sort((a, b) => b.probability - a.probability) // Sort by probability desc
    .slice(0, 10) // Top 10 most likely to close
}

/**
 * Calculate historical baselines
 */
interface HistoricalData {
  averageMonthlyRevenue: number
  monthlyRevenueVariation: number
  dataQuality: number // 0-1 score
  historicalWinRate: number
  averageDealSize: number
}

function calculateHistoricalBaselines(projects: Project[]): HistoricalData {
  // Get completed deals from the last year
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const completedDeals = projects.filter(p =>
    (p.pipeline_stage === 'complete' || p.pipeline_stage === 'won') &&
    new Date(p.updated_at) >= oneYearAgo
  )

  if (completedDeals.length === 0) {
    return {
      averageMonthlyRevenue: 0,
      monthlyRevenueVariation: 0,
      dataQuality: 0,
      historicalWinRate: 0,
      averageDealSize: 0,
    }
  }

  // Calculate monthly revenue for the past year
  const monthlyRevenues: number[] = []
  const now = new Date()

  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)

    const monthlyDeals = completedDeals.filter(p => {
      const dealDate = new Date(p.updated_at)
      return dealDate >= monthStart && dealDate <= monthEnd
    })

    const monthlyRevenue = monthlyDeals.reduce((sum, p) => {
      const value = p.final_value || p.approved_value || p.estimated_value || 0
      return sum + value
    }, 0)

    monthlyRevenues.push(monthlyRevenue)
  }

  const averageMonthlyRevenue = monthlyRevenues.reduce((sum, rev) => sum + rev, 0) / monthlyRevenues.length
  const monthlyRevenueVariation = calculateStandardDeviation(monthlyRevenues) / averageMonthlyRevenue

  // Calculate data quality based on how much historical data we have
  const dataQuality = Math.min(1, completedDeals.length / 50) // Good quality with 50+ deals

  // Historical win rate
  const allDealsLastYear = projects.filter(p =>
    (p.pipeline_stage === 'complete' || p.pipeline_stage === 'won' || p.pipeline_stage === 'lost') &&
    new Date(p.updated_at) >= oneYearAgo
  )
  const wonDealsLastYear = allDealsLastYear.filter(p =>
    p.pipeline_stage === 'complete' || p.pipeline_stage === 'won'
  )
  const historicalWinRate = allDealsLastYear.length > 0 ?
    (wonDealsLastYear.length / allDealsLastYear.length) * 100 : 0

  const averageDealSize = completedDeals.length > 0 ?
    completedDeals.reduce((sum, p) => {
      const value = p.final_value || p.approved_value || p.estimated_value || 0
      return sum + value
    }, 0) / completedDeals.length : 0

  return {
    averageMonthlyRevenue,
    monthlyRevenueVariation,
    dataQuality,
    historicalWinRate,
    averageDealSize,
  }
}

/**
 * Calculate monthly run rate
 */
function calculateMonthlyRunRate(projects: Project[]): number {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonthDeals = projects.filter(p =>
    (p.pipeline_stage === 'complete' || p.pipeline_stage === 'won') &&
    new Date(p.updated_at) >= monthStart
  )

  return thisMonthDeals.reduce((sum, p) => {
    const value = p.final_value || p.approved_value || p.estimated_value || 0
    return sum + value
  }, 0)
}

/**
 * Calculate trends by comparing current period to previous period
 */
function calculateTrends(
  projects: Project[],
  filters: AnalyticsFilters
): {
  pipelineGrowth: number
  dealSizeTrend: number
  velocityTrend: number
} {
  const currentPeriodProjects = filterProjectsWithHistory(projects, filters)

  // Get previous period (same duration, offset back)
  const periodDays = Math.floor(
    (filters.dateRange.end.getTime() - filters.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  )

  const previousPeriodEnd = new Date(filters.dateRange.start)
  const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDays * 24 * 60 * 60 * 1000)

  const previousFilters = {
    ...filters,
    dateRange: {
      ...filters.dateRange,
      start: previousPeriodStart,
      end: previousPeriodEnd,
    }
  }

  const previousPeriodProjects = filterProjectsWithHistory(projects, previousFilters)

  // Calculate pipeline value growth
  const currentPipelineValue = calculatePipelineValue(currentPeriodProjects)
  const previousPipelineValue = calculatePipelineValue(previousPeriodProjects)

  const pipelineGrowth = previousPipelineValue > 0 ?
    ((currentPipelineValue - previousPipelineValue) / previousPipelineValue) * 100 : 0

  // Calculate deal size trend
  const currentAvgDealSize = calculateAverageDealSize(currentPeriodProjects)
  const previousAvgDealSize = calculateAverageDealSize(previousPeriodProjects)

  const dealSizeTrend = previousAvgDealSize > 0 ?
    ((currentAvgDealSize - previousAvgDealSize) / previousAvgDealSize) * 100 : 0

  // Calculate velocity trend (average days-to-close for won projects)
  const currentVelocity = calculateAverageVelocity(currentPeriodProjects)
  const previousVelocity = calculateAverageVelocity(previousPeriodProjects)

  // Note: Lower velocity is better (faster closes), so negative trend = improvement
  const velocityTrend = previousVelocity > 0 ?
    ((currentVelocity - previousVelocity) / previousVelocity) * 100 : 0

  return {
    pipelineGrowth,
    dealSizeTrend,
    velocityTrend,
  }
}

/**
 * Determine forecast confidence level
 */
function determineConfidence(
  pipelineSize: number,
  dataQuality: number,
  pipelineForecast: number,
  historicalForecast: number
): 'high' | 'medium' | 'low' {
  // Calculate variance between pipeline and historical forecasts
  const forecastVariance = Math.abs(pipelineForecast - historicalForecast) / Math.max(pipelineForecast, historicalForecast, 1)

  // Confidence factors
  const pipelineSizeFactor = Math.min(1, pipelineSize / 20) // Good with 20+ deals in pipeline
  const dataQualityFactor = dataQuality
  const forecastAgreementFactor = Math.max(0, 1 - forecastVariance) // Lower variance = higher confidence

  const overallConfidence = (pipelineSizeFactor + dataQualityFactor + forecastAgreementFactor) / 3

  if (overallConfidence >= 0.75) return 'high'
  if (overallConfidence >= 0.5) return 'medium'
  return 'low'
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get current active pipeline
 */
function getCurrentPipeline(projects: Project[]): Project[] {
  return projects.filter(p =>
    p.pipeline_stage !== 'complete' && p.pipeline_stage !== 'lost'
  )
}

/**
 * Filter projects including historical lookback
 */
function filterProjectsWithHistory(projects: Project[], filters: AnalyticsFilters): Project[] {
  return projects.filter(project => {
    const projectDate = new Date(project.created_at)
    if (projectDate < filters.dateRange.start || projectDate > filters.dateRange.end) {
      return false
    }
    return true
  })
}

/**
 * Calculate total pipeline value
 */
function calculatePipelineValue(projects: Project[]): number {
  return projects.reduce((sum, p) => {
    const value = p.estimated_value || p.approved_value || p.final_value || 0
    return sum + value
  }, 0)
}

/**
 * Calculate average deal size
 */
function calculateAverageDealSize(projects: Project[]): number {
  const completedDeals = projects.filter(p =>
    p.pipeline_stage === 'complete' || p.pipeline_stage === 'won'
  )

  if (completedDeals.length === 0) return 0

  const totalValue = completedDeals.reduce((sum, p) => {
    const value = p.final_value || p.approved_value || p.estimated_value || 0
    return sum + value
  }, 0)

  return totalValue / completedDeals.length
}

/**
 * Calculate average velocity (days-to-close) for won projects
 */
function calculateAverageVelocity(projects: Project[]): number {
  const wonProjects = projects.filter(p =>
    p.pipeline_stage === 'complete' || p.pipeline_stage === 'won'
  )

  if (wonProjects.length === 0) return 0

  const velocities = wonProjects
    .map(p => {
      const startDate = new Date(p.created_at)
      const closeDate = new Date(p.updated_at)
      return Math.floor((closeDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    })
    .filter(days => days >= 0)

  return velocities.length > 0 ?
    velocities.reduce((sum, days) => sum + days, 0) / velocities.length : 0
}

/**
 * Calculate standard deviation
 */
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  const squaredDifferences = values.map(val => Math.pow(val - mean, 2))
  const avgSquaredDiff = squaredDifferences.reduce((sum, val) => sum + val, 0) / values.length

  return Math.sqrt(avgSquaredDiff)
}