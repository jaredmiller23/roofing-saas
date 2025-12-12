'use client'

interface TypeData {
  revenue: number
  cost: number
  profit: number
  count: number
}

interface MarginByTypeChartProps {
  typeData: Record<string, TypeData>
}

export function MarginByTypeChart({ typeData }: MarginByTypeChartProps) {
  const chartData = Object.entries(typeData).map(([type, data]) => ({
    type,
    margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0,
    profit: data.profit,
    revenue: data.revenue,
  }))

  const maxMargin = Math.max(...chartData.map(d => d.margin), 50) // At least 50% scale

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

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'bg-green-500'
    if (margin >= 20) return 'bg-blue-500'
    if (margin >= 10) return 'bg-yellow-500'
    if (margin >= 0) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Profit Margin by Job Type</h3>

      <div className="space-y-4">
        {chartData.map((data, index) => (
          <div key={index}>
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-sm font-medium text-muted-foreground">{data.type}</span>
                <span className="text-xs text-muted-foreground ml-2">
                  {formatCurrency(data.profit)} profit
                </span>
              </div>
              <span className="text-sm font-semibold text-foreground">
                {data.margin.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-300 ${getMarginColor(data.margin)}`}
                style={{ width: `${(data.margin / maxMargin) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {chartData.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No project data available</p>
        </div>
      )}

      {/* Legend */}
      {chartData.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-muted-foreground mb-2">Margin Indicators:</p>
          <div className="flex flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-muted-foreground">Excellent (≥30%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded" />
              <span className="text-muted-foreground">Good (20-29%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-yellow-500 rounded" />
              <span className="text-muted-foreground">Fair (10-19%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-orange-500 rounded" />
              <span className="text-muted-foreground">Low (0-9%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-muted-foreground">Negative (&lt;0%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
