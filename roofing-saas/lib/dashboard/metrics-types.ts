/**
 * Dashboard Metrics Types
 *
 * Type definitions for the tiered dashboard metrics system.
 * Aligns with the UI mode system (field | manager | full).
 */

import type { UIMode } from '@/lib/ui-mode/types'

/**
 * Metrics tier - maps directly to UI mode
 */
export type MetricsTier = UIMode

/**
 * Configuration for each metrics tier
 */
export interface TierConfig {
  /** Target latency in milliseconds */
  targetLatencyMs: number
  /** Cache max-age in seconds */
  cacheMaxAge: number
  /** Cache stale-while-revalidate in seconds */
  cacheStaleWhileRevalidate: number
  /** Which metric cards to display */
  visibleMetrics: MetricCardType[]
}

/**
 * Available metric card types
 */
export type MetricCardType = 'revenue' | 'pipeline' | 'knocks' | 'conversion'

/**
 * Tier configurations
 *
 * - field: Personal stats only, optimized for mobile (<100ms)
 * - manager: Team overview + basic pipeline (<200ms)
 * - full: Complete analytics (<500ms)
 */
export const TIER_CONFIGS: Record<MetricsTier, TierConfig> = {
  field: {
    targetLatencyMs: 100,
    cacheMaxAge: 60,
    cacheStaleWhileRevalidate: 120,
    visibleMetrics: ['knocks'],
  },
  manager: {
    targetLatencyMs: 200,
    cacheMaxAge: 30,
    cacheStaleWhileRevalidate: 60,
    visibleMetrics: ['knocks', 'pipeline', 'conversion'],
  },
  full: {
    targetLatencyMs: 500,
    cacheMaxAge: 15,
    cacheStaleWhileRevalidate: 30,
    visibleMetrics: ['revenue', 'pipeline', 'knocks', 'conversion'],
  },
}

/**
 * Single metric value with trend indicator
 */
export interface MetricValue {
  value: number
  change: number
  trend: 'up' | 'down'
}

/**
 * Recent win for field mode display
 */
export interface RecentWin {
  id: string
  name: string
  value: number
  date: string
}

/**
 * Pipeline status breakdown
 */
export interface PipelineStatus {
  status: string
  count: number
  value: number
}

/**
 * Activity trend data point
 */
export interface ActivityTrendPoint {
  date: string
  count: number
  doorKnocks: number
  calls: number
  emails: number
}

/**
 * Revenue trend data point
 */
export interface RevenueTrendPoint {
  month: string
  revenue: number
}

/**
 * Field tier metrics (minimal, personal)
 */
export interface FieldMetrics {
  knocks: MetricValue
  recentWins: RecentWin[]
}

/**
 * Manager tier metrics (team overview)
 */
export interface ManagerMetrics extends FieldMetrics {
  pipeline: MetricValue
  conversion: MetricValue
  pipelineStatus: PipelineStatus[]
}

/**
 * Full tier metrics (complete analytics)
 */
export interface FullMetrics extends ManagerMetrics {
  revenue: MetricValue
  revenueTrend: RevenueTrendPoint[]
  activityTrend: ActivityTrendPoint[]
  totalContacts: number
  activeProjects: number
  avgJobValue: number
  avgSalesCycle: number
}

/**
 * Union type for all possible metrics responses
 */
export type TieredMetrics = FieldMetrics | ManagerMetrics | FullMetrics

/**
 * API response structure
 */
export interface MetricsApiResponse {
  success: boolean
  data: {
    metrics: TieredMetrics
    tier: MetricsTier
    latencyMs: number
  }
}

/**
 * Helper to get cache headers for a tier
 */
export function getCacheHeaders(tier: MetricsTier): HeadersInit {
  const config = TIER_CONFIGS[tier]
  return {
    'Cache-Control': `private, max-age=${config.cacheMaxAge}, stale-while-revalidate=${config.cacheStaleWhileRevalidate}`,
  }
}

/**
 * Helper to map UI mode to metrics tier
 * (Currently 1:1 mapping, but allows for future customization)
 */
export function uiModeToTier(mode: UIMode): MetricsTier {
  return mode
}

/**
 * Type guard to check if metrics include pipeline data (manager+)
 */
export function hasManagerMetrics(metrics: TieredMetrics): metrics is ManagerMetrics {
  return 'pipeline' in metrics && 'conversion' in metrics
}

/**
 * Type guard to check if metrics include full analytics
 */
export function hasFullMetrics(metrics: TieredMetrics): metrics is FullMetrics {
  return 'revenue' in metrics && 'revenueTrend' in metrics
}
