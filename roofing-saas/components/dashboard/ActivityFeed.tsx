'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  UserPlus,
  FolderPlus,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'project_won' | 'project_lost' | 'project_created' | 'contact_added' | 'status_change'
  title: string
  description: string
  timestamp: string
  metadata?: {
    user?: string
    value?: number
    project_name?: string
    contact_name?: string
    old_status?: string
    new_status?: string
    project_id?: string
    contact_id?: string
  }
}

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async () => {
    setLoading(true)
    setError(null)

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000) // 30s timeout

    try {
      const response = await fetch('/api/dashboard/activity', {
        signal: abortController.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()

      if (result.success) {
        setActivities(result.data.activities || [])
      } else {
        setError('Failed to load activity data')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Error fetching activities:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error:')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'project_won':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'project_lost':
        return <XCircle className="h-5 w-5 text-muted-foreground" />
      case 'project_created':
        return <FolderPlus className="h-5 w-5 text-primary" />
      case 'contact_added':
        return <UserPlus className="h-5 w-5 text-primary" />
      case 'status_change':
        return <TrendingUp className="h-5 w-5 text-orange-600" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'project_won':
        return 'bg-green-50 border-green-200'
      case 'project_lost':
        return 'bg-gray-50 border'
      case 'project_created':
        return 'bg-blue-50 border-blue-200'
      case 'contact_added':
        return 'bg-purple-50 border-purple-200'
      case 'status_change':
        return 'bg-orange-50 border-orange-200'
      default:
        return 'bg-gray-50 border'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes}m ago`
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 48) {
      return 'Yesterday'
    } else {
      const diffInDays = Math.floor(diffInHours / 24)
      return `${diffInDays}d ago`
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 animate-pulse">
        <div className="mb-4">
          <div className="h-6 bg-muted rounded w-32 mb-1" />
          <div className="h-4 bg-muted rounded w-48" />
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-3">
              <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Team updates from the last 7 days</p>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-muted-foreground mb-4">{error}</div>
            <Button
              onClick={() => fetchActivities()}
              variant="outline"
              size="sm"
            >
              Try again
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <p className="text-sm text-muted-foreground">Team updates from the last 7 days</p>
      </div>

      {/* Activity List */}
      {activities.length > 0 && (
        <div className="space-y-3">
          {activities.map((activity) => {
            const hasLink = activity.metadata?.project_id || activity.metadata?.contact_id
            const linkHref = activity.metadata?.project_id
              ? `/projects/${activity.metadata.project_id}`
              : activity.metadata?.contact_id
                ? `/contacts/${activity.metadata.contact_id}`
                : '#'

            const content = (
              <>
                {/* Icon */}
                <div className="w-10 h-10 rounded-full bg-card border border flex items-center justify-center flex-shrink-0">
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-medium text-foreground text-sm">
                      {activity.title}
                    </p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>

                  {/* Value Display for Won Deals */}
                  {activity.type === 'project_won' && activity.metadata?.value && (
                    <div className="mt-2 flex items-center gap-1 text-green-700">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        {formatCurrency(activity.metadata.value)}
                      </span>
                    </div>
                  )}

                  {/* Value Display for New Projects */}
                  {activity.type === 'project_created' && activity.metadata?.value && activity.metadata.value > 0 && (
                    <div className="mt-2 flex items-center gap-1 text-primary">
                      <span className="text-xs">
                        Est. {formatCurrency(activity.metadata.value)}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )

            return hasLink ? (
              <Link
                key={activity.id}
                href={linkHref}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors hover:shadow-md cursor-pointer ${getActivityColor(activity.type)}`}
              >
                {content}
              </Link>
            ) : (
              <div
                key={activity.id}
                className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${getActivityColor(activity.type)}`}
              >
                {content}
              </div>
            )
          })}
        </div>
      )}

      {/* Empty State */}
      {activities.length === 0 && (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No recent activity</p>
          <p className="text-sm text-muted-foreground mt-1">Activity will appear here as your team works</p>
        </div>
      )}
    </div>
  )
}
