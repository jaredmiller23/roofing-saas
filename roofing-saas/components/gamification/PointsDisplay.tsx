'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
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

interface PointsDisplayProps {
  /** Optional pre-fetched data from consolidated API */
  data?: PointsData | null
  /** Optional loading state from parent */
  isLoading?: boolean
}

export function PointsDisplay({ data: externalData, isLoading: externalLoading }: PointsDisplayProps) {
  const [points, setPoints] = useState<PointsData | null>(null)
  const [internalLoading, setInternalLoading] = useState(!externalData)

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading
  const effectivePoints = externalData || points

  useEffect(() => {
    // Only fetch if no external data provided
    if (externalData === undefined) {
      fetchPoints()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalData])

  const fetchPoints = async () => {
    // Skip fetch if external data is provided
    if (externalData !== undefined) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await apiFetch<any>('/api/gamification/points')
      setPoints(data)
    } catch (error) {
      console.error('Error fetching points:', error)
    } finally {
      setInternalLoading(false)
    }
  }

  if (isLoading) {
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

  if (!effectivePoints) return null

  // Calculate points in current level and progress to next level
  const pointsInCurrentLevel = effectivePoints.total_points - (effectivePoints.current_level * 100)
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
          <span className="text-sm text-muted-foreground">Level {effectivePoints.current_level}</span>
          <span className="text-sm font-medium text-foreground">
            {effectivePoints.total_points.toLocaleString()} points
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
          {100 - pointsInCurrentLevel} points to level {effectivePoints.current_level + 1}
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
                  {effectivePoints.daily_points}
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
                  {effectivePoints.weekly_points}
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
                  {effectivePoints.monthly_points}
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
