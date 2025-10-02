import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics'

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
export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back!
          </h1>
          <p className="text-gray-600">
            Signed in as {user.email}
          </p>
        </div>

        {/* Comprehensive KPI Dashboard */}
        <DashboardMetrics />

        {/* Gamification - Points & Leaderboard */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Team Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PointsDisplay />
            <Leaderboard period="daily" limit={5} />
          </div>
        </div>
      </div>
    </div>
  )
}
