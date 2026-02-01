'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { apiFetch } from '@/lib/api/client'
import { StandardCalendar } from './StandardCalendar'

interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
}

interface CalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  description?: string
  location?: string
  event_type?: string
}

interface OAuthState {
  googleConnected: boolean
  googleError: string | null
  email: string | null
  processed: boolean
}

interface GoogleCalendarProps {
  onDisconnect?: () => void
  initialOAuthState?: OAuthState
}

export function GoogleCalendar({ onDisconnect, initialOAuthState }: GoogleCalendarProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)

  const fetchEvents = useCallback(async (range?: Date[] | { start: Date; end: Date }) => {
    setIsLoadingEvents(true)
    setError(null)
    try {
      let timeMin: string
      let timeMax: string

      if (range) {
        if (Array.isArray(range)) {
          timeMin = range[0].toISOString()
          timeMax = range[range.length - 1].toISOString()
        } else {
          timeMin = range.start.toISOString()
          timeMax = range.end.toISOString()
        }
      } else {
        const now = new Date()
        timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
      }

      const data = await apiFetch<{
        connected: boolean
        events: GoogleCalendarEvent[]
        error?: string
      }>(`/api/calendar/google/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)

      if (!data.connected) {
        setIsConnected(false)
        setError(data.error || 'Connection lost. Please reconnect.')
        setEvents([])
        return
      }

      const calendarEvents: CalendarEvent[] = data.events.map((event) => {
        const isAllDay = !event.start.dateTime
        const startDate = event.start.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start.date + 'T00:00:00')
        const endDate = event.end.dateTime
          ? new Date(event.end.dateTime)
          : new Date(event.end.date + 'T23:59:59')

        return {
          id: event.id || `google-${Date.now()}-${Math.random()}`,
          title: event.summary || '(No title)',
          start: startDate,
          end: endDate,
          allDay: isAllDay,
          description: event.description,
          location: event.location,
          event_type: 'google',
        }
      })

      setEvents(calendarEvents)
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err)
      setError('Failed to load events. Please try refreshing.')
    } finally {
      setIsLoadingEvents(false)
    }
  }, [])

  const checkGoogleConnection = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await apiFetch<{
        connected: boolean
        googleEmail?: string
        needsRefresh?: boolean
      }>('/api/calendar/google/status')

      if (data.connected) {
        setIsConnected(true)
        setGoogleEmail(data.googleEmail || null)
        await fetchEvents()
      } else {
        setIsConnected(false)
      }
    } catch (err) {
      console.error('Error checking Google Calendar connection:', err)
      setError('Failed to check connection status. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }, [fetchEvents])

  // Handle OAuth state from parent or check connection
  useEffect(() => {
    // Wait for OAuth param processing to complete before doing anything
    // This prevents a race condition where checkGoogleConnection() is called
    // before we know if OAuth params exist in the URL
    if (!initialOAuthState?.processed) {
      return
    }

    // If OAuth just completed successfully, trust it and fetch events
    if (initialOAuthState.googleConnected) {
      setIsConnected(true)
      if (initialOAuthState.email) {
        setGoogleEmail(initialOAuthState.email)
      }
      setIsLoading(false)
      fetchEvents()
      return
    }

    // If OAuth returned an error, show it
    if (initialOAuthState.googleError) {
      setError(`Google Calendar: ${initialOAuthState.googleError}`)
      setIsLoading(false)
      return
    }

    // No OAuth params - check connection status normally
    checkGoogleConnection()
  }, [initialOAuthState, checkGoogleConnection, fetchEvents])

  const handleConnect = () => {
    setIsLoading(true)
    setError(null)
    window.location.href = '/api/calendar/google/connect'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      await apiFetch('/api/calendar/google/disconnect', { method: 'POST' })
      setIsConnected(false)
      setEvents([])
      setGoogleEmail(null)
      if (onDisconnect) {
        onDisconnect()
      }
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      setError('Failed to disconnect Google Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchEvents()
  }

  if (isLoading && !isConnected) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    )
  }

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {error ? 'Google Calendar Connection Issue' : 'Connect Google Calendar'}
          </CardTitle>
          <CardDescription>
            {error
              ? 'Your Google Calendar connection needs to be refreshed'
              : 'Sync your events with Google Calendar for seamless scheduling across all your devices'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!error && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Benefits of connecting Google Calendar:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
                <li>Automatic two-way sync of events</li>
                <li>Access your schedule on any device</li>
                <li>Get notifications on your phone</li>
                <li>Share calendars with your team</li>
              </ul>
            </div>
          )}

          <Button
            onClick={handleConnect}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                {error ? 'Reconnect Google Calendar' : 'Connect Google Calendar'}
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            {error
              ? 'This will re-authorize your Google Calendar connection'
              : 'Note: Google Calendar integration requires additional setup. Contact your administrator if you encounter issues.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-full">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Google Calendar Connected</p>
            <p className="text-sm text-muted-foreground">
              {googleEmail ? `Connected as ${googleEmail}` : 'Your events are syncing'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingEvents}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingEvents ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDisconnect}
            disabled={isLoading}
          >
            Disconnect
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoadingEvents && events.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Loading events...</span>
          </CardContent>
        </Card>
      ) : (
        <StandardCalendar
          events={events}
          onRangeChange={fetchEvents}
        />
      )}
    </div>
  )
}
