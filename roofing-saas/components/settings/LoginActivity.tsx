'use client'

// =============================================
// Login Activity Component
// =============================================
// Purpose: Display login history and security events
// Author: Claude Code
// Date: 2025-12-13
// =============================================

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Loader2,
  History,
  RefreshCw,
  XCircle,
  AlertCircle,
  LogIn,
  LogOut,
  Key,
  Shield,
  Lock,
  Unlock,
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  ChevronDown
} from 'lucide-react'

type LoginEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'password_reset'
  | 'password_changed'
  | 'mfa_challenge'
  | 'mfa_verified'
  | 'mfa_failed'
  | 'account_locked'
  | 'account_unlocked'

interface LoginActivityItem {
  id: string
  email: string
  event_type: LoginEventType
  ip_address: string | null
  device_type: string | null
  browser: string | null
  browser_version: string | null
  os: string | null
  os_version: string | null
  location_city: string | null
  location_region: string | null
  location_country: string | null
  failure_reason: string | null
  created_at: string
}

interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function LoginActivity() {
  const [activities, setActivities] = useState<LoginActivityItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchActivities()
  }, [])

  const fetchActivities = async (offset = 0, append = false) => {
    if (append) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const data = await apiFetch<{ activities: LoginActivityItem[]; pagination: Pagination }>(`/api/auth/activity?limit=20&offset=${offset}`)

      if (append) {
        setActivities(prev => [...prev, ...data.activities])
      } else {
        setActivities(data.activities || [])
      }
      setPagination(data.pagination)
    } catch (err) {
      console.error('Error fetching login activity:', err)
      setError('Failed to load login activity')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  const loadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchActivities(pagination.offset + pagination.limit, true)
    }
  }

  const getEventIcon = (eventType: LoginEventType) => {
    switch (eventType) {
      case 'login_success':
        return <LogIn className="h-4 w-4 text-green-500" />
      case 'login_failed':
        return <XCircle className="h-4 w-4 text-destructive" />
      case 'logout':
        return <LogOut className="h-4 w-4 text-muted-foreground" />
      case 'password_reset':
      case 'password_changed':
        return <Key className="h-4 w-4 text-primary" />
      case 'mfa_challenge':
      case 'mfa_verified':
        return <Shield className="h-4 w-4 text-primary" />
      case 'mfa_failed':
        return <Shield className="h-4 w-4 text-destructive" />
      case 'account_locked':
        return <Lock className="h-4 w-4 text-destructive" />
      case 'account_unlocked':
        return <Unlock className="h-4 w-4 text-green-500" />
      default:
        return <History className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getEventLabel = (eventType: LoginEventType): string => {
    const labels: Record<LoginEventType, string> = {
      login_success: 'Signed in',
      login_failed: 'Sign in failed',
      logout: 'Signed out',
      password_reset: 'Password reset requested',
      password_changed: 'Password changed',
      mfa_challenge: 'MFA challenge sent',
      mfa_verified: 'MFA verified',
      mfa_failed: 'MFA verification failed',
      account_locked: 'Account locked',
      account_unlocked: 'Account unlocked',
    }
    return labels[eventType] || eventType
  }

  const getEventBadge = (eventType: LoginEventType) => {
    const isError = ['login_failed', 'mfa_failed', 'account_locked'].includes(eventType)
    const isSuccess = ['login_success', 'mfa_verified', 'account_unlocked'].includes(eventType)

    if (isError) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          {getEventLabel(eventType)}
        </Badge>
      )
    }

    if (isSuccess) {
      return (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
          {getEventLabel(eventType)}
        </Badge>
      )
    }

    return (
      <Badge variant="outline">
        {getEventLabel(eventType)}
      </Badge>
    )
  }

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-3 w-3" />
      case 'tablet':
        return <Tablet className="h-3 w-3" />
      default:
        return <Monitor className="h-3 w-3" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  const getDeviceString = (activity: LoginActivityItem) => {
    const parts = []
    if (activity.browser) {
      parts.push(activity.browser + (activity.browser_version ? ` ${activity.browser_version}` : ''))
    }
    if (activity.os) {
      parts.push(activity.os + (activity.os_version ? ` ${activity.os_version}` : ''))
    }
    return parts.length > 0 ? parts.join(' on ') : 'Unknown device'
  }

  const getLocationString = (activity: LoginActivityItem) => {
    const parts = []
    if (activity.location_city) parts.push(activity.location_city)
    if (activity.location_region) parts.push(activity.location_region)
    if (activity.location_country) parts.push(activity.location_country)
    return parts.length > 0 ? parts.join(', ') : null
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Login Activity
            </CardTitle>
            <CardDescription>
              Review recent sign-in activity and security events
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchActivities()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert className="bg-destructive/10 border-destructive">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">{error}</AlertDescription>
          </Alert>
        )}

        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No login activity found
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5">
                  {getEventIcon(activity.event_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getEventBadge(activity.event_type)}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(activity.created_at)}
                    </span>
                  </div>

                  <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
                    {getDeviceIcon(activity.device_type)}
                    <span className="truncate">{getDeviceString(activity)}</span>
                  </div>

                  <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                    {getLocationString(activity) && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {getLocationString(activity)}
                      </span>
                    )}
                    {activity.ip_address && (
                      <span>IP: {activity.ip_address}</span>
                    )}
                  </div>

                  {activity.failure_reason && (
                    <p className="mt-1 text-xs text-destructive">
                      Reason: {activity.failure_reason}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {pagination && pagination.hasMore && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Load more
                </>
              )}
            </Button>
          </div>
        )}

        {pagination && (
          <p className="text-xs text-muted-foreground text-center">
            Showing {activities.length} of {pagination.total} events
          </p>
        )}
      </CardContent>
    </Card>
  )
}
