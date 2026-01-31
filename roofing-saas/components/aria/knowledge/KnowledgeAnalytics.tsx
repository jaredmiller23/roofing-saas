'use client'

import { useState, useEffect } from 'react'
import { Loader2, Search, TrendingUp, ThumbsUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { apiFetch } from '@/lib/api/client'

interface AnalyticsData {
  period: { days: number; since: string }
  summary: {
    totalSearches: number
    avgRelevance: number
    helpfulnessRate: number | null
    ratedSearches: number
  }
  topQueries: Array<{
    query: string
    count: number
    avgResults: number
    avgRelevance: number
    lastUsed: string
  }>
}

interface KnowledgeAnalyticsProps {
  tenantId: string
}

export function KnowledgeAnalytics({ tenantId: _tenantId }: KnowledgeAnalyticsProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true)
      try {
        const data = await apiFetch<AnalyticsData>(`/api/knowledge/analytics?days=${days}`)
        setData(data)
      } catch (err) {
        console.error('Failed to fetch analytics:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [days])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="py-12 text-center text-muted-foreground text-sm">
        Failed to load analytics data.
      </div>
    )
  }

  const { summary, topQueries } = data

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Period:</span>
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              days === d
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total Searches</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{summary.totalSearches}</p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Avg Relevance</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {summary.avgRelevance > 0
              ? `${(summary.avgRelevance * 100).toFixed(1)}%`
              : '-'
            }
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Helpfulness Rate</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {summary.helpfulnessRate !== null
              ? `${(summary.helpfulnessRate * 100).toFixed(0)}%`
              : '-'
            }
          </p>
          {summary.ratedSearches > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {summary.ratedSearches} rated
            </p>
          )}
        </div>
      </div>

      {/* Top Queries */}
      <div>
        <h3 className="text-sm font-medium text-foreground mb-3">Top Queries</h3>
        {topQueries.length === 0 ? (
          <div className="bg-card rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
            No search queries in this period.
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Query</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Count</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Avg Results</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Avg Relevance</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Last Used</th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((q, i) => (
                  <tr key={i} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="p-3">
                      <span className="text-sm text-foreground truncate block max-w-[250px]">
                        {q.query}
                      </span>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {q.count}x
                      </Badge>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <span className="text-sm text-muted-foreground">{q.avgResults}</span>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {q.avgRelevance > 0 ? `${(q.avgRelevance * 100).toFixed(1)}%` : '-'}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(q.lastUsed).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
