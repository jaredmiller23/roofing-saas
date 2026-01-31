'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Scale,
  FileText,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { StatCard } from './shared/StatCard'
import { TopItemsTable, TopArgumentsTable } from './shared/TopItemsTable'
import type { IntelligenceDashboard } from '@/lib/claims/intelligence-types'
import { apiFetch } from '@/lib/api/client'

/**
 * OutcomeAnalytics - Outcomes tab for Claims Intelligence
 *
 * Displays:
 * - Outcome distribution stats (paid full, partial, denied, appealed)
 * - Top disputed items with win rates
 * - Top denial reasons with appeal success rates
 * - Most effective arguments
 */
export function OutcomeAnalytics() {
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await apiFetch<IntelligenceDashboard>('/api/intelligence/dashboard')
      setDashboard(data)
    } catch (err) {
      console.error('Error fetching dashboard:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  if (error) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border border-border">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchDashboard}
          className="text-primary hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  // Calculate outcome distribution from available data
  const totalClaims = dashboard?.total_claims || 0
  const approvalRate = dashboard?.overall_approval_rate || 0
  const appealSuccess = dashboard?.appeal_success_rate || 0

  // Estimate counts based on rates
  const approvedCount = Math.round((totalClaims * approvalRate) / 100)
  const deniedCount = totalClaims - approvedCount
  const avgDays = dashboard?.avg_days_to_resolution || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Claim Outcomes</h2>
        <p className="text-muted-foreground">
          Track outcomes and learn what works
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </>
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Paid/Approved
                    </p>
                    <p className="text-3xl font-bold text-green-500">
                      {approvedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {approvalRate.toFixed(0)}% of claims
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Denied
                    </p>
                    <p className="text-3xl font-bold text-red-500">
                      {deniedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(100 - approvalRate).toFixed(0)}% of claims
                    </p>
                  </div>
                  <div className="p-3 rounded-full bg-red-500/10">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <StatCard
              label="Appeal Success"
              value={`${appealSuccess.toFixed(0)}%`}
              icon={Scale}
              color={
                appealSuccess >= 70
                  ? 'success'
                  : appealSuccess >= 50
                  ? 'warning'
                  : 'default'
              }
              subtitle="of appeals won"
            />

            <StatCard
              label="Avg Resolution"
              value={avgDays.toFixed(0)}
              icon={Clock}
              color="default"
              subtitle="days"
            />
          </>
        )}
      </div>

      {/* Outcome Breakdown Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - What's Disputed */}
        <div className="space-y-6">
          <TopItemsTable
            title="Most Disputed Items"
            items={dashboard?.top_disputed_items || []}
            loading={loading}
            emptyMessage="No disputed items recorded"
            renderItem={(item) => ({
              name: item.item,
              count: item.count,
              rate: item.win_rate,
              rateLabel: 'win rate',
            })}
          />

          <TopItemsTable
            title="Common Denial Reasons"
            items={dashboard?.top_denial_reasons || []}
            loading={loading}
            emptyMessage="No denial reasons recorded"
            renderItem={(item) => ({
              name: formatDenialReason(item.reason),
              count: item.count,
              rate: item.appeal_success_rate,
              rateLabel: 'appeal success',
            })}
          />
        </div>

        {/* Right Column - What Works */}
        <div className="space-y-6">
          <TopArgumentsTable
            title="Most Effective Arguments"
            items={dashboard?.most_effective_arguments || []}
            loading={loading}
          />

          {/* Quick Tips Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : totalClaims === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Record claim outcomes to generate insights
                </p>
              ) : (
                <>
                  {approvalRate >= 70 && (
                    <InsightItem
                      icon={<CheckCircle2 className="h-4 w-4 text-green-500" />}
                      text="Strong approval rate! Keep documenting what works."
                    />
                  )}
                  {approvalRate < 50 && (
                    <InsightItem
                      icon={<AlertCircle className="h-4 w-4 text-yellow-500" />}
                      text="Low approval rate. Focus on the effective arguments above."
                    />
                  )}
                  {appealSuccess >= 70 && (
                    <InsightItem
                      icon={<Scale className="h-4 w-4 text-green-500" />}
                      text="Great appeal success! Your counter-arguments are effective."
                    />
                  )}
                  {dashboard?.top_disputed_items.length === 0 && (
                    <InsightItem
                      icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                      text="Record disputed items when outcomes are logged to track patterns."
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Empty State */}
      {!loading && totalClaims === 0 && (
        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Outcomes Recorded</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            When claims are resolved, record the outcomes to build your
            intelligence database and track what arguments work best.
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Format denial reason for display
 */
function formatDenialReason(reason: string): string {
  return reason
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Insight item component
 */
function InsightItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-2">
      {icon}
      <p className="text-sm text-foreground">{text}</p>
    </div>
  )
}
