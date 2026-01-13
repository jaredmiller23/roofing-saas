'use client'

import { useEffect, useState } from 'react'
import { Trophy, TrendingUp, Target } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PointsData {
  total_points: number
  current_level: number
  daily_points: number
  weekly_points: number
  monthly_points: number
}

export function PointsDisplay() {
  const [points, setPoints] = useState<PointsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPoints()
  }, [])

  const fetchPoints = async () => {
    try {
      const response = await fetch('/api/gamification/points')
      const result = await response.json()

      if (result.success) {
        setPoints(result.data)
      }
    } catch (error) {
      console.error('Error fetching points:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-muted rounded w-28" />
          <div className="h-5 w-5 bg-muted rounded" />
        </div>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-24" />
          </div>
          <div className="h-2 bg-muted rounded-full w-full mb-1" />
          <div className="h-3 bg-muted rounded w-32" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="h-4 bg-muted rounded w-12 mx-auto mb-1" />
              <div className="h-6 bg-muted rounded w-8 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!points) return null

  // Calculate points in current level and progress to next level
  const pointsInCurrentLevel = points.total_points - (points.current_level * 100)
  const progressPercentage = (pointsInCurrentLevel / 100) * 100

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Your Progress</h3>
        <Trophy className="h-5 w-5 text-yellow-500" />
      </div>

      {/* Level and Total Points */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Level {points.current_level}</span>
          <span className="text-sm font-medium text-foreground">
            {points.total_points.toLocaleString()} points
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {100 - pointsInCurrentLevel} points to level {points.current_level + 1}
        </p>
      </div>

      {/* Daily, Weekly, Monthly Stats */}
      <TooltipProvider>
        <div className="grid grid-cols-3 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-3 bg-muted/30 rounded-lg cursor-help hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center mb-1">
                  <Target className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Daily</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {points.daily_points}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Points earned today</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-3 bg-muted/30 rounded-lg cursor-help hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Weekly</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {points.weekly_points}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Points earned this week</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center p-3 bg-muted/30 rounded-lg cursor-help hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-center mb-1">
                  <Trophy className="h-4 w-4 text-muted-foreground mr-1" />
                  <span className="text-xs text-muted-foreground">Monthly</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {points.monthly_points}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Points earned this month</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  )
}