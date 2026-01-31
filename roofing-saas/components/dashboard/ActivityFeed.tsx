'use client'

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  Phone,
  Mail,
  MapPin,
  Trophy,
  Target,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { getActivityColor } from '@/lib/constants/activity-colors'

interface Activity {
  id: string
  type: 'sale' | 'knock' | 'call' | 'email' | 'achievement' | 'goal'
  title: string
  description: string
  user: {
    name: string
    avatar?: string
  }
  timestamp: Date
  value?: number
  badge?: string
}

interface ActivityFeedData {
  activities: Array<{
    id: string
    type: string
    title: string
    description: string
    timestamp: string
    metadata?: {
      user?: string
      value?: number
      contact_name?: string
    }
  }>
  count: number
}

interface ActivityFeedProps {
  /** Optional pre-fetched data from consolidated API */
  data?: ActivityFeedData | null
  /** Optional loading state from parent */
  isLoading?: boolean
}

export function ActivityFeed({ data: externalData, isLoading: externalLoading }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [internalLoading, setInternalLoading] = useState(!externalData)
  const [error, setError] = useState<string | null>(null)

  const isLoading = externalLoading !== undefined ? externalLoading : internalLoading

  // Transform external data to internal format
  const transformApiData = (apiData: ActivityFeedData): Activity[] => {
    return (apiData.activities || []).map((item) => {
      // Map API types to component types
      let mappedType: Activity['type'] = 'goal'
      if (item.type === 'project_won') mappedType = 'sale'
      else if (item.type === 'project_lost') mappedType = 'goal'
      else if (item.type === 'project_created') mappedType = 'goal'
      else if (item.type === 'contact_added') mappedType = 'knock'
      else if (item.type === 'status_change') mappedType = 'goal'

      return {
        id: item.id,
        type: mappedType,
        title: item.title,
        description: item.description,
        user: {
          name: item.metadata?.user || 'Team Member',
          avatar: undefined
        },
        timestamp: new Date(item.timestamp),
        value: item.metadata?.value,
        badge: item.type === 'project_won' ? 'Won' : undefined
      }
    })
  }

  // Use external data if provided
  useEffect(() => {
    if (externalData) {
      setActivities(transformApiData(externalData))
    }
  }, [externalData])

  const fetchActivities = async () => {
    // Skip fetch if external data is provided
    if (externalData !== undefined) return

    setInternalLoading(true)
    setError(null)

    // Create abort controller for timeout
    const abortController = new AbortController()
    const timeoutId = setTimeout(() => abortController.abort(), 30000) // 30s timeout

    try {
      const result = await apiFetch<ActivityFeedData>(
        '/api/dashboard/activity',
        { signal: abortController.signal }
      )
      clearTimeout(timeoutId)
      setActivities(transformApiData(result))
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch activity feed:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setInternalLoading(false)
    }
  }

  useEffect(() => {
    // Only fetch if no external data provided
    if (externalData === undefined) {
      fetchActivities()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalData])

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'sale':
        return DollarSign
      case 'knock':
        return MapPin
      case 'call':
        return Phone
      case 'email':
        return Mail
      case 'achievement':
        return Trophy
      case 'goal':
        return Target
      default:
        return Clock
    }
  }

  // Get the URL for an activity based on its ID pattern
  const getActivityUrl = (activityId: string): string | null => {
    // ID patterns: project_won_{id}, project_lost_{id}, project_created_{id}, contact_added_{id}
    if (activityId.startsWith('project_won_') ||
        activityId.startsWith('project_lost_') ||
        activityId.startsWith('project_created_')) {
      const projectId = activityId.replace(/^project_(won|lost|created)_/, '')
      return `/projects/${projectId}`
    }
    if (activityId.startsWith('contact_added_')) {
      const contactId = activityId.replace('contact_added_', '')
      return `/contacts/${contactId}`
    }
    return null
  }

  // Activity colors now imported from @/lib/constants/activity-colors

  // Show loading skeleton
  if (isLoading) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                <div className="w-8 h-8 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Show error state with retry
  if (error) {
    return (
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <div className="text-muted-foreground mb-4">{error}</div>
              <Button
                onClick={() => fetchActivities()}
                variant="outline"
                size="sm"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="lg:col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mb-2" />
            <div className="text-muted-foreground">No recent activity</div>
            <div className="text-sm text-muted-foreground">Activity will appear here as your team works</div>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type)
              const colorClass = getActivityColor(activity.type)
              const activityUrl = getActivityUrl(activity.id)

              const ActivityContent = (
                <>
                  <div className={`p-2 rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                      {activity.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {activity.badge}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={activity.user.avatar} alt={activity.user.name} />
                        <AvatarFallback className="text-xs">
                          {activity.user.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span>{activity.user.name}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(activity.timestamp, { addSuffix: true })}</span>
                    </div>
                  </div>
                </>
              )

              // Wrap in Link if we have a URL, otherwise render as div
              if (activityUrl) {
                return (
                  <Link
                    key={activity.id}
                    href={activityUrl}
                    className="flex items-start gap-3 pb-3 border-b border-border last:border-0 hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    {ActivityContent}
                  </Link>
                )
              }

              return (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
                  {ActivityContent}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
