'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Phone } from 'lucide-react'

export type DashboardScope = 'company' | 'team' | 'personal'

interface DashboardMetricsProps {
  scope: DashboardScope
}

interface MetricsData {
  revenue: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  pipeline: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  knocks: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
  conversion: {
    value: number
    change: number
    trend: 'up' | 'down'
  }
}

export function DashboardMetrics({ scope }: DashboardMetricsProps) {
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000) // 30s timeout

    try {
      const response = await fetch(`/api/dashboard/metrics?scope=${scope}`, {
        signal: abortController.signal
      })

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
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch dashboard metrics:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error:')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setIsLoading(false)
    }
  }, [scope])

  useEffect(() => {
    fetchMetrics()
  }, [fetchMetrics])

  const formatValue = (value: number, type: 'currency' | 'number' | 'percentage') => {
    if (type === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0
      }).format(value)
    }
    if (type === 'percentage') {
      return `${value}%`
    }
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(4)].map((_, i) => (
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

  // Show error state with retry
  if (error) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">{error}</div>
              <Button
                onClick={() => fetchMetrics()}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show no data state
  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">No metrics data available</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const metricCards = [
    {
      title: 'Revenue',
      value: formatValue(metrics.revenue.value, 'currency'),
      change: metrics.revenue.change,
      trend: metrics.revenue.trend,
      icon: DollarSign,
      description: 'This month'
    },
    {
      title: 'Pipeline Value',
      value: formatValue(metrics.pipeline.value, 'currency'),
      change: metrics.pipeline.change,
      trend: metrics.pipeline.trend,
      icon: Target,
      description: 'Active opportunities'
    },
    {
      title: 'Door Knocks',
      value: formatValue(metrics.knocks.value, 'number'),
      change: metrics.knocks.change,
      trend: metrics.knocks.trend,
      icon: Phone,
      description: 'This week'
    },
    {
      title: 'Conversion Rate',
      value: formatValue(metrics.conversion.value, 'percentage'),
      change: metrics.conversion.change,
      trend: metrics.conversion.trend,
      icon: Users,
      description: 'Last 30 days'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric) => {
        const Icon = metric.icon
        const isPositive = metric.change > 0
        const TrendIcon = metric.trend === 'up' ? TrendingUp : TrendingDown

        return (
          <Card key={metric.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                <TrendIcon className={`h-3 w-3 ${isPositive ? 'text-green-600' : 'text-red-600'}`} />
                <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
                  {Math.abs(metric.change)}%
                </span>
                <span>from last period</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}