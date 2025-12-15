'use client'

import { useEffect, useState } from 'react'
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

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchActivities = async () => {
    setIsLoading(true)
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
      if (result.success && result.data) {
        // Transform the data to match our interface
        // API returns different format - adapt it
        const transformedActivities = (result.data.activities || []).map((item: {
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
        }) => {
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
              name: item.metadata?.contact_name || item.metadata?.user || 'Team Member',
              avatar: undefined
            },
            timestamp: new Date(item.timestamp),
            value: item.metadata?.value,
            badge: item.type === 'project_won' ? 'Won' : undefined
          }
        })
        setActivities(transformedActivities)
      } else {
        setError('Failed to load activity data')
      }
    } catch (error) {
      clearTimeout(timeoutId)
      console.error('Failed to fetch activity feed:', error)

      if (error instanceof Error && error.name === 'AbortError') {
        setError('Request timeout - please try again')
      } else if (error instanceof Error && error.message?.includes('Server error:')) {
        setError('Server error - please try again')
      } else {
        setError('Failed to connect to server')
      }
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

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

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'sale':
        return 'text-green-600 bg-green-100'
      case 'knock':
        return 'text-blue-600 bg-blue-100'
      case 'call':
        return 'text-purple-600 bg-purple-100'
      case 'email':
        return 'text-orange-600 bg-orange-100'
      case 'achievement':
        return 'text-yellow-600 bg-yellow-100'
      case 'goal':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-muted-foreground bg-muted'
    }
  }

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

              return (
                <div key={activity.id} className="flex items-start gap-3 pb-3 border-b border-border last:border-0">
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
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}