'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ApprovalRateBadgeProps {
  rate: number // 0-100
  showLabel?: boolean
  size?: 'sm' | 'default'
}

/**
 * ApprovalRateBadge - Color-coded badge for approval rates
 *
 * Colors:
 * - Green: 80%+
 * - Yellow: 60-79%
 * - Red: < 60%
 *
 * @example
 * <ApprovalRateBadge rate={75} />
 */
export function ApprovalRateBadge({
  rate,
  showLabel = false,
  size = 'default',
}: ApprovalRateBadgeProps) {
  const getColorClass = (rate: number): string => {
    if (rate >= 80) return 'bg-green-500 text-white hover:bg-green-500/90'
    if (rate >= 60) return 'bg-yellow-500 text-white hover:bg-yellow-500/90'
    return 'bg-red-500 text-white hover:bg-red-500/90'
  }

  return (
    <Badge
      className={cn(
        getColorClass(rate),
        size === 'sm' && 'text-xs px-2 py-0'
      )}
    >
      {rate.toFixed(0)}%{showLabel && ' approval'}
    </Badge>
  )
}

/**
 * Get the color class for an approval rate (for use outside badges)
 */
export function getApprovalRateColor(rate?: number): string {
  if (!rate) return 'bg-muted text-muted-foreground'
  if (rate >= 80) return 'bg-green-500 text-white'
  if (rate >= 60) return 'bg-yellow-500 text-white'
  return 'bg-red-500 text-white'
}
