'use client'

import { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Clock } from 'lucide-react'

// Lazy load chart components to reduce initial bundle size
const RevenueChart = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.RevenueChart })),
  {
    loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>,
    ssr: false
  }
)

const PipelineChart = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.PipelineChart })),
  {
    loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>,
    ssr: false
  }
)

const ActivityChart = dynamic(
  () => import('./DashboardCharts').then(mod => ({ default: mod.ActivityChart })),
  {
    loading: () => <div className="h-[300px] flex items-center justify-center text-muted-foreground">Loading chart...</div>,
    ssr: false
  }
)

interface DashboardMetricsProps {
  initialData?: DashboardData | null
  scope?: 'user' | 'company'
}

interface DashboardData {
  metrics: {
    totalContacts: number
    activeProjects: number
    monthlyRevenue: number
    conversionRate: number
    avgJobValue: number
    avgSalesCycle: number
    doorsKnockedPerDay: number
    doorsKnocked7Days: number
    revenueTrend: { month: string; revenue: number }[]
    pipelineStatus: { status: string; count: number; value: number }[]
    activityTrend: {
      date: string
      count: number
      doorKnocks: number
      calls: number
      emails: number
    }[]
  }
}

export function DashboardMetrics({ initialData, scope = 'company' }: DashboardMetricsProps) {
  const [data, setData] = useState<DashboardData | null>(initialData || null)
  const [isLoading, setIsLoading] = useState(!initialData)
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
      if (result.success && result.data && result.data.metrics) {
        setData(result.data)
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

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-5 w-5 bg-muted rounded" />
              </div>
              <div className="h-8 bg-muted rounded w-32 mb-1" />
              <div className="h-3 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
        {/* Secondary KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6">
              <div className="flex items-center justify-between mb-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-5 w-5 bg-muted rounded" />
              </div>
              <div className="h-8 bg-muted rounded w-32 mb-1" />
              <div className="h-3 bg-muted rounded w-20" />
            </div>
          ))}
        </div>
        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-6">
              <div className="h-6 bg-muted rounded w-32 mb-2" />
              <div className="h-4 bg-muted rounded w-48 mb-4" />
              <div className="h-[250px] bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-muted-foreground mb-4">{error}</div>
          <Button
            onClick={() => fetchMetrics()}
            variant="outline"
            size="sm"
          >
            Try again
          </Button>
        </div>
      </div>
    )
  }

  if (!data || !data.metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">No data available</div>
      </div>
    )
  }

  const { metrics } = data

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Monthly Revenue"
          value={formatCurrency(metrics.monthlyRevenue)}
          icon={<DollarSign className="h-5 w-5" />}
          trend={null}
        />
        <KPICard
          title="Active Projects"
          value={metrics.activeProjects.toString()}
          icon={<Target className="h-5 w-5" />}
          subtitle="In pipeline"
        />
        <KPICard
          title="Total Contacts"
          value={metrics.totalContacts.toString()}
          icon={<Users className="h-5 w-5" />}
          subtitle="Leads & customers"
        />
        <KPICard
          title="Conversion Rate"
          value={`${formatNumber(metrics.conversionRate)}%`}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle="Lead to won"
        />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Avg Job Value"
          value={formatCurrency(metrics.avgJobValue)}
          icon={<DollarSign className="h-5 w-5" />}
          subtitle="Won projects"
        />
        <KPICard
          title="Sales Cycle"
          value={`${formatNumber(metrics.avgSalesCycle)} days`}
          icon={<Clock className="h-5 w-5" />}
          subtitle="Lead to close"
        />
        <KPICard
          title="Doors Knocked"
          value={formatNumber(metrics.doorsKnockedPerDay)}
          icon={<Target className="h-5 w-5" />}
          subtitle="Per day (30d avg)"
        />
        <KPICard
          title="This Week"
          value={metrics.doorsKnocked7Days.toString()}
          icon={<TrendingUp className="h-5 w-5" />}
          subtitle="Doors knocked (7d)"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Last 6 months of closed deals</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={metrics.revenueTrend} />
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Status</CardTitle>
            <CardDescription>Active deals in pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineChart data={metrics.pipelineStatus} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6">
        {/* Activity Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Trend</CardTitle>
            <CardDescription>Last 7 days of team activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityChart data={metrics.activityTrend} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

interface KPICardProps {
  title: string
  value: string
  icon: React.ReactNode
  subtitle?: string
  trend?: { value: number; isPositive: boolean } | null
}

function KPICard({ title, value, icon, subtitle, trend }: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
              <span className={trend.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
