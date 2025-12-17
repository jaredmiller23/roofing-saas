'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchWeeklyLeaders()
  }, [])

  async function fetchWeeklyLeaders() {
    setLoading(true)
    setError(null)

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000) // 30s timeout

    try {
      // For now, use the existing leaderboard endpoint
      // In the future, create a dedicated weekly challenge endpoint
      const response = await fetch('/api/gamification/leaderboard?limit=3', {
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const data = result.data || result

      // Transform data for weekly view
      // API returns: { rank, user_id, name, avatar_url, role, points, level, isCurrentUser }
      const weeklyData = (data.leaderboard || []).map((entry: { user_id: string; name: string; points: number; level: number }) => ({
        id: entry.user_id,
        user_name: entry.name || 'Unknown',
        user_email: '', // Not provided by API
        points_this_week: entry.points,
        deals_closed_this_week: Math.floor(entry.points / 100), // Estimate from points
        level: entry.level
      }))

      setLeaders(weeklyData)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch weekly leaders:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error:')) {
        // Server returned an error - leaderboard may not be set up yet
        setError('Leaderboard unavailable')
      } else {
        setError('Unable to load leaderboard')
      }
      // Set empty leaders array to show "No participants yet" message instead of error
      // This provides a better UX when the feature isn't fully configured
      setLeaders([])
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
        return 'bg-gradient-to-r from-yellow-500 to-yellow-600 dark:from-yellow-400 dark:to-yellow-500 text-white dark:text-yellow-900'
      case 1:
        return 'bg-gradient-to-r from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 text-slate-800 dark:text-slate-100'
      case 2:
        return 'bg-gradient-to-r from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500 text-white dark:text-orange-900'
      default:
        return 'bg-muted text-muted-foreground'
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
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-6 bg-muted rounded w-40 mb-2" />
            <div className="h-4 bg-muted rounded w-28" />
          </div>
          <div className="h-12 w-12 bg-muted rounded-full" />
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-24 mb-1" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
              <div className="text-right">
                <div className="h-5 bg-muted rounded w-12 mb-1" />
                <div className="h-3 bg-muted rounded w-8" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-foreground">This Week&apos;s Challenge</h3>
            <p className="text-sm text-secondary font-medium mt-0.5">{getChallengeTitle()}</p>
          </div>
          <div className="bg-primary text-primary-foreground rounded-full p-3">
            <Trophy className="h-6 w-6" />
          </div>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-muted-foreground mb-4">{error}</div>
            <Button
              onClick={() => fetchWeeklyLeaders()}
              variant="outline"
              size="sm"
            >
              Try again
            </Button>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Resets every Monday
            </span>
            <span className="text-secondary font-medium">
              {7 - new Date().getDay()} days left
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">This Week&apos;s Challenge</h3>
          <p className="text-sm text-secondary font-medium mt-0.5">{getChallengeTitle()}</p>
        </div>
        <div className="bg-primary text-primary-foreground rounded-full p-3">
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
                  ? 'bg-card border-primary/50 shadow-md'
                  : 'bg-card border hover:border-border'
              }`}
            >
              {/* Rank Medal */}
              <div className={`flex-shrink-0 w-10 h-10 rounded-full ${getMedalColor(index)} flex items-center justify-center font-bold shadow-sm`}>
                {getMedalIcon(index)}
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${index === 0 ? 'text-primary' : 'text-foreground'}`}>
                  {leader.user_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Level {leader.level}
                </p>
              </div>

              {/* Stats */}
              <div className="text-right">
                <p className={`text-lg font-bold ${index === 0 ? 'text-primary' : 'text-foreground'}`}>
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
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Resets every Monday
          </span>
          <span className="text-secondary font-medium">
            {7 - new Date().getDay()} days left
          </span>
        </div>
      </div>
    </div>
  )
}
