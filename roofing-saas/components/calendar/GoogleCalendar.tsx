'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Calendar, Loader2, AlertCircle, RefreshCw, Clock, MapPin } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DateTimePicker } from '@/components/ui/date-time-picker'
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
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  // Create event form state
  const [newTitle, setNewTitle] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newAllDay, setNewAllDay] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Helper: convert Date to datetime-local format (YYYY-MM-DDTHH:mm)
  const toDateTimeLocal = (d: Date): string => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const openCreateDialog = (slot: { start: Date; end: Date }) => {
    // Default to sensible times: if slot is midnight (month view click), use 9:00-10:00
    let start = slot.start
    let end = slot.end
    if (start.getHours() === 0 && start.getMinutes() === 0 &&
        (end.getHours() === 0 || end.getDate() !== start.getDate())) {
      start = new Date(start)
      start.setHours(9, 0, 0)
      end = new Date(start)
      end.setHours(10, 0, 0)
    }
    setNewTitle('')
    setNewStart(toDateTimeLocal(start))
    setNewEnd(toDateTimeLocal(end))
    setNewDescription('')
    setNewLocation('')
    setNewAllDay(false)
    setCreateError(null)
    setShowCreateDialog(true)
  }

  const handleCreateGoogleEvent = async () => {
    if (!newTitle.trim() || !newStart || !newEnd) return

    setIsCreating(true)
    setCreateError(null)
    try {
      // For all-day events, send raw YYYY-MM-DD dates (not UTC-converted ISO strings)
      // This prevents timezone offset causing wrong-day bugs in non-US timezones
      const body: Record<string, unknown> = {
        summary: newTitle.trim(),
        allDay: newAllDay,
        description: newDescription.trim() || undefined,
        location: newLocation.trim() || undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }

      if (newAllDay) {
        // Send raw date strings for all-day events
        body.start = newStart.split('T')[0]
        body.end = newEnd.split('T')[0]
      } else {
        // For timed events, send UTC ISO strings (Z suffix makes timezone unambiguous)
        body.start = new Date(newStart).toISOString()
        body.end = new Date(newEnd).toISOString()
      }

      await apiFetch('/api/calendar/google/events', {
        method: 'POST',
        body,
      })
      setShowCreateDialog(false)
      setCreateError(null)
      await fetchEvents()
    } catch (err) {
      console.error('Error creating Google Calendar event:', err)
      setCreateError('Failed to create event. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

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
        let startDate: Date
        let endDate: Date

        if (isAllDay) {
          // Google all-day events use EXCLUSIVE end dates:
          // An event on Feb 6 has end.date = '2026-02-07'
          // Subtract 1 day from end to get the inclusive last day for display
          startDate = new Date(event.start.date + 'T00:00:00')
          const exclusiveEnd = new Date(event.end.date + 'T00:00:00')
          exclusiveEnd.setDate(exclusiveEnd.getDate() - 1)
          endDate = new Date(exclusiveEnd.getFullYear(), exclusiveEnd.getMonth(), exclusiveEnd.getDate(), 23, 59, 59)
        } else {
          startDate = new Date(event.start.dateTime!)
          endDate = new Date(event.end.dateTime!)
        }

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

      <div className="relative">
        {isLoadingEvents && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
            <span className="text-muted-foreground">Loading events...</span>
          </div>
        )}
        <StandardCalendar
          events={events}
          onEventClick={(event) => setSelectedEvent(event)}
          onSlotSelect={(slot) => openCreateDialog(slot)}
          onRangeChange={fetchEvents}
        />
      </div>

      {/* View event detail dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {selectedEvent.start.toLocaleString()} &mdash; {selectedEvent.end.toLocaleString()}
                </span>
              </div>
              {selectedEvent.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedEvent.location}</span>
                </div>
              )}
              {selectedEvent.description && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedEvent.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create event dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && setShowCreateDialog(false)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Google Calendar Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {createError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Roof inspection at 123 Main St"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="event-allday"
                checked={newAllDay}
                onChange={(e) => setNewAllDay(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <Label htmlFor="event-allday" className="text-sm font-normal cursor-pointer">
                All-day event
              </Label>
            </div>

            {newAllDay ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Start Date</Label>
                  <Input
                    type="date"
                    value={newStart.split('T')[0]}
                    onChange={(e) => setNewStart(`${e.target.value}T00:00`)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">End Date</Label>
                  <Input
                    type="date"
                    value={newEnd.split('T')[0]}
                    onChange={(e) => setNewEnd(`${e.target.value}T23:59`)}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Start</Label>
                  <DateTimePicker
                    value={newStart}
                    onChange={setNewStart}
                    placeholder="Start date & time"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">End</Label>
                  <DateTimePicker
                    value={newEnd}
                    onChange={setNewEnd}
                    placeholder="End date & time"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. 123 Main St, Nashville, TN"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <textarea
                id="event-description"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Notes, details, or instructions..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button
              onClick={handleCreateGoogleEvent}
              disabled={isCreating || !newTitle.trim()}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Event'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
