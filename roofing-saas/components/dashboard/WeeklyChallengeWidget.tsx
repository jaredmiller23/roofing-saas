'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

export function WeeklyChallengeWidget() {
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchWeeklyChallenge = async () => {
    setIsLoading(true)
    setError(null)

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000) // 30s timeout

    try {
      const response = await fetch('/api/dashboard/weekly-challenge', {
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (result.success && result.data) {
        setChallenge(result.data.challenge)
      } else {
        setError('Failed to load challenge data')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch weekly challenge:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error:')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWeeklyChallenge()
  }, [])

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
  if (!challenge) {
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

  const progress = (challenge.current / challenge.target) * 100
  const isNearCompletion = progress >= 80
  const isCompleted = progress >= 100

  const getStatusColor = () => {
    if (isCompleted) return 'text-green-600 bg-green-100'
    if (isNearCompletion) return 'text-orange-600 bg-orange-100'
    return 'text-blue-600 bg-blue-100'
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
            {challenge.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {challenge.description}
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {challenge.current} / {challenge.target} {challenge.unit}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            <span>{challenge.target - challenge.current} remaining</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {challenge.timeRemaining === 'rolling' ? 'Last 7 days' : `${challenge.timeRemaining} left`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{challenge.participants} competing</span>
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-foreground">Reward</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {challenge.reward}
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" className="flex-1">
            <TrendingUp className="h-4 w-4 mr-2" />
            View Leaderboard
          </Button>
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}