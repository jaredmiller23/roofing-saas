'use client'

import { useEffect, useState } from 'react'
import { Crown, Medal, Award, Trophy } from 'lucide-react'

interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  avatar_url?: string
  role?: string
  points: number
  level: number
  isCurrentUser: boolean
}

interface LeaderboardProps {
  period?: 'all' | 'daily' | 'weekly' | 'monthly'
  limit?: number
}

export function Leaderboard({ period = 'weekly', limit = 10 }: LeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  useEffect(() => {
    fetchLeaderboard()
  }, [selectedPeriod])

  const fetchLeaderboard = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/gamification/leaderboard?period=${selectedPeriod}&limit=${limit}`
      )
      const result = await response.json()

      if (result.success) {
        setLeaderboard(result.data.leaderboard)
        setCurrentUserRank(result.data.currentUserRank)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return <span className="text-sm font-semibold text-gray-600">#{rank}</span>
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

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      {/* Header with Period Selector */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Leaderboard</h3>
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPeriod(p)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                selectedPeriod === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Current User Rank */}
      {currentUserRank && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            Your rank: <span className="font-bold">#{currentUserRank}</span>
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-200 rounded-full" />
              <div className="flex-1 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && leaderboard.length > 0 && (
        <div className="space-y-2">
          {leaderboard.map((entry) => (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                entry.isCurrentUser
                  ? 'bg-blue-50 border border-blue-200'
                  : 'hover:bg-gray-50'
              }`}
            >
              {/* Rank */}
              <div className="w-8 flex items-center justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              {entry.avatar_url ? (
                <img
                  src={entry.avatar_url}
                  alt={entry.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(entry.name)}
                </div>
              )}

              {/* Name and Level */}
              <div className="flex-1">
                <p className={`font-medium ${
                  entry.isCurrentUser ? 'text-blue-900' : 'text-gray-900'
                }`}>
                  {entry.name}
                  {entry.isCurrentUser && ' (You)'}
                </p>
                <p className="text-xs text-gray-500">
                  Level {entry.level} • {entry.role || 'Team Member'}
                </p>
              </div>

              {/* Points */}
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {entry.points.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">points</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && leaderboard.length === 0 && (
        <div className="text-center py-8">
          <Trophy className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">No leaderboard data available</p>
        </div>
      )}
    </div>
  )
}