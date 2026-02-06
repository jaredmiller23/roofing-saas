'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface DevMetricCardProps {
  title: string
  value: number | string
  subtitle?: string
  icon?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  isLoading?: boolean
}

/**
 * DevMetricCard - Stat card for dev dashboard
 *
 * Displays a single metric with title, value, and optional icon.
 * Supports color variants for different metric types.
 */
export function DevMetricCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  isLoading = false,
}: DevMetricCardProps) {
  const variantStyles = {
    default: 'bg-card border-border',
    success: 'bg-green-500/5 border-green-500/20',
    warning: 'bg-yellow-500/5 border-yellow-500/20',
    danger: 'bg-red-500/5 border-red-500/20',
  }

  const valueStyles = {
    default: 'text-foreground',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    danger: 'text-red-600 dark:text-red-400',
  }

  if (isLoading) {
    return (
      <Card className={cn('border', variantStyles[variant])}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('border', variantStyles[variant])}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className={cn('text-3xl font-bold mt-1', valueStyles[variant])}>
              {value}
            </p>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={cn(
              'p-3 rounded-lg',
              variant === 'default' && 'bg-primary/10 text-primary',
              variant === 'success' && 'bg-green-500/10 text-green-600 dark:text-green-400',
              variant === 'warning' && 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
              variant === 'danger' && 'bg-red-500/10 text-red-600 dark:text-red-400',
            )}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
