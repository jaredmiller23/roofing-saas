'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import Image from 'next/image'
import { Crown, Medal, Award, Trophy, Star, TrendingUp, Zap, Target } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  avatar_url?: string | null
  role?: string | null
  points: number
  level: number
  isCurrentUser: boolean
}

interface Badge {
  icon: React.ReactNode
  label: string
  color: string
}

interface LeaderboardData {
  period: string
  type: string
  leaderboard: LeaderboardEntry[]
  currentUserRank: number | null
}

interface LeaderboardProps {
  period?: 'all' | 'daily' | 'weekly' | 'monthly'
  limit?: number
  type?: 'points' | 'knocks' | 'sales'
  title?: string
  metricLabel?: string
  /** Optional pre-fetched data from consolidated API */
  data?: LeaderboardData | null
  /** Optional loading state from parent */
  isLoading?: boolean
}

export function Leaderboard({
  period = 'weekly',
  limit = 10,
  type = 'points',
  title = 'Leaderboard',
  metricLabel = 'points',
  data: externalData,
  isLoading: externalLoading
}: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [internalLoading, setInternalLoading] = useState(!externalData)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  // Use external data if provided
  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading

  // Apply external data when provided
  useEffect(() => {
    if (externalData) {
      setLeaderboard(externalData.leaderboard || [])
      setCurrentUserRank(externalData.currentUserRank)
    }
  }, [externalData])

  useEffect(() => {
    // Only fetch if no external data and period changes
    if (externalData === undefined) {
      fetchLeaderboard()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPeriod, type, externalData])

  const fetchLeaderboard = async () => {
    // Skip fetch if external data is provided
    if (externalData !== undefined) return

    setInternalLoading(true)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiFetch<any>(
        `/api/gamification/leaderboard?period=${selectedPeriod}&limit=${limit}&type=${type}`
      )
      setLeaderboard(data.leaderboard)
      setCurrentUserRank(data.currentUserRank)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setInternalLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-muted-foreground" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-semibold text-muted-foreground">#{rank}</span>
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getBadges = (entry: LeaderboardEntry): Badge[] => {
    const badges: Badge[] = []

    // Top performer badges
    if (entry.rank === 1) {
      badges.push({
        icon: <Star className="h-3 w-3" />,
        label: 'Top Performer',
        color: 'bg-yellow-500/10 text-yellow-500'
      })
    }

    // High achiever (level 5+)
    if (entry.level >= 5) {
      badges.push({
        icon: <Zap className="h-3 w-3" />,
        label: 'High Achiever',
        color: 'bg-primary/10 text-primary'
      })
    }

    // Rising star (top 5, level 3 or less)
    if (entry.rank <= 5 && entry.level <= 3) {
      badges.push({
        icon: <TrendingUp className="h-3 w-3" />,
        label: 'Rising Star',
        color: 'bg-green-500/10 text-green-500'
      })
    }

    // Consistent closer (1000+ points)
    if (entry.points >= 1000) {
      badges.push({
        icon: <Target className="h-3 w-3" />,
        label: 'Consistent Closer',
        color: 'bg-primary/10 text-primary'
      })
    }

    return badges
  }

  // Handle period change - refetch if using internal data
  const handlePeriodChange = (newPeriod: typeof selectedPeriod) => {
    setSelectedPeriod(newPeriod)
    // If we have external data, we need to fetch for a different period
    if (externalData !== undefined) {
      // Clear external data indicator to trigger fetch
      setInternalLoading(true)
      fetch(
        `/api/gamification/leaderboard?period=${newPeriod}&limit=${limit}&type=${type}`
      )
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setLeaderboard(result.data.leaderboard)
            setCurrentUserRank(result.data.currentUserRank)
          }
        })
        .catch(err => console.error('Error fetching leaderboard:', err))
        .finally(() => setInternalLoading(false))
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      {/* Header with Period Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-3">{title}</h3>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 min-h-11 text-sm rounded-md transition-colors ${
                selectedPeriod === p
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Current User Rank */}
      {currentUserRank && (
        <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <p className="text-sm text-primary">
            Your rank: <span className="font-bold">#{currentUserRank}</span>
          </p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
              <div className="w-8 h-8 bg-muted rounded-full" />
              <div className="flex-1 h-4 bg-muted rounded" />
              <div className="w-16 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard List */}
      {!isLoading && leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                entry.isCurrentUser
                  ? 'bg-primary/10 border border-primary/30'
                  : 'hover:bg-accent'
              }`}
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              {entry.avatar_url ? (
                <Image
                  src={entry.avatar_url}
                  alt={entry.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(entry.name)}
                </div>
              )}

              {/* Name and Level */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className={`font-medium ${
                    entry.isCurrentUser ? 'text-blue-900' : 'text-foreground'
                  }`}>
                    {entry.name}
                    {entry.isCurrentUser && ' (You)'}
                  </p>
                  {/* Achievement Badges */}
                  {getBadges(entry).slice(0, 2).map((badge, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}
                      title={badge.label}
                    >
                      {badge.icon}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Level {entry.level} • {entry.role || 'Team Member'}
                </p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {entry.points.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{metricLabel}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && leaderboard.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No leaderboard data available</p>
        </div>
      )}
    </div>
  )
}
