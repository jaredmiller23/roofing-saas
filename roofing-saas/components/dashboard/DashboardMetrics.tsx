'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Users, Target, Clock } from 'lucide-react'

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

  useEffect(() => {
    fetchMetrics()
  }, [scope])

  const fetchMetrics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/dashboard/metrics?scope=${scope}`)
      const result = await response.json()
      if (result.success) {
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading metrics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
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
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ color: '#000' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pipeline Status */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Status</CardTitle>
            <CardDescription>Active deals in pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.pipelineStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis yAxisId="left" orientation="left" stroke="#2563eb" />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#10b981"
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) => {
                    if (name === 'value') return formatCurrency(value)
                    return value
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="count" fill="#2563eb" name="Count" />
                <Bar yAxisId="right" dataKey="value" fill="#10b981" name="Value" />
              </BarChart>
            </ResponsiveContainer>
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
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.activityTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="doorKnocks" fill="#2563eb" name="Door Knocks" stackId="a" />
                <Bar dataKey="calls" fill="#10b981" name="Calls" stackId="a" />
                <Bar dataKey="emails" fill="#f59e0b" name="Emails" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
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
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="text-gray-400">{icon}</div>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500">vs last month</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
