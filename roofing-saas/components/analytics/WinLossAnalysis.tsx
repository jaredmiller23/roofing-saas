'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { WinLossAnalysis as WinLossData, DrilldownContext } from '@/lib/analytics/analytics-types'
import { CheckCircle, XCircle, TrendingUp, DollarSign, Clock, Target } from 'lucide-react'

interface WinLossAnalysisProps {
  data: WinLossData
  onReasonClick?: (reason: string) => void
  onSourceClick?: (source: string) => void
  className?: string
}

export function WinLossAnalysis({ data, onReasonClick, onSourceClick, className }: WinLossAnalysisProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Win/Loss Analysis
        </CardTitle>
        <CardDescription>
          Deal outcomes, reasons, and performance by lead source
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Win/Loss Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{data.totalDeals}</div>
            <div className="text-sm text-muted-foreground">Total Deals</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{data.wonDeals}</div>
            <div className="text-sm text-muted-foreground">Won</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{data.lostDeals}</div>
            <div className="text-sm text-muted-foreground">Lost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{formatPercentage(data.winRate)}</div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
        </div>

        {/* Win Rate Visualization */}
        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Win Rate</span>
            <span className="text-sm text-muted-foreground">{formatPercentage(data.winRate)}</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-1000"
              style={{ width: `${data.winRate}%` }}
            />
          </div>
        </div>

        {/* Revenue Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h4 className="font-medium text-green-800">Won Deals</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Total Revenue</span>
                <span className="font-bold text-green-800">{formatCurrency(data.totalWonRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Average Deal Size</span>
                <span className="font-medium text-green-800">{formatCurrency(data.averageWonValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-green-700">Average Close Time</span>
                <span className="font-medium text-green-800">{Math.round(data.averageWonTime)} days</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <h4 className="font-medium text-red-800">Lost Deals</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-red-700">Lost Revenue</span>
                <span className="font-bold text-red-800">{formatCurrency(data.totalLostRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">Average Lost Value</span>
                <span className="font-medium text-red-800">{formatCurrency(data.averageLostValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-red-700">Average Lost Time</span>
                <span className="font-medium text-red-800">{Math.round(data.averageLostTime)} days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Loss Reasons */}
        {data.lossReasons.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3">Top Loss Reasons</h4>
            <div className="space-y-2">
              {data.lossReasons.slice(0, 5).map((reason) => (
                <div
                  key={reason.reason}
                  className={`p-3 bg-red-50 border border-red-200 rounded-lg ${
                    onReasonClick ? 'cursor-pointer hover:bg-red-100' : ''
                  }`}
                  onClick={() => onReasonClick?.(reason.reason)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-red-800">{reason.reason}</span>
                    <span className="text-sm text-red-600">{reason.count} deals</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-red-200 rounded-full w-24">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${reason.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-red-600">{formatPercentage(reason.percentage)}</span>
                    </div>
                    <span className="text-sm text-red-700">
                      Avg: {formatCurrency(reason.averageValue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lead Source Performance */}
        {data.leadSourcePerformance.length > 0 && (
          <div>
            <h4 className="font-medium text-foreground mb-3">Lead Source Performance</h4>
            <div className="space-y-2">
              {data.leadSourcePerformance
                .sort((a, b) => b.winRate - a.winRate)
                .slice(0, 5)
                .map((source) => (
                  <div
                    key={source.source}
                    className={`p-3 bg-background border rounded-lg ${
                      onSourceClick ? 'cursor-pointer hover:bg-muted' : ''
                    }`}
                    onClick={() => onSourceClick?.(source.source)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">{source.source}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {source.wonDeals}/{source.totalDeals} deals
                        </span>
                        <span className={`font-bold ${
                          source.winRate >= 50 ? 'text-green-600' :
                          source.winRate >= 25 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {formatPercentage(source.winRate)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-muted rounded-full w-32">
                          <div
                            className={`h-full rounded-full ${
                              source.winRate >= 50 ? 'bg-green-500' :
                              source.winRate >= 25 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${source.winRate}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatCurrency(source.totalRevenue)} revenue
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <h4 className="font-medium text-foreground mb-2">Key Insights</h4>
          <div className="space-y-2 text-sm text-muted-foreground">
            {data.winRate >= 60 && (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span>Excellent win rate of {formatPercentage(data.winRate)} - well above industry average</span>
              </div>
            )}

            {data.winRate < 20 && (
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>Low win rate of {formatPercentage(data.winRate)} - consider reviewing qualification process</span>
              </div>
            )}

            {data.averageWonValue > data.averageLostValue * 1.5 && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span>Won deals are significantly larger than lost deals - good qualification</span>
              </div>
            )}

            {data.averageWonTime < data.averageLostTime && (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-green-500" />
                <span>Won deals close faster than lost deals - efficient sales process</span>
              </div>
            )}

            {data.lossReasons.length > 0 && data.lossReasons[0].percentage > 30 && (
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                <span>Top loss reason ({data.lossReasons[0].reason}) accounts for {formatPercentage(data.lossReasons[0].percentage)} of losses</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}