'use client'

import { type LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  color?: 'default' | 'success' | 'warning' | 'danger'
  subtitle?: string
}

/**
 * StatCard - Reusable metric card for dashboard summaries
 *
 * @example
 * <StatCard
 *   label="Total Claims"
 *   value={127}
 *   icon={FileText}
 *   color="success"
 *   trend={{ value: 12, isPositive: true }}
 * />
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  color = 'default',
  subtitle,
}: StatCardProps) {
  const colorClasses = {
    default: 'text-muted-foreground bg-muted',
    success: 'text-green-500 bg-green-500/10',
    warning: 'text-yellow-500 bg-yellow-500/10',
    danger: 'text-red-500 bg-red-500/10',
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </p>
            )}
          </div>
          <div className={cn('p-3 rounded-full', colorClasses[color])}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
