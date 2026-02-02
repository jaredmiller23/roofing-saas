'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PipelineAnalytics } from '@/lib/analytics/analytics-types'
import { BarChart3, TrendingUp, Users, DollarSign, Clock, Target, AlertTriangle } from 'lucide-react'

interface PipelineInsightsProps {
  data: PipelineAnalytics
  className?: string
}

export function PipelineInsights({ data, className }: PipelineInsightsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`

  // Calculate key insights
  const insights = [
    {
      title: "Pipeline Health",
      value: data.conversionFunnel.overallConversionRate > 20 ? "Strong" : "Needs Attention",
      icon: Target,
      color: data.conversionFunnel.overallConversionRate > 20 ? "text-green-600" : "text-orange-600",
      detail: `${formatPercentage(data.conversionFunnel.overallConversionRate)} conversion rate`
    },
    {
      title: "Revenue Pipeline",
      value: formatCurrency(data.revenueForecast.totalPipelineValue),
      icon: DollarSign,
      color: "text-primary",
      detail: `${data.conversionFunnel.totalProspects} active opportunities`
    },
    {
      title: "Sales Velocity",
      value: `${Math.round(data.velocity.overallVelocity)}d`,
      icon: Clock,
      color: data.velocity.overallVelocity < 60 ? "text-green-600" : "text-orange-600",
      detail: "average deal cycle"
    },
    {
      title: "Win Rate",
      value: formatPercentage(data.winLossAnalysis.winRate),
      icon: TrendingUp,
      color: data.winLossAnalysis.winRate > 50 ? "text-green-600" : "text-red-600",
      detail: `${data.winLossAnalysis.wonDeals} won / ${data.winLossAnalysis.totalDeals} total`
    }
  ]

  const topPerformer = data.teamPerformance.reduce((top, member) =>
    member.winRate > top.winRate ? member : top, data.teamPerformance[0] || { userName: 'N/A', winRate: 0, totalRevenue: 0 }
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Pipeline Insights
        </CardTitle>
        <CardDescription>
          Key performance metrics and actionable insights
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {insights.map((insight, index) => {
            const Icon = insight.icon
            return (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`h-5 w-5 ${insight.color}`} />
                  <span className="text-sm font-medium text-muted-foreground">{insight.title}</span>
                </div>
                <div className={`text-2xl font-bold ${insight.color}`}>
                  {insight.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {insight.detail}
                </div>
              </div>
            )
          })}
        </div>

        {/* Performance Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-500" />
              <h4 className="font-medium text-green-500">Top Performer</h4>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-green-500">{topPerformer.userName}</div>
              <div className="text-sm text-green-500/80">
                {formatPercentage(topPerformer.winRate)} win rate • {formatCurrency(topPerformer.totalRevenue)} revenue
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary/10 border border-primary rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h4 className="font-medium text-primary">Forecast Trend</h4>
            </div>
            <div className="space-y-1">
              <div className="font-bold text-primary">
                {data.revenueForecast.pipelineGrowth > 0 ? '+' : ''}{formatPercentage(data.revenueForecast.pipelineGrowth)}
              </div>
              <div className="text-sm text-primary">Pipeline growth vs. previous period</div>
            </div>
          </div>
        </div>

        {/* Actionable Insights */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Actionable Insights</h4>

          <div className="space-y-2">
            {data.conversionFunnel.overallConversionRate < 15 && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-500">Low Conversion Rate</div>
                  <div className="text-sm text-red-500/80">
                    Only {formatPercentage(data.conversionFunnel.overallConversionRate)} of prospects convert.
                    Consider improving qualification criteria and sales process.
                  </div>
                </div>
              </div>
            )}

            {data.velocity.bottlenecks.length > 0 && (
              <div className="flex items-start gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                <Clock className="h-5 w-5 text-orange-500 mt-0.5" />
                <div>
                  <div className="font-medium text-orange-500">Stage Bottlenecks Identified</div>
                  <div className="text-sm text-orange-500/80">
                    Deals are getting stuck in: {data.velocity.bottlenecks.join(', ')}.
                    Review these stages for process improvements.
                  </div>
                </div>
              </div>
            )}

            {data.winLossAnalysis.lossReasons.length > 0 && data.winLossAnalysis.lossReasons[0].percentage > 25 && (
              <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <Target className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <div className="font-medium text-yellow-500">Primary Loss Reason</div>
                  <div className="text-sm text-yellow-500/80">
                    &quot;{data.winLossAnalysis.lossReasons[0].reason}&quot; accounts for {formatPercentage(data.winLossAnalysis.lossReasons[0].percentage)} of losses.
                    Focus on addressing this specific issue.
                  </div>
                </div>
              </div>
            )}

            {data.revenueForecast.pipelineGrowth > 30 && (
              <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <div className="font-medium text-green-500">Strong Growth Trend</div>
                  <div className="text-sm text-green-500/80">
                    Pipeline growing {formatPercentage(data.revenueForecast.pipelineGrowth)}!
                    Consider scaling your sales team to handle increased volume.
                  </div>
                </div>
              </div>
            )}

            {data.dataQuality.missingValues > data.conversionFunnel.totalProspects * 0.3 && (
              <div className="flex items-start gap-3 p-3 bg-muted border border-border rounded-lg">
                <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="font-medium text-foreground">Data Quality Issue</div>
                  <div className="text-sm text-foreground">
                    {data.dataQuality.missingValues} deals missing value data.
                    Improve data entry to get more accurate forecasts.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Data Quality Score */}
        <div className="p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-foreground">Data Quality</h4>
            <div className="flex items-center gap-2">
              <div className="text-sm text-muted-foreground">
                {data.dataQuality.missingValues} missing values • {data.dataQuality.incompleteProjects} incomplete
              </div>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(data.lastUpdated).toLocaleString()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}