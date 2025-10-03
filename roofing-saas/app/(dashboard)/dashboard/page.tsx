'use client'

import { useState } from 'react'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { WeeklyChallengeWidget } from '@/components/dashboard/WeeklyChallengeWidget'
import { DashboardScopeFilter, type DashboardScope } from '@/components/dashboard/DashboardScopeFilter'

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
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Performance</h2>
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
