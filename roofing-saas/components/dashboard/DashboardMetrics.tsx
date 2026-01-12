'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useUIMode } from '@/hooks/useUIMode'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Phone, Trophy } from 'lucide-react'
import {
  type MetricsTier,
  type TieredMetrics,
  type MetricCardType,
  TIER_CONFIGS,
  hasManagerMetrics,
  hasFullMetrics,
} from '@/lib/dashboard/metrics-types'

export type DashboardScope = 'company' | 'team' | 'personal'

interface DashboardMetricsProps {
  scope: DashboardScope
}

/**
 * Metric card configuration
 */
interface MetricCardConfig {
  title: string
  icon: typeof DollarSign
  valueType: 'currency' | 'number' | 'percentage'
  description: string
}

const METRIC_CARD_CONFIGS: Record<MetricCardType, MetricCardConfig> = {
  revenue: {
    title: 'Revenue',
    icon: DollarSign,
    valueType: 'currency',
    description: 'This month',
  },
  pipeline: {
    title: 'Pipeline Value',
    icon: Target,
    valueType: 'currency',
    description: 'Active opportunities',
  },
  knocks: {
    title: 'Door Knocks',
    icon: Phone,
    valueType: 'number',
    description: 'This week',
  },
  conversion: {
    title: 'Conversion Rate',
    icon: Users,
    valueType: 'percentage',
    description: 'All time',
  },
}

export function DashboardMetrics({ scope }: DashboardMetricsProps) {
  const { isFieldMode, isManagerMode } = useUIMode()
  const [metrics, setMetrics] = useState<TieredMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Map UI mode to metrics tier
  const tier: MetricsTier = useMemo(() => {
    if (isFieldMode) return 'field'
    if (isManagerMode) return 'manager'
    return 'full'
  }, [isFieldMode, isManagerMode])

  // Get visible metrics for current tier
  const visibleMetrics = useMemo(() => {
    return TIER_CONFIGS[tier].visibleMetrics
  }, [tier])

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000)

    try {
      const response = await fetch(
        `/api/dashboard/metrics?scope=${scope}&mode=${tier}`,
        { signal: abortController.signal }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        setMetrics(result.data.metrics)
      } else {
        setError('Failed to load metrics data')
      }
    } catch (err) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch dashboard metrics:', err)

      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (err instanceof Error && err.message?.includes('Server error:')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setIsLoading(false)
    }
  }, [scope, tier])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const formatValue = (value: number, type: 'currency' | 'number' | 'percentage') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(value)
    }
    if (type === 'percentage') {
      return `${value}%`
    }
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Get metric value from tiered metrics
  const getMetricValue = (
    metricType: MetricCardType
  ): { value: number; change: number; trend: 'up' | 'down' } | null => {
    if (!metrics) return null

    switch (metricType) {
      case 'knocks':
        return metrics.knocks
      case 'pipeline':
        return hasManagerMetrics(metrics) ? metrics.pipeline : null
      case 'conversion':
        return hasManagerMetrics(metrics) ? metrics.conversion : null
      case 'revenue':
        return hasFullMetrics(metrics) ? metrics.revenue : null
      default:
        return null
    }
  }

  // Loading skeleton - adapts to tier
  if (isLoading) {
    const skeletonCount = visibleMetrics.length
    const gridCols =
      skeletonCount === 1
        ? 'grid-cols-1'
        : skeletonCount === 2
          ? 'grid-cols-1 md:grid-cols-2'
          : skeletonCount === 3
            ? 'grid-cols-1 md:grid-cols-3'
            : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'

    return (
      <div className={`grid ${gridCols} gap-6 animate-pulse`}>
        {visibleMetrics.map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-muted rounded w-24" />
              <div className="h-4 w-4 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2" />
              <div className="h-3 bg-muted rounded w-20 mb-1" />
              <div className="h-3 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`grid grid-cols-1 gap-6`}>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">{error}</div>
              <Button onClick={() => fetchMetrics()} variant="outline" size="sm">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No data state
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">No metrics data available</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Field mode: Special compact layout with recent wins
  if (tier === 'field' && metrics.recentWins) {
    return (
      <div className="space-y-4">
        {/* Knock count card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Your Knocks This Week</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics.knocks.value}</div>
            <p className="text-xs text-muted-foreground mt-1">Keep up the great work!</p>
          </CardContent>
        </Card>

        {/* Recent wins */}
        {metrics.recentWins.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Wins</CardTitle>
              <Trophy className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {metrics.recentWins.slice(0, 3).map((win) => (
                  <div
                    key={win.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate max-w-[60%]">{win.name}</span>
                    <span className="font-medium text-primary">
                      {formatValue(win.value, 'currency')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Manager and Full mode: Grid layout
  const gridCols =
    visibleMetrics.length <= 2
      ? 'grid-cols-1 md:grid-cols-2'
      : visibleMetrics.length === 3
        ? 'grid-cols-1 md:grid-cols-3'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'

  return (
    <div className={`grid ${gridCols} gap-6`}>
      {visibleMetrics.map((metricType) => {
        const config = METRIC_CARD_CONFIGS[metricType]
        const metricData = getMetricValue(metricType)

        if (!metricData) return null

        const Icon = config.icon
        const isPositive = metricData.change >= 0
        const TrendIcon = metricData.trend === 'up' ? TrendingUp : TrendingDown

        return (
          <Card key={metricType}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{config.title}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(metricData.value, config.valueType)}
              </div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendIcon
                  className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`}
                />
                <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                  {Math.abs(metricData.change)}%
                </span>
                <span>from last period</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
