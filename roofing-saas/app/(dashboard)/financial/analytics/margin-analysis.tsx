'use client'

import { useMemo } from 'react'

interface Project {
  project_name?: string
  status?: string
  revenue?: number
  total_actual_cost?: number
  gross_profit?: number
  profit_margin_percent?: number
}

interface MarginAnalysisProps {
  projects: Project[]
}

export function MarginAnalysis({ projects }: MarginAnalysisProps) {
  const analysis = useMemo(() => {
    // Margin by job type
    const byType: Record<string, { revenue: number; profit: number; count: number }> = {}

    projects.forEach(project => {
      // Categorize by project name keywords
      const name = project.project_name?.toLowerCase() || ''
      let type = 'Other'

      if (name.includes('residential') || name.includes('house') || name.includes('home')) {
        type = 'Residential'
      } else if (name.includes('commercial') || name.includes('building') || name.includes('office')) {
        type = 'Commercial'
      } else if (name.includes('repair') || name.includes('fix') || name.includes('emergency')) {
        type = 'Repair'
      }

      if (!byType[type]) {
        byType[type] = { revenue: 0, profit: 0, count: 0 }
      }

      byType[type].revenue += project.revenue || 0
      byType[type].profit += project.gross_profit || 0
      byType[type].count += 1
    })

    const marginByType = Object.entries(byType).map(([type, data]) => ({
      type,
      revenue: data.revenue,
      profit: data.profit,
      margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
      count: data.count,
      avgProfit: data.count > 0 ? data.profit / data.count : 0,
    })).sort((a, b) => b.margin - a.margin)

    // Best and worst performers
    const withMargins = projects
      .filter(p => p.profit_margin_percent !== undefined && p.revenue && p.revenue > 0)
      .sort((a, b) => (b.profit_margin_percent || 0) - (a.profit_margin_percent || 0))

    const bestPerformers = withMargins.slice(0, 3)
    const worstPerformers = withMargins.slice(-3).reverse()

    // Overall margin stats
    const totalRevenue = projects.reduce((sum, p) => sum + (p.revenue || 0), 0)
    const totalProfit = projects.reduce((sum, p) => sum + (p.gross_profit || 0), 0)
    const overallMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

    return {
      marginByType,
      bestPerformers,
      worstPerformers,
      overallMargin,
      totalRevenue,
      totalProfit,
    }
  }, [projects])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600'
    if (margin >= 20) return 'text-blue-600'
    if (margin >= 10) return 'text-yellow-600'
    if (margin >= 0) return 'text-orange-600'
    return 'text-red-600'
  }

  const getMarginBgColor = (margin: number) => {
    if (margin >= 30) return 'bg-green-100'
    if (margin >= 20) return 'bg-blue-100'
    if (margin >= 10) return 'bg-yellow-100'
    if (margin >= 0) return 'bg-orange-100'
    return 'bg-red-100'
  }

  return (
    <div className="bg-white rounded-lg shadow mb-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-foreground">Margin Analysis</h2>
        <p className="text-sm text-gray-500 mt-1">Profitability breakdown by job type and performance</p>
      </div>

      <div className="p-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Overall Margin</p>
            <p className={`text-3xl font-bold ${getMarginColor(analysis.overallMargin)}`}>
              {analysis.overallMargin.toFixed(1)}%
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(analysis.totalRevenue)}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Profit</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(analysis.totalProfit)}
            </p>
          </div>
        </div>

        {/* Margin by Job Type */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Margin by Job Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analysis.marginByType.map((item, index) => (
              <div key={index} className={`rounded-lg p-4 ${getMarginBgColor(item.margin)}`}>
                <p className="text-sm font-medium text-gray-700 mb-2">{item.type}</p>
                <p className={`text-2xl font-bold ${getMarginColor(item.margin)} mb-1`}>
                  {item.margin.toFixed(1)}%
                </p>
                <div className="text-xs text-gray-600 space-y-0.5">
                  <p>{item.count} projects</p>
                  <p>Revenue: {formatCurrency(item.revenue)}</p>
                  <p>Avg profit: {formatCurrency(item.avgProfit)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best & Worst Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Best Performers */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Margin Projects</h3>
            <div className="space-y-2">
              {analysis.bestPerformers.map((project, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {project.project_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Revenue: {formatCurrency(project.revenue || 0)}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <p className="text-lg font-bold text-green-600">
                      {(project.profit_margin_percent || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Worst Performers */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Lowest Margin Projects</h3>
            <div className="space-y-2">
              {analysis.worstPerformers.map((project, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {project.project_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Revenue: {formatCurrency(project.revenue || 0)}
                    </p>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <p className="text-lg font-bold text-red-600">
                      {(project.profit_margin_percent || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">Key Insights</p>
          <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
            {analysis.marginByType.length > 0 && (
              <li>
                <strong>{analysis.marginByType[0].type}</strong> jobs have the highest margin at{' '}
                {analysis.marginByType[0].margin.toFixed(1)}%
              </li>
            )}
            {analysis.overallMargin >= 25 && (
              <li>Overall margin is healthy at {analysis.overallMargin.toFixed(1)}% (above 25% target)</li>
            )}
            {analysis.overallMargin < 15 && (
              <li className="text-red-700">Overall margin is below target. Review pricing and cost controls.</li>
            )}
            {analysis.worstPerformers.length > 0 && analysis.worstPerformers[0].profit_margin_percent! < 5 && (
              <li className="text-red-700">Some projects have critically low margins. Investigate cost overruns.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
