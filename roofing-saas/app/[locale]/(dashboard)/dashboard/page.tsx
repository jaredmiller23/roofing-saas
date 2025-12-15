'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics'
import { DashboardScopeFilter, type DashboardScope } from '@/components/dashboard/DashboardScopeFilter'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { WeeklyChallengeWidget } from '@/components/dashboard/WeeklyChallengeWidget'

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

/**
 * Dashboard page - main landing page after authentication
 *
 * Features comprehensive KPI metrics and visualizations:
 * - Revenue tracking and trends
 * - Pipeline overview
 * - Activity metrics (door knocking, calls, emails)
 * - Sales performance (conversion rate, avg deal size, sales cycle)
 * - Team gamification (points & leaderboard)
 */
export default function DashboardPage() {
  const [scope, setScope] = useState<DashboardScope>('company')

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header with Scope Filter */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Welcome back!
            </h1>
          </div>
          <DashboardScopeFilter
            currentScope={scope}
            onScopeChange={setScope}
          />
        </div>

        {/* Comprehensive KPI Dashboard */}
        <DashboardMetrics scope={scope} />

        {/* Weekly Challenge */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <WeeklyChallengeWidget />
          <PointsDisplay />
          <ActivityFeed />
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
            />
            <Leaderboard
              period="weekly"
              limit={10}
              type="sales"
              title="Sales Leaderboard"
              metricLabel="deals"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
