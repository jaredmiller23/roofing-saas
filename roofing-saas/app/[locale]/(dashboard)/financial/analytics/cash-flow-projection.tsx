'use client'

import { useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Project {
  revenue?: number | null
  actual_completion?: string | null
  payments_received?: number | null
}

interface ARAgingData {
  current: number
  days30: number
  days60: number
  days90plus: number
}

interface CashFlowProjectionProps {
  projects: Project[]
  arAging: ARAgingData
  costRate?: number
}

export function CashFlowProjection({ projects, arAging, costRate }: CashFlowProjectionProps) {
  const cashFlow = useMemo(() => {
    // Calculate total AR
    const totalAR = arAging.current + arAging.days30 + arAging.days60 + arAging.days90plus

    // Expected collections based on aging (industry standard collection rates)
    const expectedCollections = {
      month1: arAging.current * 0.8 + arAging.days30 * 0.6,
      month2: arAging.current * 0.15 + arAging.days30 * 0.3 + arAging.days60 * 0.5,
      month3: arAging.current * 0.05 + arAging.days30 * 0.1 + arAging.days60 * 0.3 + arAging.days90plus * 0.3,
    }

    // Calculate average monthly revenue
    const monthlyRevenues: Record<string, number> = {}
    projects.forEach(project => {
      if (!project.actual_completion) return
      const date = new Date(project.actual_completion)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthlyRevenues[monthKey] = (monthlyRevenues[monthKey] || 0) + (project.revenue || 0)
    })

    const monthlyValues = Object.values(monthlyRevenues)
    const avgMonthlyRevenue = monthlyValues.length > 0
      ? monthlyValues.reduce((sum, val) => sum + val, 0) / monthlyValues.length
      : 0

    // Generate 3-month cash flow projection
    const projections = []
    const today = new Date()

    for (let i = 0; i < 3; i++) {
      const month = new Date(today.getFullYear(), today.getMonth() + i + 1, 1)
      const monthName = month.toLocaleDateString('en-US', { month: 'short' })

      const expectedIn = i === 0 ? expectedCollections.month1 :
                         i === 1 ? expectedCollections.month2 :
                         expectedCollections.month3

      // Apply configurable cost rate (default 70% industry average)
      const expectedOut = avgMonthlyRevenue * (costRate ?? 0.7)

      const netCashFlow = expectedIn - expectedOut

      projections.push({
        month: monthName,
        cashIn: expectedIn,
        cashOut: expectedOut,
        netCashFlow,
      })
    }

    // Identify shortfall risks
    const hasShortfall = projections.some(p => p.netCashFlow < 0)

    return {
      totalAR,
      expectedCollections,
      projections,
      hasShortfall,
    }
  }, [projects, arAging, costRate])

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
      <div className="px-6 py-4 border-b border">
        <h2 className="text-xl font-semibold text-foreground">Cash Flow Projection</h2>
        <p className="text-sm text-muted-foreground mt-1">Expected collections and payment schedule</p>
      </div>

      <div className="p-6">
        {/* AR Aging Breakdown */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Accounts Receivable Aging</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs font-medium text-green-700 mb-1">Current</p>
              <p className="text-lg font-bold text-green-900">{formatCurrency(arAging.current)}</p>
              <p className="text-xs text-green-600 mt-1">0-30 days</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-xs font-medium text-yellow-700 mb-1">30-60 Days</p>
              <p className="text-lg font-bold text-yellow-900">{formatCurrency(arAging.days30)}</p>
              <p className="text-xs text-yellow-600 mt-1">Medium risk</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-3">
              <p className="text-xs font-medium text-orange-700 mb-1">60-90 Days</p>
              <p className="text-lg font-bold text-orange-900">{formatCurrency(arAging.days60)}</p>
              <p className="text-xs text-orange-600 mt-1">High risk</p>
            </div>

            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs font-medium text-red-700 mb-1">90+ Days</p>
              <p className="text-lg font-bold text-red-900">{formatCurrency(arAging.days90plus)}</p>
              <p className="text-xs text-red-600 mt-1">Collection needed</p>
            </div>
          </div>
        </div>

        {/* Cash Flow Projection Table */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">3-Month Cash Flow Forecast</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Month</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Expected In</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Expected Out</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Net Cash Flow</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cashFlow.projections.map((projection, index) => (
                  <tr key={index} className="hover:bg-background">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{projection.month}</td>
                    <td className="px-4 py-3 text-sm text-green-600 text-right font-medium">
                      +{formatCurrency(projection.cashIn)}
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600 text-right font-medium">
                      -{formatCurrency(projection.cashOut)}
                    </td>
                    <td className={`px-4 py-3 text-sm text-right font-bold ${
                      projection.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {projection.netCashFlow >= 0 ? '+' : ''}{formatCurrency(projection.netCashFlow)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {projection.netCashFlow >= 0 ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                          Positive
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full flex items-center justify-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Shortfall
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Warning Alert */}
        {cashFlow.hasShortfall && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Cash Flow Warning</p>
                <p className="text-sm text-red-700 mt-1">
                  Projected cash shortfall detected. Consider accelerating collections or delaying non-essential expenses.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Methodology Note */}
        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-xs text-primary">
            <strong>Collection Rates:</strong> Current AR: 80% month 1, 15% month 2, 5% month 3 |
            30-60 days: 60% month 1, 30% month 2, 10% month 3 |
            60-90 days: 50% month 2, 30% month 3 |
            90+ days: 30% month 3
          </p>
        </div>
      </div>
    </div>
  )
}
