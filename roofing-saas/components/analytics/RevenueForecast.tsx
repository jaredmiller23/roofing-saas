'use client'

/**
 * Revenue Forecast Component
 *
 * Displays revenue forecasts based on pipeline data
 * with period-based projections and trends
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RevenueForecast as ForecastData } from '@/lib/analytics/analytics-types'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface RevenueForecastProps {
  data: ForecastData
  onPeriodClick?: (period: string) => void
  loading?: boolean
  className?: string
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{
    dataKey: string
    value: number
    name: string
  }>
  label?: string
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="font-semibold text-foreground">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex justify-between gap-4">
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium">${entry.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function RevenueForecast({ data, onPeriodClick, loading, className }: RevenueForecastProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getConfidenceColor = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return 'bg-green-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getConfidenceIcon = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'medium': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'low': return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <div className="h-4 w-4" />
  }

  // Prepare forecast periods chart data
  const forecastData = data.periods.map(period => ({
    period: period.periodName,
    pipeline: period.pipelineForecast,
    historical: period.historicalForecast,
    combined: period.combinedForecast,
    confidence: period.confidence
  }))

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Revenue Forecast
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-muted/20 rounded-lg flex items-center justify-center">
            <div className="text-muted-foreground">Loading forecast data...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Revenue Forecast
        </CardTitle>
        <CardDescription>
          Pipeline-based revenue projections and growth trends
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(data.totalPipelineValue)}
            </div>
            <div className="text-sm text-muted-foreground">Total Pipeline</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {data.overallWinRate.toFixed(1)}%
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
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(data.monthlyRunRate)}
            </div>
            <div className="text-sm text-muted-foreground">Monthly Run Rate</div>
          </div>
        </div>

        {/* Forecast Periods */}
        {data.periods.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.periods.map((period) => (
              <Card
                key={period.period}
                className={`relative ${onPeriodClick ? 'cursor-pointer hover:shadow-md' : ''}`}
                onClick={() => onPeriodClick?.(period.period)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{period.periodName}</CardTitle>
                    <div className="flex items-center gap-1">
                      {getConfidenceIcon(period.confidence)}
                      <Badge variant={period.confidence === 'high' ? 'default' : 'secondary'}>
                        {period.confidence}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Combined Forecast</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(period.combinedForecast)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(100, (period.combinedForecast / data.monthlyRunRate) * 100)}
                      className="h-2"
                    />
                  </div>

                  <div className="text-xs space-y-1 text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Pipeline:</span>
                      <span>{formatCurrency(period.pipelineForecast)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Historical:</span>
                      <span>{formatCurrency(period.historicalForecast)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Contributing Deals:</span>
                      <span>{period.expectedClosures.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Forecast Visualization */}
        {forecastData.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium text-foreground">Forecast Comparison</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pipeline" fill="#3b82f6" name="Pipeline Forecast" />
                  <Bar dataKey="historical" fill="#8b5cf6" name="Historical Forecast" />
                  <Bar dataKey="combined" fill="#10b981" name="Combined Forecast" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Growth Trends */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Pipeline Growth</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(data.pipelineGrowth)}
              <span className={`text-lg font-bold ${
                data.pipelineGrowth > 0 ? 'text-green-600' :
                data.pipelineGrowth < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {formatPercentage(data.pipelineGrowth)}
              </span>
            </div>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Target className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Deal Size Trend</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(data.dealSizeTrend)}
              <span className={`text-lg font-bold ${
                data.dealSizeTrend > 0 ? 'text-green-600' :
                data.dealSizeTrend < 0 ? 'text-red-600' : 'text-muted-foreground'
              }`}>
                {formatPercentage(data.dealSizeTrend)}
              </span>
            </div>
          </div>

          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Velocity Trend</span>
            </div>
            <div className="flex items-center justify-center gap-2">
              {getTrendIcon(data.velocityTrend)}
              <span className={`text-lg font-bold ${
                data.velocityTrend > 0 ? 'text-red-600' : // Positive velocity trend means slower (bad)
                data.velocityTrend < 0 ? 'text-green-600' : 'text-muted-foreground' // Negative means faster (good)
              }`}>
                {formatPercentage(Math.abs(data.velocityTrend))}
              </span>
            </div>
          </div>
        </div>

        {/* Forecast Insights */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Forecast Insights</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {data.periods.some(p => p.confidence === 'high') && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>High confidence forecasts available based on strong pipeline data</span>
              </div>
            )}

            {data.pipelineGrowth > 20 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Strong pipeline growth of {formatPercentage(data.pipelineGrowth)} indicates healthy lead generation</span>
              </div>
            )}

            {data.dealSizeTrend > 10 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span>Average deal size increasing by {formatPercentage(data.dealSizeTrend)} - moving upmarket</span>
              </div>
            )}

            {data.velocityTrend < -10 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span>Sales velocity improving - deals closing {formatPercentage(Math.abs(data.velocityTrend))} faster</span>
              </div>
            )}

            {data.overallWinRate < 25 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>Low win rate of {data.overallWinRate.toFixed(1)}% may impact forecast accuracy</span>
              </div>
            )}

            {data.periods.length === 0 && (
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>Insufficient data for detailed period forecasting</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}