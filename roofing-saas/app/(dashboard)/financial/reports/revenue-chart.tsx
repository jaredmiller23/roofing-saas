'use client'

import { useMemo } from 'react'

interface Project {
  actual_completion: string | null
  revenue: number
}

interface RevenueChartProps {
  projects: Project[]
}

export function RevenueChart({ projects }: RevenueChartProps) {
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {}

    projects.forEach(project => {
      if (!project.actual_completion) return

      const date = new Date(project.actual_completion)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      if (!months[monthKey]) {
        months[monthKey] = 0
      }

      months[monthKey] += project.revenue || 0
    })

    // Get last 6 months
    const result: { month: string; revenue: number }[] = []
    const today = new Date()

    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('en-US', { month: 'short' })

      result.push({
        month: monthName,
        revenue: months[monthKey] || 0
      })
    }

    return result
  }, [projects])

  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue), 1)

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: 'compact',
      compactDisplay: 'short'
    }).format(value)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trend (Last 6 Months)</h3>

      <div className="space-y-4">
        {monthlyData.map((data, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-muted-foreground">{data.month}</span>
              <span className="text-sm font-semibold text-foreground">{formatCurrency(data.revenue)}</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {monthlyData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No completed projects in the last 6 months</p>
        </div>
      )}
    </div>
  )
}
