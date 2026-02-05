'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '@/lib/api/client'
import dynamic from 'next/dynamic'
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics'
import { DashboardScopeFilter, type DashboardScope } from '@/components/dashboard/DashboardScopeFilter'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { WeeklyChallengeWidget } from '@/components/dashboard/WeeklyChallengeWidget'
import { WeatherWidget } from '@/components/dashboard/WeatherWidget'
import { TodaysWork } from '@/components/dashboard/TodaysWork'
import { Button } from '@/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useUIMode } from '@/hooks/useUIMode'
import { RefreshCw, ChevronDown } from 'lucide-react'

// Only lazy load the heavy Leaderboard component (has charts/complex UI)
const Leaderboard = dynamic(() => import('@/components/gamification/Leaderboard').then(mod => ({ default: mod.Leaderboard })), {
  loading: () => (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6 h-[400px] animate-pulse">
      <div className="h-6 bg-muted rounded w-1/3 mb-4" />
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 bg-muted rounded-full" />
            <div className="flex-1 h-4 bg-muted rounded" />
            <div className="w-16 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  ),
  ssr: false
})

import type { TieredMetrics } from '@/lib/dashboard/metrics-types'

/**
 * Consolidated dashboard data shape from /api/dashboard/consolidated
 */
interface ConsolidatedDashboardData {
  metrics: TieredMetrics
  activity: {
    activities: Array<{
      id: string
      type: string
      title: string
      description: string
      timestamp: string
      metadata?: {
        user?: string
        value?: number
        contact_name?: string
      }
    }>
    count: number
  }
  challenge: {
    id: string
    title: string
    description: string
    target: number
    current: number
    unit: string
    timeRemaining: string
    participants: number
    reward: string
    status: 'active' | 'completed' | 'upcoming'
  }
  knockLeaderboard: {
    period: string
    type: string
    leaderboard: Array<{
      rank: number
      user_id: string
      name: string
      avatar_url: string | null
      role: string | null
      points: number
      level: number
      isCurrentUser: boolean
    }>
    currentUserRank: number | null
  }
  salesLeaderboard: {
    period: string
    type: string
    leaderboard: Array<{
      rank: number
      user_id: string
      name: string
      avatar_url: string | null
      role: string | null
      points: number
      level: number
      isCurrentUser: boolean
    }>
    currentUserRank: number | null
  }
  points: {
    user_id: string
    total_points: number
    current_level: number
    daily_points: number
    weekly_points: number
    monthly_points: number
  }
  meta: {
    latencyMs: number
    tier: string
    scope: string
  }
}

/**
 * Dashboard page - main landing page after authentication
 *
 * Uses a consolidated API endpoint to fetch all dashboard data in a single request,
 * reducing load time from 5-10 seconds to <2 seconds by eliminating 6 separate
 * serverless cold starts.
 *
 * Renders different layouts based on UI mode:
 * - Field mode: Simplified view with TodaysWork, personal stats, collapsed leaderboard
 * - Manager/Full mode: Full dashboard with all widgets and scope filtering
 */
export default function DashboardPage() {
  const { isFieldMode } = useUIMode()
  const [scope, setScope] = useState<DashboardScope>('company')
  const [data, setData] = useState<ConsolidatedDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [leaderboardOpen, setLeaderboardOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch dashboard data with proper cleanup on unmount/re-render
  useEffect(() => {
    const abortController = new AbortController()
    let didTimeout = false
    const timeoutId = setTimeout(() => {
      didTimeout = true
      abortController.abort()
    }, 30000)

    const fetchData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await apiFetch<ConsolidatedDashboardData>(
          `/api/dashboard/consolidated?scope=${scope}&mode=full`,
          { signal: abortController.signal }
        )
        clearTimeout(timeoutId)
        setData(result)
      } catch (err) {
        clearTimeout(timeoutId)
        // Cleanup abort (component unmount/scope change) — don't update state
        if (abortController.signal.aborted && !didTimeout) {
          return
        }
        console.error('Failed to fetch dashboard data:', err)

        if (didTimeout) {
          setError('Request timeout - please try again')
        } else {
          setError('Failed to load dashboard data')
        }
      } finally {
        // Only skip state update on cleanup abort, NOT timeout
        if (!abortController.signal.aborted || didTimeout) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    // Cleanup: abort fetch if component unmounts or scope changes
    return () => {
      clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [scope, refreshKey])

  // Manual refresh function for retry button
  const refreshDashboard = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Full page error state
  if (error && !data) {
    return (
      <div className="px-4 sm:px-6 py-4 pt-16 lg:px-8 lg:py-8 lg:pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="text-muted-foreground mb-4 text-center">
              <p className="text-lg font-medium mb-2">Unable to load dashboard</p>
              <p className="text-sm">{error}</p>
            </div>
            <Button onClick={refreshDashboard} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Field worker view - simplified, mobile-optimized
  if (isFieldMode) {
    return (
      <div className="px-4 sm:px-6 py-4 pt-16 lg:px-8 lg:py-8 lg:pt-8">
        <div className="max-w-lg mx-auto space-y-4">
          {/* Priority: Weather safety check */}
          <WeatherWidget />

          {/* Priority: What to do now */}
          {/* TODO: Integrate todaysJobs from API when available */}
          <TodaysWork
            isLoading={isLoading}
          />

          {/* Personal stats - simplified */}
          <DashboardMetrics
            scope="personal"
            data={data?.metrics}
            isLoading={isLoading}
          />

          {/* Points display */}
          <PointsDisplay
            data={data?.points}
            isLoading={isLoading}
          />

          {/* Leaderboard - collapsed by default to reduce cognitive load */}
          <Collapsible open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center justify-between p-4 bg-card rounded-lg border hover:bg-accent transition-colors">
                <span className="font-medium">Team Leaderboard</span>
                <ChevronDown className={`h-5 w-5 transition-transform ${leaderboardOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <Leaderboard
                period="weekly"
                limit={5}
                type="knocks"
                title="This Week"
                metricLabel="knocks"
                data={data?.knockLeaderboard}
                isLoading={isLoading}
              />
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    )
  }

  // Manager/Owner view - full dashboard
  return (
    <div className="px-4 sm:px-6 py-4 pt-16 lg:px-8 lg:py-8 lg:pt-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Scope Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Welcome back!
            </h1>
          </div>
          <DashboardScopeFilter
            currentScope={scope}
            onScopeChange={setScope}
          />
        </div>

        {/* Comprehensive KPI Dashboard */}
        <DashboardMetrics
          scope={scope}
          data={data?.metrics}
          isLoading={isLoading}
        />

        {/* Weather - Full Width */}
        <div className="w-full">
          <WeatherWidget />
        </div>

        {/* Gamification Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WeeklyChallengeWidget
            data={data?.challenge}
            isLoading={isLoading}
          />
          <PointsDisplay
            data={data?.points}
            isLoading={isLoading}
          />
          <ActivityFeed
            data={data?.activity}
            isLoading={isLoading}
          />
        </div>

        {/* Leaderboards */}
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Team Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Leaderboard
              period="weekly"
              limit={10}
              type="knocks"
              title="Knock Leaderboard"
              metricLabel="knocks"
              data={data?.knockLeaderboard}
              isLoading={isLoading}
            />
            <Leaderboard
              period="weekly"
              limit={10}
              type="sales"
              title="Sales Leaderboard"
              metricLabel="deals"
              data={data?.salesLeaderboard}
              isLoading={isLoading}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
