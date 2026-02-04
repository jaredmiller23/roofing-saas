'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ConversionFunnel } from '@/components/analytics/ConversionFunnel'
import { VelocityChart } from '@/components/analytics/VelocityChart'
import { WinLossAnalysis } from '@/components/analytics/WinLossAnalysis'
import { RevenueForecast } from '@/components/analytics/RevenueForecast'
import { PipelineInsights } from '@/components/analytics/PipelineInsights'
import {
  PipelineAnalytics,
  DrilldownContext,
  DrilldownData,
  AnalyticsFilters,
} from '@/lib/analytics/analytics-types'
import {
  ArrowLeft,
  Calendar,
  Download,
  RefreshCw,
  BarChart3,
} from 'lucide-react'
import { Link } from '@/lib/i18n/navigation'

export default function PipelineAnalyticsPage() {
  const [analytics, setAnalytics] = useState<PipelineAnalytics | null>(null)
  const [drilldownData, setDrilldownData] = useState<DrilldownData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<AnalyticsFilters>({
    dateRange: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // 90 days ago
      end: new Date(),
      period: 'last_90_days'
    }
  })

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams({
        start: filters.dateRange.start.toISOString(),
        end: filters.dateRange.end.toISOString(),
        period: filters.dateRange.period
      })

      if (filters.stages) {
        params.append('stages', filters.stages.join(','))
      }
      if (filters.leadSources) {
        params.append('leadSources', filters.leadSources.join(','))
      }
      if (filters.assignedTo) {
        params.append('assignedTo', filters.assignedTo.join(','))
      }

      const response = await fetch(`/api/analytics/pipeline?${params}`)
      if (response.ok) {
        const result = await response.json()
        setAnalytics(result.data)
      } else {
        console.error('Failed to fetch analytics:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch drill-down data
  const fetchDrilldownData = async (context: DrilldownContext) => {
    try {
      const params = new URLSearchParams({
        type: context.type,
        value: context.value,
        start: context.filters.dateRange.start.toISOString(),
        end: context.filters.dateRange.end.toISOString(),
      })

      const response = await fetch(`/api/analytics/drilldown?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDrilldownData(data)
      }
    } catch (error) {
      console.error('Error fetching drill-down data:', error)
    }
  }

  // Handle drill-down clicks
  const handleDrilldown = (context: DrilldownContext) => {
    fetchDrilldownData(context)
  }

  // Handle period filter changes
  const handlePeriodChange = (period: '30_day' | '90_day' | '6_month' | '1_year') => {
    const end = new Date()
    const start = new Date()

    switch (period) {
      case '30_day':
        start.setDate(end.getDate() - 30)
        break
      case '90_day':
        start.setDate(end.getDate() - 90)
        break
      case '6_month':
        start.setMonth(end.getMonth() - 6)
        break
      case '1_year':
        start.setFullYear(end.getFullYear() - 1)
        break
    }

    const newFilters = {
      ...filters,
      dateRange: {
        start,
        end,
        period: period === '30_day' ? 'last_30_days' as const :
                period === '90_day' ? 'last_90_days' as const :
                period === '6_month' ? 'last_6_months' as const : 'last_year' as const
      }
    }

    setFilters(newFilters)
  }

  // Export analytics data
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        start: filters.dateRange.start.toISOString(),
        end: filters.dateRange.end.toISOString(),
        format: 'csv'
      })

      const response = await fetch(`/api/analytics/export?${params}`)
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pipeline-analytics-${filters.dateRange.period}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting data:', error)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  if (loading) {
    return (
      <div className="h-[calc(100vh-var(--header-height))] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-var(--header-height))] overflow-hidden">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="px-4 md:px-8 py-4 md:py-6 bg-card border-b">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/projects">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Pipeline
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="h-6 w-6" />
                  Pipeline Analytics
                </h1>
                <p className="text-sm md:text-base text-muted-foreground mt-1">
                  Advanced analytics and insights for your sales pipeline
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Period Selector */}
              <div className="flex bg-muted p-1 rounded-lg">
                {[
                  { id: '30_day', label: '30D' },
                  { id: '90_day', label: '90D' },
                  { id: '6_month', label: '6M' },
                  { id: '1_year', label: '1Y' },
                ].map((period) => (
                  <button
                    key={period.id}
                    onClick={() => handlePeriodChange(period.id as '30_day' | '90_day' | '6_month' | '1_year')}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      filters.dateRange.period ===
                        (period.id === '30_day' ? 'last_30_days' :
                         period.id === '90_day' ? 'last_90_days' :
                         period.id === '6_month' ? 'last_6_months' : 'last_year')
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
          </div>

          {/* Period Info */}
          {analytics && (
            <div className="mt-4 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  {filters.dateRange.start.toLocaleDateString()} - {filters.dateRange.end.toLocaleDateString()}
                </span>
              </div>
              <span>Last updated: {new Date(analytics.lastUpdated).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          {analytics ? (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Top Row - Key Insights */}
              <PipelineInsights data={analytics} />

              {/* Second Row - Funnel and Velocity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ConversionFunnel
                  data={analytics.conversionFunnel}
                  onStageClick={handleDrilldown}
                />
                <VelocityChart
                  data={analytics.velocity}
                  onStageClick={handleDrilldown}
                />
              </div>

              {/* Third Row - Win/Loss and Forecast */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <WinLossAnalysis
                  data={analytics.winLossAnalysis}
                  onReasonClick={(reason) => console.log('Loss reason clicked:', reason)}
                  onSourceClick={(source) => console.log('Source clicked:', source)}
                />
                <RevenueForecast
                  data={analytics.revenueForecast}
                  onPeriodClick={(period) => console.log('Period clicked:', period)}
                />
              </div>

              {/* Drill-down Modal/Panel */}
              {drilldownData && (
                <Card className="mt-6">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">
                        {drilldownData.context.type === 'stage' && `${drilldownData.context.value} Stage Details`}
                        {drilldownData.context.type === 'lead_source' && `${drilldownData.context.value} Source Details`}
                        {drilldownData.context.type === 'team_member' && `Team Member Details`}
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDrilldownData(null)}
                      >
                        Close
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">{drilldownData.summary.totalCount}</div>
                        <div className="text-sm text-muted-foreground">Total Deals</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(drilldownData.summary.totalValue)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Value</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat('en-US', {
                            style: 'currency',
                            currency: 'USD',
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(drilldownData.summary.averageValue)}
                        </div>
                        <div className="text-sm text-muted-foreground">Average Value</div>
                      </div>
                      {drilldownData.summary.winRate !== undefined && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary">
                            {drilldownData.summary.winRate.toFixed(1)}%
                          </div>
                          <div className="text-sm text-muted-foreground">Win Rate</div>
                        </div>
                      )}
                    </div>

                    {/* Project List */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Related Projects</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {drilldownData.projects.slice(0, 10).map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-lg"
                          >
                            <div>
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {project.contact?.first_name} {project.contact?.last_name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium">
                                {project.estimated_value && new Intl.NumberFormat('en-US', {
                                  style: 'currency',
                                  currency: 'USD',
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                }).format(project.estimated_value)}
                              </div>
                              <div className="text-sm text-muted-foreground capitalize">
                                {project.pipeline_stage}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">No analytics data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}