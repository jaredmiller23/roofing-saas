/**
 * Analytics Types
 *
 * Type definitions for pipeline analytics calculations
 */

import { PipelineStage, Project } from '@/lib/types/api'

// ============================================
// Conversion Funnel Types
// ============================================

export interface FunnelStage {
  stage: PipelineStage
  stageName: string
  count: number
  value: number // Total revenue in stage
  conversionRate: number // % of previous stage that converted
  dropOffRate: number // % of previous stage that didn't convert
  averageDaysInStage: number
}

export interface ConversionFunnel {
  stages: FunnelStage[]
  overallConversionRate: number // Prospect to Won rate
  totalProspects: number
  totalWon: number
  totalRevenue: number
  averageLeadToWin: number // Days from prospect to won
}

// ============================================
// Velocity & Performance Types
// ============================================

export interface StageVelocity {
  stage: PipelineStage
  stageName: string
  averageDays: number
  medianDays: number
  currentDeals: number
  trend: 'faster' | 'slower' | 'stable'
  trendPercentage: number
}

export interface PipelineVelocity {
  stages: StageVelocity[]
  overallVelocity: number // Total average days from prospect to close
  fastestDeals: Project[]
  slowestDeals: Project[]
  bottlenecks: PipelineStage[] // Stages with highest average days
}

// ============================================
// Win/Loss Analysis Types
// ============================================

export interface LossReason {
  reason: string
  count: number
  percentage: number
  averageValue: number
  totalLostValue: number
}

export interface WinLossAnalysis {
  totalDeals: number
  wonDeals: number
  lostDeals: number
  winRate: number

  // Revenue analysis
  totalWonRevenue: number
  totalLostRevenue: number
  averageWonValue: number
  averageLostValue: number

  // Lead source performance
  leadSourcePerformance: Array<{
    source: string
    totalDeals: number
    wonDeals: number
    winRate: number
    totalRevenue: number
  }>

  // Loss reasons
  lossReasons: LossReason[]
  lossReasonsAvailable: boolean // Whether loss reason data is configured/available

  // Time analysis
  averageWonTime: number // Days to close won deals
  averageLostTime: number // Days to close lost deals
}

// ============================================
// Revenue Forecasting Types
// ============================================

export interface ForecastPeriod {
  period: '30_day' | '60_day' | '90_day'
  periodName: string

  // Pipeline forecast (based on current pipeline)
  pipelineForecast: number
  weightedPipelineValue: number // Pipeline value * win rate

  // Historical forecast (based on historical data)
  historicalForecast: number
  historicalAverage: number

  // Combined forecast
  combinedForecast: number
  confidence: 'high' | 'medium' | 'low'

  // Contributing factors
  expectedClosures: Array<{
    projectId: string
    projectName: string
    probability: number
    value: number
    expectedCloseDate: string
  }>
}

export interface RevenueForecast {
  periods: ForecastPeriod[]
  totalPipelineValue: number
  overallWinRate: number
  averageDealSize: number
  monthlyRunRate: number

  // Trends
  pipelineGrowth: number // % growth in pipeline value
  dealSizeTrend: number // % change in average deal size
  velocityTrend: number // % change in close velocity
}

// ============================================
// Team Performance Types
// ============================================

export interface TeamMemberPerformance {
  userId: string
  userName: string

  // Deal metrics
  totalDeals: number
  wonDeals: number
  lostDeals: number
  winRate: number

  // Revenue metrics
  totalRevenue: number
  averageDealSize: number

  // Activity metrics
  averageVelocity: number
  dealsInPipeline: number
  pipelineValue: number

  // Conversion metrics
  conversionRates: Record<PipelineStage, number>
}

// ============================================
// Date Range and Filters
// ============================================

export interface AnalyticsDateRange {
  start: Date
  end: Date
  period: 'last_30_days' | 'last_90_days' | 'last_6_months' | 'last_year' | 'custom'
}

export interface AnalyticsFilters {
  dateRange: AnalyticsDateRange
  stages?: PipelineStage[]
  leadSources?: string[]
  assignedTo?: string[]
  minValue?: number
  maxValue?: number
}

// ============================================
// Combined Analytics Dashboard Data
// ============================================

export interface PipelineAnalytics {
  conversionFunnel: ConversionFunnel
  velocity: PipelineVelocity
  winLossAnalysis: WinLossAnalysis
  revenueForecast: RevenueForecast
  teamPerformance: TeamMemberPerformance[]

  // Meta information
  filters: AnalyticsFilters
  lastUpdated: string
  dataQuality: {
    missingValues: number
    incompleteProjects: number
    outliers: number
  }
}

// ============================================
// Chart and Visualization Types
// ============================================

export interface ChartDataPoint {
  label: string
  value: number
  color?: string
  metadata?: Record<string, unknown>
}

export interface TrendDataPoint {
  date: string
  value: number
  period: string
}

export interface HeatmapDataPoint {
  x: string
  y: string
  value: number
  color: string
}

// ============================================
// Drill-down and Detail View Types
// ============================================

export interface DrilldownContext {
  type: 'stage' | 'lead_source' | 'team_member' | 'time_period'
  value: string
  filters: AnalyticsFilters
}

export interface DrilldownData {
  context: DrilldownContext
  projects: Project[]
  summary: {
    totalCount: number
    totalValue: number
    averageValue: number
    winRate?: number
    averageVelocity?: number
  }
}