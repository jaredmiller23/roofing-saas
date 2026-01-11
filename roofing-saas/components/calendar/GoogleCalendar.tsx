'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Loader2, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GoogleCalendarProps {
  onDisconnect?: () => void
}

export function GoogleCalendar({ onDisconnect }: GoogleCalendarProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [calendarUrl, setCalendarUrl] = useState<string | null>(null)

  useEffect(() => {
    checkGoogleConnection()
  }, [])

  const checkGoogleConnection = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/google/status')
      const data = await response.json()

      if (data.connected) {
        setIsConnected(true)
        // If user has a public calendar URL, we can embed it
        if (data.calendarUrl) {
          setCalendarUrl(data.calendarUrl)
        }
      }
    } catch (err) {
      console.error('Error checking Google Calendar connection:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConnect = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Initiate OAuth flow with Supabase
      const response = await fetch('/api/calendar/google/connect', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl
      } else {
        setError('Failed to initiate Google Calendar connection')
      }
    } catch (err) {
      console.error('Error connecting Google Calendar:', err)
      setError('An error occurred while connecting to Google Calendar')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/calendar/google/disconnect', {
        method: 'POST'
      })

      if (response.ok) {
        setIsConnected(false)
        setCalendarUrl(null)
        if (onDisconnect) {
          onDisconnect()
        }
      }
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      setError('Failed to disconnect Google Calendar')
    } finally {
      setIsLoading(false)
    }
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
            Connect Google Calendar
          </CardTitle>
          <CardDescription>
            Sync your events with Google Calendar for seamless scheduling across all your devices
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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
                Connect Google Calendar
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Note: Google Calendar integration requires additional setup. Contact your administrator if you encounter issues.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Connected Status */}
      <div className="flex items-center justify-between bg-primary/10 border border-primary/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-full">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Google Calendar Connected</p>
            <p className="text-sm text-muted-foreground">Your events are syncing automatically</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          disabled={isLoading}
        >
          Disconnect
        </Button>
      </div>

      {/* Embedded Calendar or Message */}
      {calendarUrl ? (
        <div className="bg-card rounded-lg shadow-sm overflow-hidden">
          <iframe
            src={calendarUrl}
            style={{ border: 0 }}
            width="100%"
            height="700"
            frameBorder="0"
            scrolling="no"
            title="Google Calendar"
            className="w-full"
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">
              Google Calendar is connected
            </p>
            <p className="text-sm text-muted-foreground">
              Events will sync automatically. View your calendar in the standard view below or in Google Calendar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
