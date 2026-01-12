'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, TrendingUp, Clock, Scale } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard } from './shared/StatCard'
import { TopItemsTable, TopArgumentsTable } from './shared/TopItemsTable'
import type { IntelligenceDashboard } from '@/lib/claims/intelligence-types'

/**
 * IntelligenceSummary - Overview tab for Claims Intelligence
 *
 * Displays:
 * - 4 summary metric cards (claims, approval rate, avg days, appeal success)
 * - Top disputed items with win rates
 * - Top denial reasons with appeal success rates
 * - Most effective arguments with success counts
 */
export function IntelligenceSummary() {
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/intelligence/dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch intelligence data')
      }

      const data = await response.json()
      setDashboard(data)
    } catch (err) {
      console.error('Error fetching intelligence dashboard:', err)
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

  return (
    <div className="space-y-6">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              label="Total Claims"
              value={dashboard?.total_claims || 0}
              icon={FileText}
              color={dashboard && dashboard.total_claims > 0 ? 'success' : 'default'}
            />
            <StatCard
              label="Approval Rate"
              value={`${(dashboard?.overall_approval_rate || 0).toFixed(0)}%`}
              icon={TrendingUp}
              color={
                dashboard && dashboard.overall_approval_rate >= 70
                  ? 'success'
                  : dashboard && dashboard.overall_approval_rate >= 50
                  ? 'warning'
                  : 'danger'
              }
            />
            <StatCard
              label="Avg Days to Resolution"
              value={(dashboard?.avg_days_to_resolution || 0).toFixed(0)}
              icon={Clock}
              subtitle="days"
              color="default"
            />
            <StatCard
              label="Appeal Success"
              value={`${(dashboard?.appeal_success_rate || 0).toFixed(0)}%`}
              icon={Scale}
              color={
                dashboard && dashboard.appeal_success_rate >= 70
                  ? 'success'
                  : dashboard && dashboard.appeal_success_rate >= 50
                  ? 'warning'
                  : 'default'
              }
            />
          </>
        )}
      </div>

      {/* Three Column Grid - Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TopItemsTable
          title="Top Disputed Items"
          items={dashboard?.top_disputed_items || []}
          loading={loading}
          emptyMessage="No disputed items recorded yet"
          renderItem={(item) => ({
            name: item.item,
            count: item.count,
            rate: item.win_rate,
            rateLabel: 'win rate',
          })}
        />

        <TopItemsTable
          title="Top Denial Reasons"
          items={dashboard?.top_denial_reasons || []}
          loading={loading}
          emptyMessage="No denial reasons recorded yet"
          renderItem={(item) => ({
            name: formatDenialReason(item.reason),
            count: item.count,
            rate: item.appeal_success_rate,
            rateLabel: 'appeal success',
          })}
        />

        <TopArgumentsTable
          title="Most Effective Arguments"
          items={dashboard?.most_effective_arguments || []}
          loading={loading}
        />
      </div>

      {/* Empty State for New Users */}
      {!loading && dashboard && dashboard.total_claims === 0 && (
        <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Start Building Intelligence</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            As you record claim outcomes and track adjuster patterns,
            your intelligence dashboard will populate with insights
            to help you win more claims.
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
  // Convert snake_case to Title Case
  return reason
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
