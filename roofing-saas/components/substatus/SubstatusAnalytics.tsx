'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, TrendingUp, Users, Loader2 } from 'lucide-react'
import { SubstatusBadge } from './SubstatusBadge'
import type { SubstatusConfig } from '@/lib/substatus/types'

interface SubstatusDistribution {
  substatus_value: string
  count: number
  config?: SubstatusConfig
}

interface SubstatusAnalyticsProps {
  entityType: 'contacts' | 'projects' | 'leads'
  statusValue?: string
  className?: string
}

export function SubstatusAnalytics({
  entityType,
  statusValue,
  className = ''
}: SubstatusAnalyticsProps) {
  const [loading, setLoading] = useState(true)
  const [distribution, setDistribution] = useState<SubstatusDistribution[]>([])
  const [configs, setConfigs] = useState<Record<string, SubstatusConfig>>({})
  const [error, setError] = useState<string | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Load substatus configurations
      const configParams = new URLSearchParams({
        entity_type: entityType,
      })
      if (statusValue) {
        configParams.append('status_value', statusValue)
      }

      const configResponse = await fetch(`/api/substatus/configs?${configParams.toString()}`)
      if (!configResponse.ok) {
        throw new Error('Failed to load substatus configurations')
      }

      const configData = await configResponse.json()
      const configMap = (configData.configs || []).reduce((acc: Record<string, SubstatusConfig>, config: SubstatusConfig) => {
        acc[config.substatus_value] = config
        return acc
      }, {})
      setConfigs(configMap)

      // Load substatus distribution from entities
      // Note: This is a simplified version - in production, you'd want a dedicated analytics endpoint
      const _entityTable = entityType === 'contacts' ? 'contacts' : 'projects'
      const _statusField = entityType === 'contacts' ? 'stage' : 'status'

      // For now, we'll create a placeholder analytics API endpoint call
      // In a real implementation, you'd query the database for actual counts
      const analyticsResponse = await fetch(`/api/substatus/analytics?entity_type=${entityType}${statusValue ? `&status_value=${statusValue}` : ''}`)

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setDistribution(analyticsData.distribution || [])
        setTotalCount(analyticsData.total || 0)
      } else {
        // Fallback: show placeholder data
        setDistribution([])
        setTotalCount(0)
      }
    } catch (err) {
      console.error('Error loading substatus analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }, [entityType, statusValue])

  useEffect(() => {
    loadAnalytics()
  }, [loadAnalytics])

  if (loading) {
    return (
      <div className={`bg-card rounded-lg border border p-6 ${className}`}>
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`bg-card rounded-lg border border p-6 ${className}`}>
        <div className="flex items-center justify-center h-48 text-red-600">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  const sortedDistribution = distribution
    .map(item => ({
      ...item,
      config: configs[item.substatus_value]
    }))
    .sort((a, b) => b.count - a.count)

  const maxCount = Math.max(...sortedDistribution.map(item => item.count), 1)

  return (
    <div className={`bg-card rounded-lg border border ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold text-foreground">
              Substatus Distribution
            </h3>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{totalCount} {entityType}</span>
          </div>
        </div>
        {statusValue && (
          <p className="text-sm text-muted-foreground mt-1">
            For status: <span className="font-medium capitalize">{statusValue}</span>
          </p>
        )}
      </div>

      {/* Content */}
      <div className="p-6">
        {sortedDistribution.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p>No substatus data available</p>
            <p className="text-sm mt-1">
              {statusValue
                ? 'No records found with substatuses for this status'
                : 'Start adding substatuses to see distribution'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedDistribution.map((item) => {
              const percentage = totalCount > 0 ? (item.count / totalCount) * 100 : 0
              const barWidth = totalCount > 0 ? (item.count / maxCount) * 100 : 0

              return (
                <div key={item.substatus_value} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {item.config ? (
                        <SubstatusBadge
                          substatus={item.config}
                          size="sm"
                          className="flex-shrink-0"
                        />
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground truncate">
                          {item.substatus_value}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm flex-shrink-0 ml-4">
                      <span className="font-semibold text-foreground w-8 text-right">
                        {item.count}
                      </span>
                      <span className="text-muted-foreground w-12 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${barWidth}%`,
                        backgroundColor: item.config?.color || '#3B82F6'
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer with insights */}
      {sortedDistribution.length > 0 && (
        <div className="px-6 py-4 border-t border bg-gray-50">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-foreground">
                {sortedDistribution[0].config?.substatus_label || sortedDistribution[0].substatus_value}
              </span>
              {' '}is the most common substatus ({sortedDistribution[0].count} {entityType})
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Placeholder API endpoint would be at /api/substatus/analytics/route.ts
// For now, the component will show "No data" until the endpoint is implemented
