import { PointsDisplay } from '@/components/gamification/PointsDisplay'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import { Achievements } from '@/components/gamification/Achievements'
import { Trophy } from 'lucide-react'

export default function GamificationPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-gray-900">Team Performance</h1>
        </div>
        <p className="text-gray-600">
          Track your progress, compete with your team, and unlock achievements
        </p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Points Display */}
        <div className="lg:col-span-1">
          <PointsDisplay />
        </div>

        {/* Middle Column - Leaderboard */}
        <div className="lg:col-span-1">
          <Leaderboard period="weekly" limit={10} />
        </div>

        {/* Right Column - Quick Stats */}
        <div className="lg:col-span-1">
          <QuickStats />
        </div>
      </div>

      {/* Achievements Section */}
      <div className="mt-8">
        <Achievements />
      </div>
    </div>
  )
}

// Quick Stats Component
function QuickStats() {
  const stats = [
    { label: 'Doors Knocked Today', value: '45', change: '+12%' },
    { label: 'Leads Generated', value: '8', change: '+3' },
    { label: 'Appointments Set', value: '5', change: '+2' },
    { label: 'Team Rank', value: '#3', change: '↑1' },
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Today&apos;s Stats</h3>

      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div key={index} className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
            {stat.change && (
              <span className={`text-sm font-medium ${
                stat.change.startsWith('+') || stat.change.startsWith('↑')
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                {stat.change}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Motivational Message */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
        <p className="text-sm font-medium text-blue-900">
          Great work today! You&apos;re 15 points away from your next achievement! 🎯
        </p>
      </div>
    </div>
  )
}