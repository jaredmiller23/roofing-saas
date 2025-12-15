'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getScoreLevelStyles } from '@/lib/scoring/scoring-rules'
import type { LeadScoreLevel } from '@/lib/scoring/score-types'

interface LeadScoreBadgeProps {
  score: number
  level: LeadScoreLevel
  showLabel?: boolean
  showTrend?: boolean
  trend?: 'up' | 'down' | 'stable'
  compact?: boolean
  className?: string
}

/**
 * LeadScoreBadge displays a contact's lead score as a colored badge
 * with optional tooltip showing score breakdown
 */
export function LeadScoreBadge({
  score,
  level,
  showLabel = true,
  showTrend = false,
  trend = 'stable',
  compact = false,
  className = '',
}: LeadScoreBadgeProps) {
  const styles = getScoreLevelStyles(level)
  
  const badgeContent = (
    <Badge
      variant="secondary"
      className={`
        ${styles.bg} ${styles.text} ${styles.border} border
        ${compact ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1'}
        font-semibold
        ${className}
      `}
    >
      <div className="flex items-center gap-1">
        {showTrend && (
          <span className="flex items-center">
            {trend === 'up' && <TrendingUp className="h-3 w-3" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3" />}
            {trend === 'stable' && <Minus className="h-3 w-3" />}
          </span>
        )}
        
        <span>
          {score}
          {showLabel && (
            <span className="ml-1 font-normal">
              {compact ? level.charAt(0).toUpperCase() : level.toUpperCase()}
            </span>
          )}
        </span>
      </div>
    </Badge>
  )

  if (!showLabel && !compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-semibold">Lead Score: {score}/100</div>
              <div className="text-xs text-muted-foreground mt-1">
                Priority: {level.toUpperCase()}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}

/**
 * Get appropriate score level label
 */
export function getScoreLevelLabel(level: LeadScoreLevel): string {
  const labels: Record<LeadScoreLevel, string> = {
    hot: 'Hot Lead',
    warm: 'Warm Lead', 
    cold: 'Cold Lead',
  }
  return labels[level]
}

/**
 * Get score level description
 */
export function getScoreLevelDescription(level: LeadScoreLevel): string {
  const descriptions: Record<LeadScoreLevel, string> = {
    hot: 'High-priority lead requiring immediate attention',
    warm: 'Qualified lead with good conversion potential',
    cold: 'Low-priority lead for long-term nurturing',
  }
  return descriptions[level]
}

/**
 * Compact version of the lead score badge for use in tight spaces
 */
export function CompactLeadScoreBadge({
  score,
  level,
  className = '',
}: {
  score: number
  level: LeadScoreLevel
  className?: string
}) {
  return (
    <LeadScoreBadge
      score={score}
      level={level}
      showLabel={false}
      compact={true}
      className={className}
    />
  )
}

/**
 * Detailed version with trend indicator
 */
export function DetailedLeadScoreBadge({
  score,
  level,
  trend = 'stable',
  className = '',
}: {
  score: number
  level: LeadScoreLevel
  trend?: 'up' | 'down' | 'stable'
  className?: string
}) {
  return (
    <LeadScoreBadge
      score={score}
      level={level}
      showLabel={true}
      showTrend={true}
      trend={trend}
      className={className}
    />
  )
}
