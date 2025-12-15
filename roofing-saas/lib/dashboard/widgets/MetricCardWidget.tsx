'use client'

/**
 * MetricCardWidget Component
 *
 * Displays a single key metric with optional trend and goal tracking.
 */

import React from 'react'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import type { MetricCardConfig } from '@/lib/dashboard/dashboard-types'

interface MetricCardWidgetProps {
  config: MetricCardConfig
  data: {
    value: number
    previous_value?: number
    goal?: number
  }
}

export function MetricCardWidget({ config, data }: MetricCardWidgetProps) {
  const formatValue = (value: number): string => {
    switch (config.format) {
      case 'currency':
        return `${config.prefix || '$'}${value.toLocaleString()}${config.suffix || ''}`
      case 'percentage':
        return `${config.prefix || ''}${value}${config.suffix || '%'}`
      case 'duration':
        return `${config.prefix || ''}${value}${config.suffix || 'h'}`
      case 'number':
      default:
        return `${config.prefix || ''}${value.toLocaleString()}${config.suffix || ''}`
    }
  }

  const calculateTrend = () => {
    if (!config.trend?.enabled || !data.previous_value) return null

    const change = data.value - data.previous_value
    const percentChange = (change / data.previous_value) * 100
    const isPositive = change > 0

    return {
      change,
      percentChange,
      isPositive,
    }
  }

  const calculateProgress = () => {
    if (!config.goal?.enabled || !data.goal) return null
    return Math.min((data.value / data.goal) * 100, 100)
  }

  const trend = calculateTrend()
  const progress = calculateProgress()

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="text-3xl font-bold text-foreground mb-2">
          {formatValue(data.value)}
        </div>

        {trend && config.trend && (
          <div
            className={`flex items-center gap-1 text-sm ${
              trend.isPositive ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {config.trend.show_arrow &&
              (trend.isPositive ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              ))}
            {config.trend.show_percentage && (
              <span>{Math.abs(trend.percentChange).toFixed(1)}%</span>
            )}
            <span className="text-muted-foreground">
              vs {config.trend.comparison_period.replace('_', ' ')}
            </span>
          </div>
        )}
      </div>

      {progress !== null && config.goal && (
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Goal Progress</span>
            <span className="font-medium">{progress.toFixed(0)}%</span>
          </div>
          {config.goal.show_progress && <Progress value={progress} className="h-2" />}
        </div>
      )}
    </div>
  )
}

export default MetricCardWidget
