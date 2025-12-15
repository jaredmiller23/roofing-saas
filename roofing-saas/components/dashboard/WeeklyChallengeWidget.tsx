'use client'

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
  // Mock data - in real implementation this would come from API
  const challenge: Challenge = {
    id: 'week-45-2024',
    title: 'Door Knock Champion',
    description: 'Be the first to reach 100 door knocks this week',
    target: 100,
    current: 73,
    unit: 'knocks',
    timeRemaining: '2 days',
    participants: 12,
    reward: '$500 bonus + Paid Day Off',
    status: 'active'
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
            <span className="text-muted-foreground">{challenge.timeRemaining} left</span>
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