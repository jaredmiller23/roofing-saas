'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PipelineVelocity, DrilldownContext } from '@/lib/analytics/analytics-types'
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Zap,
  Target,
} from 'lucide-react'

interface VelocityChartProps {
  data: PipelineVelocity
  onStageClick?: (context: DrilldownContext) => void
  className?: string
}

export function VelocityChart({ data, onStageClick, className }: VelocityChartProps) {
  // Calculate max days for scaling
  const maxDays = useMemo(() => {
    return Math.max(...data.stages.map(stage => stage.averageDays))
  }, [data.stages])

  // Get trend icon and color
  const getTrendIcon = (trend: 'faster' | 'slower' | 'stable', _percentage: number) => {
    if (trend === 'faster') {
      return <TrendingUp className="h-4 w-4 text-green-500" />
    } else if (trend === 'slower') {
      return <TrendingDown className="h-4 w-4 text-red-500" />
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  // Get stage color based on velocity
  const getStageColor = (averageDays: number) => {
    if (averageDays <= 7) return 'bg-green-500'
    if (averageDays <= 14) return 'bg-blue-500'
    if (averageDays <= 21) return 'bg-yellow-500'
    if (averageDays <= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }

  // Get velocity status
  const getVelocityStatus = (averageDays: number) => {
    if (averageDays <= 7) return { label: 'Fast', color: 'text-green-600', icon: Zap }
    if (averageDays <= 14) return { label: 'Good', color: 'text-blue-600', icon: Target }
    if (averageDays <= 30) return { label: 'Moderate', color: 'text-yellow-600', icon: Clock }
    return { label: 'Slow', color: 'text-red-600', icon: AlertTriangle }
  }

  const handleStageClick = (stage: { stage: string; averageDays: number }) => {
    if (onStageClick) {
      onStageClick({
        type: 'stage',
        value: stage.stage,
        filters: {
          dateRange: {
            start: new Date(),
            end: new Date(),
            period: 'last_90_days'
          }
        }
      })
    }
  }

  const formatDays = (days: number) => {
    if (days < 1) return '<1d'
    if (days === 1) return '1 day'
    if (days < 7) return `${Math.round(days)} days`
    if (days < 30) return `${Math.round(days / 7)} weeks`
    return `${Math.round(days / 30)} months`
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Pipeline Velocity
        </CardTitle>
        <CardDescription>
          Average time spent in each stage and velocity trends
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Velocity Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {formatDays(data.overallVelocity)}
            </div>
            <div className="text-sm text-muted-foreground">Overall Velocity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {data.fastestDeals.length}
            </div>
            <div className="text-sm text-muted-foreground">Fast Closers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {data.slowestDeals.length}
            </div>
            <div className="text-sm text-muted-foreground">Slow Movers</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data.bottlenecks.length}
            </div>
            <div className="text-sm text-muted-foreground">Bottlenecks</div>
          </div>
        </div>

        {/* Stage Velocity Chart */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Stage Velocity Breakdown</h4>

          {data.stages.map((stage) => {
            const widthPercentage = maxDays > 0 ? (stage.averageDays / maxDays) * 100 : 0
            const velocityStatus = getVelocityStatus(stage.averageDays)
            const isClickable = onStageClick && stage.currentDeals > 0
            const VelocityIcon = velocityStatus.icon

            return (
              <div key={stage.stage} className="relative">
                <div
                  className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
                    isClickable ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
                  }`}
                  onClick={() => isClickable && handleStageClick(stage)}
                >
                  {/* Background */}
                  <div className="bg-muted h-14 w-full relative">
                    {/* Velocity bar */}
                    <div
                      className={`h-full transition-all duration-1000 ${getStageColor(stage.averageDays)} opacity-80`}
                      style={{ width: `${widthPercentage}%` }}
                    />

                    {/* Content overlay */}
                    <div className="absolute inset-0 flex items-center justify-between px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStageColor(stage.averageDays)}`} />
                        <span className="font-medium text-foreground">{stage.stageName}</span>
                        <div className="flex items-center gap-1">
                          <VelocityIcon className={`h-4 w-4 ${velocityStatus.color}`} />
                          <span className={`text-xs ${velocityStatus.color}`}>
                            {velocityStatus.label}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        {/* Average Days */}
                        <div className="text-center">
                          <div className="font-bold text-foreground">
                            {formatDays(stage.averageDays)}
                          </div>
                          <div className="text-xs text-muted-foreground">Average</div>
                        </div>

                        {/* Median Days */}
                        <div className="text-center">
                          <div className="font-medium text-muted-foreground">
                            {formatDays(stage.medianDays)}
                          </div>
                          <div className="text-xs text-muted-foreground">Median</div>
                        </div>

                        {/* Current Deals */}
                        <div className="text-center">
                          <div className="font-medium text-primary">
                            {stage.currentDeals}
                          </div>
                          <div className="text-xs text-muted-foreground">Current</div>
                        </div>

                        {/* Trend */}
                        <div className="flex items-center gap-1">
                          {getTrendIcon(stage.trend, stage.trendPercentage)}
                          {stage.trendPercentage !== 0 && (
                            <span className={`text-xs ${
                              stage.trend === 'faster' ? 'text-green-500' :
                              stage.trend === 'slower' ? 'text-red-500' : 'text-muted-foreground'
                            }`}>
                              {Math.abs(stage.trendPercentage).toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottlenecks Alert */}
        {data.bottlenecks.length > 0 && (
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h4 className="font-medium text-orange-800">Identified Bottlenecks</h4>
            </div>
            <div className="text-sm text-orange-700">
              The following stages are taking longer than average and may need attention:
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {data.bottlenecks.map((bottleneck) => {
                const stageData = data.stages.find(s => s.stage === bottleneck)
                return (
                  <div
                    key={bottleneck}
                    className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                  >
                    {stageData?.stageName} ({formatDays(stageData?.averageDays || 0)})
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Fast Closers */}
        {data.fastestDeals.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-800">Fastest Closing Deals</h4>
            </div>
            <div className="text-sm text-green-700 mb-3">
              These deals closed quickly and represent best practices:
            </div>
            <div className="space-y-2">
              {data.fastestDeals.slice(0, 3).map((deal) => (
                <div
                  key={deal.id}
                  className="flex items-center justify-between p-2 bg-green-100 rounded text-sm"
                >
                  <span className="font-medium text-green-800">{deal.name}</span>
                  <div className="flex items-center gap-2 text-green-600">
                    {deal.contact && (
                      <span>{deal.contact.first_name} {deal.contact.last_name}</span>
                    )}
                    <span className="font-medium">{deal.pipeline_stage}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Velocity Optimization Tips</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {data.overallVelocity > 60 && (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span>Consider streamlining your sales process - average cycle is {formatDays(data.overallVelocity)}</span>
              </div>
            )}

            {data.bottlenecks.includes('prospect' as never) && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span>Focus on lead qualification to reduce time in prospect stage</span>
              </div>
            )}

            {data.bottlenecks.includes('negotiation' as never) && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Review pricing strategy and proposal process to speed up negotiations</span>
              </div>
            )}

            {data.overallVelocity <= 30 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Great velocity! Consider documenting your process for consistency</span>
              </div>
            )}
          </div>
        </div>

        {/* Click hint */}
        {onStageClick && (
          <div className="text-xs text-center text-muted-foreground">
            Click on any stage to see deals currently in that stage
          </div>
        )}
      </CardContent>
    </Card>
  )
}