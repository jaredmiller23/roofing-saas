'use client'

import { useMemo } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

interface Expense {
  expense_type: string
  category?: string | null
  amount: number
  expense_date: string
  vendor_name?: string | null
}

interface CostTrendAnalysisProps {
  expenses: Expense[]
}

export function CostTrendAnalysis({ expenses }: CostTrendAnalysisProps) {
  const analysis = useMemo(() => {
    // Group expenses by type and month
    const byTypeAndMonth: Record<string, Record<string, number>> = {}
    const byVendor: Record<string, number> = {}

    expenses.forEach(expense => {
      const type = expense.expense_type
      const date = new Date(expense.expense_date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

      // By type and month
      if (!byTypeAndMonth[type]) {
        byTypeAndMonth[type] = {}
      }
      byTypeAndMonth[type][monthKey] = (byTypeAndMonth[type][monthKey] || 0) + expense.amount

      // By vendor
      if (expense.vendor_name) {
        byVendor[expense.vendor_name] = (byVendor[expense.vendor_name] || 0) + expense.amount
      }
    })

    // Calculate trends for each expense type
    const trends: Array<{
      type: string
      current: number
      previous: number
      change: number
      percentChange: number
    }> = []

    const today = new Date()
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
    const lastMonth = `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`

    Object.entries(byTypeAndMonth).forEach(([type, months]) => {
      const current = months[currentMonth] || 0
      const previous = months[lastMonth] || 0
      const change = current - previous
      const percentChange = previous > 0 ? (change / previous) * 100 : 0

      trends.push({
        type,
        current,
        previous,
        change,
        percentChange,
      })
    })

    // Top vendors by spend
    const topVendors = Object.entries(byVendor)
      .map(([vendor, amount]) => ({ vendor, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

    // Cost-saving opportunities (vendors with high spend)
    const opportunities = topVendors.filter(v => v.amount > 10000).map(v => ({
      vendor: v.vendor,
      amount: v.amount,
      potentialSavings: v.amount * 0.1, // Assume 10% negotiation potential
    }))

    return {
      trends: trends.sort((a, b) => b.current - a.current),
      topVendors,
      opportunities,
    }
  }, [expenses])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="bg-card rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-xl font-semibold text-foreground">Cost Trend Analysis</h2>
        <p className="text-sm text-muted-foreground mt-1">Month-over-month cost changes and vendor analysis</p>
      </div>

      <div className="p-6">
        {/* Cost Trends by Type */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Cost Trends by Category</h3>
          <div className="space-y-3">
            {analysis.trends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-background rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground capitalize">{trend.type}</span>
                    {trend.percentChange !== 0 && (
                      <div className={`flex items-center gap-1 ${
                        trend.percentChange > 0 ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {trend.percentChange > 0 ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="text-xs font-medium">
                          {Math.abs(trend.percentChange).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-xs text-muted-foreground">
                      Last month: {formatCurrency(trend.previous)}
                    </span>
                    <span className="text-xs text-muted-foreground">→</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      This month: {formatCurrency(trend.current)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${
                    trend.change > 0 ? 'text-red-600' : trend.change < 0 ? 'text-green-600' : 'text-muted-foreground'
                  }`}>
                    {trend.change > 0 ? '+' : ''}{formatCurrency(trend.change)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Vendors */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Top Vendors by Spend</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Vendor</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Total Spend</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analysis.topVendors.map((vendor, index) => {
                  const totalSpend = analysis.topVendors.reduce((sum, v) => sum + v.amount, 0)
                  const percentage = totalSpend > 0 ? (vendor.amount / totalSpend) * 100 : 0

                  return (
                    <tr key={index} className="hover:bg-background">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">#{index + 1}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{vendor.vendor}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-foreground text-right">
                        {formatCurrency(vendor.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground text-right">
                        {percentage.toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cost-Saving Opportunities */}
        {analysis.opportunities.length > 0 && (
          <Alert variant="success">
            <AlertTitle>Cost-Saving Opportunities</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                {analysis.opportunities.map((opp, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className="text-sm">
                      Negotiate with <strong>{opp.vendor}</strong> (spend: {formatCurrency(opp.amount)})
                    </p>
                    <p className="text-sm font-bold">
                      Save ~{formatCurrency(opp.potentialSavings)}
                    </p>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
