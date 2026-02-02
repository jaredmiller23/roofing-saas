'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Leaderboard } from '@/components/gamification/Leaderboard'
import {
  Trophy,
  Target,
  Calendar,
  Clock,
  Users,
  TrendingUp
} from 'lucide-react'

interface Challenge {
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

interface WeeklyChallengeWidgetProps {
  /** Optional pre-fetched data from consolidated API */
  data?: Challenge | null
  /** Optional loading state from parent */
  isLoading?: boolean
}

export function WeeklyChallengeWidget({ data: externalData, isLoading: externalLoading }: WeeklyChallengeWidgetProps) {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [internalLoading, setInternalLoading] = useState(!externalData)
  const [error, setError] = useState<string | null>(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading
  const effectiveChallenge = externalData || challenge

  const fetchWeeklyChallenge = async () => {
    // Skip fetch if external data is provided
    if (externalData !== undefined) return

    setInternalLoading(true)
    setError(null)

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000) // 30s timeout

    try {
      const result = await apiFetch<Challenge>(
        '/api/dashboard/weekly-challenge',
        { signal: abortController.signal }
      )
      clearTimeout(timeoutId)
      setChallenge(result)
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch weekly challenge:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setInternalLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch if no external data provided
    if (externalData === undefined) {
      fetchWeeklyChallenge()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalData])

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Weekly Challenge
            </div>
            <div className="h-6 w-20 bg-muted rounded-full" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 animate-pulse">
          <div>
            <div className="h-5 bg-muted rounded w-3/4 mb-1" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 bg-muted rounded w-16" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
            <div className="h-2 bg-muted rounded w-full" />
            <div className="flex justify-between">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="h-3 bg-muted rounded w-16" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-16" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 bg-muted rounded" />
              <div className="h-4 bg-muted rounded w-20" />
            </div>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="h-4 bg-muted rounded w-16 mb-1" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
          <div className="flex gap-2">
            <div className="h-8 bg-muted rounded flex-1" />
            <div className="h-8 w-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state with retry
  if (error) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Weekly Challenge
            </div>
            <Badge variant="secondary" className="text-muted-foreground bg-muted">
              Error
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">{error}</div>
              <Button
                onClick={() => fetchWeeklyChallenge()}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show no data state
  if (!effectiveChallenge) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Weekly Challenge
            </div>
            <Badge variant="secondary" className="text-muted-foreground bg-muted">
              No Challenge
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Trophy className="h-12 w-12 text-muted-foreground mb-2" />
            <div className="text-muted-foreground">No active challenge</div>
            <div className="text-sm text-muted-foreground">Check back later for new challenges</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const progress = (effectiveChallenge.current / effectiveChallenge.target) * 100
  const isNearCompletion = progress >= 80
  const isCompleted = progress >= 100

  const getStatusColor = () => {
    if (isCompleted) return 'text-green-500 bg-green-500/10'
    if (isNearCompletion) return 'text-orange-500 bg-orange-500/10'
    return 'text-blue-500 bg-blue-500/10'
  }

  const getStatusText = () => {
    if (isCompleted) return 'Completed!'
    if (isNearCompletion) return 'Almost there!'
    return 'In Progress'
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Weekly Challenge
          </div>
          <Badge
            variant="secondary"
            className={getStatusColor()}
          >
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-foreground mb-1">
            {effectiveChallenge.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {effectiveChallenge.description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {effectiveChallenge.current} / {effectiveChallenge.target} {effectiveChallenge.unit}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            <span>{effectiveChallenge.target - effectiveChallenge.current} remaining</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {effectiveChallenge.timeRemaining === 'rolling' ? 'Last 7 days' : `${effectiveChallenge.timeRemaining} left`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{effectiveChallenge.participants} competing</span>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-foreground">Reward</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {effectiveChallenge.reward}
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={() => setShowLeaderboard(true)}>
            <TrendingUp className="h-4 w-4 mr-2" />
            View Leaderboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.href = '/events'}>
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>

      {/* Leaderboard Dialog */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Leaderboard
            </DialogTitle>
          </DialogHeader>
          <Leaderboard />
        </DialogContent>
      </Dialog>
    </Card>
  )
}
