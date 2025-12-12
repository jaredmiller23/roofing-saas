'use client'

import { useEffect, useState } from 'react'
import { Trophy, TrendingUp, Target, Crown } from 'lucide-react'

interface WeeklyLeader {
  id: string
  user_name: string
  user_email: string
  points_this_week: number
  deals_closed_this_week: number
  level: number
}

export function WeeklyChallengeWidget() {
  const [leaders, setLeaders] = useState<WeeklyLeader[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeeklyLeaders()
  }, [])

  async function fetchWeeklyLeaders() {
    try {
      // For now, use the existing leaderboard endpoint
      // In the future, create a dedicated weekly challenge endpoint
      const response = await fetch('/api/gamification/leaderboard?limit=3')
      if (response.ok) {
        const result = await response.json()
        const data = result.data || result

        // Transform data for weekly view
        const weeklyData = (data.leaderboard || []).map((entry: { user_id: string; user_name: string; user_email: string; points: number; level: number }) => ({
          id: entry.user_id,
          user_name: entry.user_name,
          user_email: entry.user_email,
          points_this_week: entry.points,
          deals_closed_this_week: Math.floor(entry.points / 100), // Estimate from points
          level: entry.level
        }))

        setLeaders(weeklyData)
      }
    } catch (error) {
      console.error('Failed to fetch weekly leaders:', error)
    } finally {
      setLoading(false)
    }
  }

  const getChallengeTitle = () => {
    const week = Math.ceil(new Date().getDate() / 7)
    const challenges = [
      'Most Deals Closed',
      'Highest Revenue',
      'Top Door Knocker',
      'Lead Generation Master'
    ]
    return challenges[week % challenges.length]
  }

  const getMedalColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 1:
        return 'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800'
      case 2:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 text-white'
      default:
        return 'bg-gray-100 text-muted-foreground'
    }
  }

  const getMedalIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-5 w-5" />
      case 1:
        return <Trophy className="h-5 w-5" />
      case 2:
        return <Target className="h-5 w-5" />
      default:
        return <TrendingUp className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Loading challenge...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg shadow-sm p-6 border border-purple-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">This Week&apos;s Challenge</h3>
          <p className="text-sm text-purple-700 font-medium mt-0.5">{getChallengeTitle()}</p>
        </div>
        <div className="bg-purple-600 text-white rounded-full p-3">
          <Trophy className="h-6 w-6" />
        </div>
      </div>

      {/* Top 3 Leaders */}
      {leaders.length > 0 ? (
        <div className="space-y-2">
          {leaders.map((leader, index) => (
            <div
              key={leader.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                index === 0
                  ? 'bg-white border-yellow-300 shadow-md'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {/* Rank Medal */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getMedalColor(index)} flex items-center justify-center font-bold shadow-sm`}>
                {getMedalIcon(index)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${index === 0 ? 'text-purple-900' : 'text-foreground'}`}>
                  {leader.user_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Level {leader.level}
                </p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className={`text-lg font-bold ${index === 0 ? 'text-purple-700' : 'text-foreground'}`}>
                  {leader.points_this_week.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">points</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No participants yet. Start earning points!
        </div>
      )}

      {/* Challenge Info */}
      <div className="mt-4 pt-4 border-t border-purple-200">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Resets every Monday
          </span>
          <span className="text-purple-700 font-medium">
            {7 - new Date().getDay()} days left
          </span>
        </div>
      </div>
    </div>
  )
}
