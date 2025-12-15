'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConversionFunnel as FunnelData, DrilldownContext } from '@/lib/analytics/analytics-types'
import { TrendingDown, TrendingUp, Users, DollarSign, Clock } from 'lucide-react'

interface ConversionFunnelProps {
  data: FunnelData
  onStageClick?: (context: DrilldownContext) => void
  className?: string
}

export function ConversionFunnel({ data, onStageClick, className }: ConversionFunnelProps) {
  // Calculate the maximum count for scaling
  const maxCount = useMemo(() => {
    return Math.max(...data.stages.map(stage => stage.count))
  }, [data.stages])

  // Format currency for display
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Get stage color
  const getStageColor = (stageName: string) => {
    const colors = {
      'Prospect': 'bg-gray-500',
      'Qualified': 'bg-blue-500',
      'Quote Sent': 'bg-purple-500',
      'Negotiation': 'bg-orange-500',
      'Won': 'bg-green-500',
      'Production': 'bg-cyan-500',
      'Complete': 'bg-emerald-600',
    }
    return colors[stageName as keyof typeof colors] || 'bg-gray-400'
  }

  const handleStageClick = (stage: any) => {
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

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Conversion Funnel
        </CardTitle>
        <CardDescription>
          Pipeline progression and conversion rates by stage
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.totalProspects}</div>
            <div className="text-sm text-muted-foreground">Total Prospects</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.totalWon}</div>
            <div className="text-sm text-muted-foreground">Won Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{formatPercentage(data.overallConversionRate)}</div>
            <div className="text-sm text-muted-foreground">Conversion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(data.averageLeadToWin)}d</div>
            <div className="text-sm text-muted-foreground">Avg. Lead-to-Win</div>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="space-y-2">
          {data.stages.map((stage, index) => {
            const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0
            const isClickable = onStageClick && stage.count > 0

            return (
              <div key={stage.stage} className="relative">
                {/* Stage Bar */}
                <div
                  className={`relative overflow-hidden rounded-lg border transition-all duration-200 ${
                    isClickable ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''
                  }`}
                  onClick={() => isClickable && handleStageClick(stage)}
                >
                  {/* Background */}
                  <div className="bg-muted h-16 w-full relative">
                    {/* Filled portion */}
                    <div
                      className={`h-full transition-all duration-1000 ${getStageColor(stage.stageName)} opacity-80`}
                      style={{ width: `${widthPercentage}%` }}
                    />

                    {/* Content overlay */}
                    <div className="absolute inset-0 flex items-center justify-between px-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStageColor(stage.stageName)}`} />
                        <span className="font-medium text-foreground">{stage.stageName}</span>
                      </div>

                      <div className="flex items-center gap-6 text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{stage.count}</span>
                        </div>

                        {stage.value > 0 && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>{formatCurrency(stage.value)}</span>
                          </div>
                        )}

                        {stage.averageDaysInStage > 0 && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{Math.round(stage.averageDaysInStage)}d</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conversion Metrics */}
                {index > 0 && stage.conversionRate > 0 && (
                  <div className="flex items-center justify-center mt-1 mb-1">
                    <div className="flex items-center gap-2 px-3 py-1 bg-background border rounded-full text-xs">
                      {stage.conversionRate >= 50 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span className="text-muted-foreground">
                        {formatPercentage(stage.conversionRate)} conversion
                      </span>
                      {stage.dropOffRate > 0 && (
                        <span className="text-red-500">
                          ({formatPercentage(stage.dropOffRate)} drop-off)
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Key Insights */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Key Insights</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {data.overallConversionRate > 20 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Strong overall conversion rate of {formatPercentage(data.overallConversionRate)}</span>
              </div>
            )}

            {data.stages.map(stage => {
              if (stage.dropOffRate > 50 && stage.count > 5) {
                return (
                  <div key={`insight-${stage.stage}`} className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span>High drop-off at {stage.stageName} stage ({formatPercentage(stage.dropOffRate)})</span>
                  </div>
                )
              }
              return null
            })}

            {data.averageLeadToWin > 90 && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" />
                <span>Long sales cycle ({Math.round(data.averageLeadToWin)} days average)</span>
              </div>
            )}

            {data.averageLeadToWin <= 30 && data.totalWon > 0 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Fast sales cycle ({Math.round(data.averageLeadToWin)} days average)</span>
              </div>
            )}
          </div>
        </div>

        {/* Click hint */}
        {onStageClick && (
          <div className="text-xs text-center text-muted-foreground">
            Click on any stage to see detailed deal information
          </div>
        )}
      </CardContent>
    </Card>
  )
}