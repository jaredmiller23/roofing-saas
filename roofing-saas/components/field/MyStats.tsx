'use client'

/**
 * MyStats Component
 *
 * Shows personal performance stats, achievements, and leaderboard position.
 * Designed for field workers to quickly see their progress and earnings.
 */

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { useUIMode } from '@/hooks/useUIMode'
import {
  Trophy,
  TrendingUp,
  DollarSign,
  Award,
  ExternalLink,
  RefreshCw,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatsData {
  // Current period stats
  daily: {
    knocks: number
    appointments: number
    sales: number
    target_knocks: number
    target_appointments: number
    target_sales: number
  }
  weekly: {
    knocks: number
    appointments: number
    sales: number
    target_knocks: number
    target_appointments: number
    target_sales: number
  }
  monthly: {
    knocks: number
    appointments: number
    sales: number
    commission_earned: number
    target_knocks: number
    target_appointments: number
    target_sales: number
    target_commission: number
  }
  // Leaderboard position
  position: {
    knocks_rank: number
    sales_rank: number
    overall_rank: number
    total_team_members: number
  }
  // Recent achievements
  achievements: {
    id: string
    title: string
    description: string
    earned_at: string
    icon: string
  }[]
  // Performance trends
  trends: {
    knocks_change: number // percentage change from last week
    sales_change: number
    position_change: number // positive means moved up
  }
}

interface MyStatsProps {
  className?: string
}

export function MyStats({ className }: MyStatsProps) {
  const { isFieldMode } = useUIMode()
  const [stats, setStats] = useState<StatsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Mock stats data
      const mockStats: StatsData = {
        daily: {
          knocks: 18,
          appointments: 3,
          sales: 1,
          target_knocks: 25,
          target_appointments: 4,
          target_sales: 2
        },
        weekly: {
          knocks: 127,
          appointments: 18,
          sales: 5,
          target_knocks: 150,
          target_appointments: 20,
          target_sales: 6
        },
        monthly: {
          knocks: 485,
          appointments: 72,
          sales: 22,
          commission_earned: 18500,
          target_knocks: 600,
          target_appointments: 80,
          target_sales: 25,
          target_commission: 25000
        },
        position: {
          knocks_rank: 3,
          sales_rank: 2,
          overall_rank: 2,
          total_team_members: 12
        },
        achievements: [
          {
            id: '1',
            title: 'Top Performer',
            description: 'Ranked #1 this week',
            earned_at: '2024-01-15T10:00:00Z',
            icon: '🏆'
          },
          {
            id: '2',
            title: 'Goal Crusher',
            description: 'Hit weekly target',
            earned_at: '2024-01-14T16:00:00Z',
            icon: '🎯'
          },
          {
            id: '3',
            title: 'Streak Master',
            description: '5 days in a row',
            earned_at: '2024-01-13T12:00:00Z',
            icon: '⚡'
          }
        ],
        trends: {
          knocks_change: 12.5,
          sales_change: 25,
          position_change: 1
        }
      }

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 600))

      setStats(mockStats)
    } catch (err) {
      console.error('Error fetching stats:', err)
      setError('Failed to load stats')
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentStats = () => {
    if (!stats) return null
    return stats[period]
  }

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100)
  }


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getTrendIcon = (change: number) => {
    if (change > 0) {
      return <ChevronUp className="h-4 w-4 text-green-600" />
    } else if (change < 0) {
      return <ChevronDown className="h-4 w-4 text-red-600" />
    }
    return null
  }

  const getTrendColor = (change: number) => {
    if (change > 0) return 'text-green-600'
    if (change < 0) return 'text-red-600'
    return 'text-muted-foreground'
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto p-6', className)}>
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                My Performance
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Your stats and achievements
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStats}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Period Selector */}
          {!isLoading && !error && (
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {(['daily', 'weekly', 'monthly'] as const).map((p) => (
                <Button
                  key={p}
                  variant={period === p ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  className="flex-1 capitalize"
                >
                  {p}
                </Button>
              ))}
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 bg-muted/50 rounded-lg">
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-12 mb-2" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          )}

          {/* Stats Display */}
          {!isLoading && !error && stats && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                  <div className="text-sm font-medium text-primary mb-1">Knocks</div>
                  <div className="text-2xl font-bold text-foreground mb-2">
                    {getCurrentStats()?.knocks || 0}
                  </div>
                  <Progress
                    value={getProgressPercentage(getCurrentStats()?.knocks || 0, getCurrentStats()?.target_knocks || 1)}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Goal: {getCurrentStats()?.target_knocks}
                  </div>
                </div>

                <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg text-center">
                  <div className="text-sm font-medium text-secondary-foreground mb-1">Appointments</div>
                  <div className="text-2xl font-bold text-foreground mb-2">
                    {getCurrentStats()?.appointments || 0}
                  </div>
                  <Progress
                    value={getProgressPercentage(getCurrentStats()?.appointments || 0, getCurrentStats()?.target_appointments || 1)}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Goal: {getCurrentStats()?.target_appointments}
                  </div>
                </div>

                <div className="p-4 bg-accent border border-accent/20 rounded-lg text-center">
                  <div className="text-sm font-medium text-accent-foreground mb-1">Sales</div>
                  <div className="text-2xl font-bold text-foreground mb-2">
                    {getCurrentStats()?.sales || 0}
                  </div>
                  <Progress
                    value={getProgressPercentage(getCurrentStats()?.sales || 0, getCurrentStats()?.target_sales || 1)}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Goal: {getCurrentStats()?.target_sales}
                  </div>
                </div>
              </div>

              {/* Commission (Monthly only) */}
              {period === 'monthly' && (
                <div className="p-4 bg-secondary/20 border border-secondary/30 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-secondary-foreground" />
                      <span className="font-medium text-foreground">Commission Earned</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                      {formatCurrency(stats.monthly.commission_earned)}
                    </div>
                  </div>
                  <Progress
                    value={getProgressPercentage(stats.monthly.commission_earned, stats.monthly.target_commission)}
                    className="h-3 mb-1"
                  />
                  <div className="text-sm text-muted-foreground">
                    Goal: {formatCurrency(stats.monthly.target_commission)}
                    <span className="ml-2">
                      ({Math.round(getProgressPercentage(stats.monthly.commission_earned, stats.monthly.target_commission))}% complete)
                    </span>
                  </div>
                </div>
              )}

              {/* Leaderboard Position */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  Team Rankings
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600 mb-1">
                      #{stats.position.knocks_rank}
                    </div>
                    <div className="text-sm text-muted-foreground">Knocks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 mb-1">
                      #{stats.position.sales_rank}
                    </div>
                    <div className="text-sm text-muted-foreground">Sales</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary mb-1">
                      #{stats.position.overall_rank}
                    </div>
                    <div className="text-sm text-muted-foreground">Overall</div>
                  </div>
                </div>
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Out of {stats.position.total_team_members} team members
                </div>
              </div>

              {/* Performance Trends */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold text-foreground mb-4">This Week vs Last Week</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Knocks</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stats.trends.knocks_change)}
                      <span className={cn('text-sm font-medium', getTrendColor(stats.trends.knocks_change))}>
                        {stats.trends.knocks_change > 0 ? '+' : ''}{stats.trends.knocks_change}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sales</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stats.trends.sales_change)}
                      <span className={cn('text-sm font-medium', getTrendColor(stats.trends.sales_change))}>
                        {stats.trends.sales_change > 0 ? '+' : ''}{stats.trends.sales_change}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Ranking</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(stats.trends.position_change)}
                      <span className={cn('text-sm font-medium', getTrendColor(stats.trends.position_change))}>
                        {stats.trends.position_change > 0 ? 'Moved up ' : stats.trends.position_change < 0 ? 'Moved down ' : 'No change'}
                        {Math.abs(stats.trends.position_change) > 0 && Math.abs(stats.trends.position_change)}
                        {Math.abs(stats.trends.position_change) > 0 && ' position'}
                        {Math.abs(stats.trends.position_change) > 1 && 's'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Achievements */}
              {stats.achievements.length > 0 && (
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-500" />
                    Recent Achievements
                  </h3>
                  <div className="space-y-2">
                    {stats.achievements.slice(0, 3).map((achievement) => (
                      <div key={achievement.id} className="flex items-center gap-3 p-2 bg-yellow-50 rounded-lg">
                        <span className="text-lg">{achievement.icon}</span>
                        <div className="flex-1">
                          <div className="font-medium text-yellow-900">{achievement.title}</div>
                          <div className="text-sm text-yellow-700">{achievement.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size={isFieldMode ? "lg" : "default"}
                    className="flex items-center gap-2"
                  >
                    <Trophy className="h-4 w-4" />
                    Leaderboard
                  </Button>
                  <Button
                    variant="outline"
                    size={isFieldMode ? "lg" : "default"}
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Full Stats
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}