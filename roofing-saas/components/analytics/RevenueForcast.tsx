'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueForecast } from '@/lib/analytics/analytics-types'
import { TrendingUp, TrendingDown, DollarSign, Target, Calendar, Zap } from 'lucide-react'

interface RevenueForecastProps {
  data: RevenueForecast
  onPeriodClick?: (period: string) => void
  className?: string
}

export function RevenueForcast({ data, onPeriodClick, className }: RevenueForecastProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number, showSign = true) => {
    const sign = showSign && value > 0 ? '+' : ''
    return `${sign}${value.toFixed(1)}%`
  }

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-red-600 bg-red-100'
    }
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return null
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Revenue Forecast
        </CardTitle>
        <CardDescription>
          Predictive revenue projections for 30, 60, and 90-day periods
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(data.totalPipelineValue)}
            </div>
            <div className="text-sm text-muted-foreground">Total Pipeline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {formatPercentage(data.overallWinRate, false)}
            </div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(data.averageDealSize)}
            </div>
            <div className="text-sm text-muted-foreground">Avg Deal Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(data.monthlyRunRate)}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Run Rate</div>
          </div>
        </div>

        {/* Period Forecasts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {data.periods.map((period) => (
            <div
              key={period.period}
              className={`p-4 border border-border rounded-lg transition-all duration-200 ${
                onPeriodClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
              }`}
              onClick={() => onPeriodClick?.(period.period)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-foreground">{period.periodName} Forecast</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(period.confidence)}`}>
                  {period.confidence} confidence
                </span>
              </div>

              <div className="space-y-3">
                {/* Combined Forecast */}
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(period.combinedForecast)}
                  </div>
                  <div className="text-sm text-muted-foreground">Projected Revenue</div>
                </div>

                {/* Forecast Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pipeline Based:</span>
                    <span className="font-medium">{formatCurrency(period.weightedPipelineValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Historical Avg:</span>
                    <span className="font-medium">{formatCurrency(period.historicalForecast)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Closures:</span>
                    <span className="font-medium">{period.expectedClosures.length} deals</span>
                  </div>
                </div>

                {/* Top Expected Closures */}
                {period.expectedClosures.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-muted-foreground mb-2">Top Opportunities:</div>
                    <div className="space-y-1">
                      {period.expectedClosures.slice(0, 3).map((deal) => (
                        <div key={deal.projectId} className="flex items-center justify-between text-xs">
                          <span className="truncate">{deal.projectName}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">{(deal.probability * 100).toFixed(0)}%</span>
                            <span className="font-medium">{formatCurrency(deal.value)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Trends */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-foreground">Pipeline Growth</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPercentage(data.pipelineGrowth)}
              </span>
              {getTrendIcon(data.pipelineGrowth)}
            </div>
            <div className="text-sm text-muted-foreground">vs. previous period</div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-foreground">Deal Size Trend</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPercentage(data.dealSizeTrend)}
              </span>
              {getTrendIcon(data.dealSizeTrend)}
            </div>
            <div className="text-sm text-muted-foreground">average deal value</div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-orange-500" />
              <h4 className="font-medium text-foreground">Velocity Trend</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">
                {formatPercentage(data.velocityTrend)}
              </span>
              {getTrendIcon(data.velocityTrend)}
            </div>
            <div className="text-sm text-muted-foreground">sales cycle speed</div>
          </div>
        </div>

        {/* Forecast Insights */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Forecast Insights</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {data.periods[0] && data.periods[0].confidence === 'high' && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                <span>High confidence in 30-day forecast based on strong pipeline data</span>
              </div>
            )}

            {data.pipelineGrowth > 20 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Pipeline growing rapidly (+{formatPercentage(data.pipelineGrowth, false)}) - scale up resources</span>
              </div>
            )}

            {data.pipelineGrowth < -10 && (
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span>Pipeline declining ({formatPercentage(data.pipelineGrowth, false)}) - focus on lead generation</span>
              </div>
            )}

            {data.dealSizeTrend > 15 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span>Deal sizes increasing (+{formatPercentage(data.dealSizeTrend, false)}) - great qualification</span>
              </div>
            )}

            {data.monthlyRunRate > data.averageDealSize * 5 && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span>Strong monthly run rate indicates consistent closing ability</span>
              </div>
            )}

            {data.periods.every(p => p.confidence === 'low') && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                <span>Low forecast confidence - consider improving pipeline data quality</span>
              </div>
            )}
          </div>
        </div>

        {/* Click hint */}
        {onPeriodClick && (
          <div className="text-xs text-center text-muted-foreground">
            Click on any forecast period to see detailed projections
          </div>
        )}
      </CardContent>
    </Card>
  )
}