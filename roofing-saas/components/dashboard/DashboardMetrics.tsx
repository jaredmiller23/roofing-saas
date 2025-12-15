'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Target, Users, Phone } from 'lucide-react'

export type DashboardScope = 'company' | 'team' | 'personal'

interface DashboardMetricsProps {
  scope: DashboardScope
}

export function DashboardMetrics({ scope }: DashboardMetricsProps) {
  // Mock data - in real implementation this would come from API
  const metrics = {
    revenue: {
      value: scope === 'company' ? 125000 : scope === 'team' ? 45000 : 15000,
      change: 12.5,
      trend: 'up'
    },
    pipeline: {
      value: scope === 'company' ? 350000 : scope === 'team' ? 125000 : 42000,
      change: 8.2,
      trend: 'up'
    },
    knocks: {
      value: scope === 'company' ? 2450 : scope === 'team' ? 875 : 145,
      change: -3.1,
      trend: 'down'
    },
    conversion: {
      value: scope === 'company' ? 18.5 : scope === 'team' ? 22.1 : 16.8,
      change: 2.3,
      trend: 'up'
    }
  }

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