'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Trophy, TrendingUp, Target, Calendar } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface PointsData {
  total_points: number
  current_level: number
  daily_points: number
  weekly_points: number
  monthly_points: number
}

type TimePeriod = 'daily' | 'weekly' | 'monthly'

interface PointsDisplayProps {
  /** Optional pre-fetched data from consolidated API */
  data?: PointsData | null
  /** Optional loading state from parent */
  isLoading?: boolean
}

export function PointsDisplay({ data: externalData, isLoading: externalLoading }: PointsDisplayProps) {
  const [points, setPoints] = useState<PointsData | null>(null)
  const [internalLoading, setInternalLoading] = useState(!externalData)
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('daily')

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

      {/* Daily, Weekly, Monthly Stats - Clickable period toggles */}
      <TooltipProvider>
        <div className="grid grid-cols-3 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setSelectedPeriod('daily')}
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all duration-200 w-full",
                  selectedPeriod === 'daily'
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-center mb-1">
                  <Target className={cn(
                    "h-4 w-4 mr-1",
                    selectedPeriod === 'daily' ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    selectedPeriod === 'daily' ? "text-primary font-medium" : "text-muted-foreground"
                  )}>Daily</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {effectivePoints.daily_points}
                </p>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Points earned today - Click to view daily details</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setSelectedPeriod('weekly')}
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all duration-200 w-full",
                  selectedPeriod === 'weekly'
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className={cn(
                    "h-4 w-4 mr-1",
                    selectedPeriod === 'weekly' ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    selectedPeriod === 'weekly' ? "text-primary font-medium" : "text-muted-foreground"
                  )}>Weekly</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {effectivePoints.weekly_points}
                </p>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Points earned this week - Click to view weekly details</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setSelectedPeriod('monthly')}
                className={cn(
                  "text-center p-3 rounded-lg cursor-pointer transition-all duration-200 w-full",
                  selectedPeriod === 'monthly'
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted/30 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-center mb-1">
                  <Calendar className={cn(
                    "h-4 w-4 mr-1",
                    selectedPeriod === 'monthly' ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs",
                    selectedPeriod === 'monthly' ? "text-primary font-medium" : "text-muted-foreground"
                  )}>Monthly</span>
                </div>
                <p className="text-lg font-semibold text-foreground">
                  {effectivePoints.monthly_points}
                </p>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Points earned this month - Click to view monthly details</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Selected Period Details */}
      <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border">
        <div className="flex items-center gap-2 mb-2">
          {selectedPeriod === 'daily' && <Target className="h-4 w-4 text-primary" />}
          {selectedPeriod === 'weekly' && <TrendingUp className="h-4 w-4 text-primary" />}
          {selectedPeriod === 'monthly' && <Calendar className="h-4 w-4 text-primary" />}
          <span className="text-sm font-medium text-foreground capitalize">
            {selectedPeriod} Summary
          </span>
        </div>
        <p className="text-2xl font-bold text-primary">
          {selectedPeriod === 'daily' && effectivePoints.daily_points}
          {selectedPeriod === 'weekly' && effectivePoints.weekly_points}
          {selectedPeriod === 'monthly' && effectivePoints.monthly_points}
          <span className="text-sm font-normal text-muted-foreground ml-2">points</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedPeriod === 'daily' && "Points earned today"}
          {selectedPeriod === 'weekly' && "Points earned this week (Mon-Sun)"}
          {selectedPeriod === 'monthly' && `Points earned in ${new Date().toLocaleString('default', { month: 'long' })}`}
        </p>
      </div>
    </div>
  )
}
