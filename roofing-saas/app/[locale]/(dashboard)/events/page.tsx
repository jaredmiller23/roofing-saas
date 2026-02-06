'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, Link } from '@/lib/i18n/navigation'
import { useSearchParams, usePathname } from 'next/navigation'
import { EventsTable } from '@/components/events/events-table'
import { Calendar, List, Loader2, AlertCircle, RefreshCw, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'
import type { CalendarEvent } from '@/components/calendar/StandardCalendar'

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

// Lazy load calendar component
const StandardCalendar = dynamic(() => import('@/components/calendar/StandardCalendar').then(mod => ({ default: mod.StandardCalendar })), {
  loading: () => <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center"><span className="text-muted-foreground">Loading calendar...</span></div>,
  ssr: false
})

// Helper: convert Date to datetime-local format (YYYY-MM-DDTHH:mm)
function toDateTimeLocal(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

/**
 * Inner component that handles searchParams (needs Suspense boundary)
 */
function EventsPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false)

  // Google Calendar connection state
  const [googleConnected, setGoogleConnected] = useState(false)
  const [googleEmail, setGoogleEmail] = useState<string | null>(null)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  // Google event create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newTitle, setNewTitle] = useState('')
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [newAllDay, setNewAllDay] = useState(false)

  // Event detail dialog (for Google events)
  const [selectedGoogleEvent, setSelectedGoogleEvent] = useState<CalendarEvent | null>(null)

  // Track current range for refetch
  const [currentRange, setCurrentRange] = useState<Date[] | { start: Date; end: Date } | null>(null)

  // OAuth callback param handling
  const [oauthProcessed, setOauthProcessed] = useState(false)

  useEffect(() => {
    if (oauthProcessed) return

    const connected = searchParams.get('google_connected') === 'true'
    const error = searchParams.get('google_error')
    const email = searchParams.get('email')

    if (connected || error) {
      if (connected) {
        setGoogleConnected(true)
        if (email) setGoogleEmail(decodeURIComponent(email))
      }
      if (error) {
        setGoogleError(decodeURIComponent(error))
      }
      setOauthProcessed(true)
      // Clean URL params
      router.replace(pathname, { scroll: false })
    } else {
      setOauthProcessed(true)
    }
  }, [searchParams, router, pathname, oauthProcessed])

  // Check Google Calendar connection on mount
  useEffect(() => {
    if (!oauthProcessed) return
    // Skip status check if OAuth just told us we're connected
    if (googleConnected) return

    apiFetch<{ connected: boolean; googleEmail?: string }>('/api/calendar/google/status')
      .then((data) => {
        setGoogleConnected(data.connected)
        if (data.googleEmail) setGoogleEmail(data.googleEmail)
      })
      .catch(() => {
        // Silently fail — Google not connected
      })
  }, [oauthProcessed, googleConnected])

  // Fetch local events
  const fetchLocalEvents = useCallback(async (range?: Date[] | { start: Date; end: Date }): Promise<CalendarEvent[]> => {
    interface ApiEvent {
      id: string
      title: string
      start_at: string
      end_at: string
      all_day?: boolean
      description?: string | null
      location?: string | null
      event_type?: string | null
      status?: string | null
      contact_id?: string | null
      project_id?: string | null
    }

    let url = '/api/events?limit=100'
    if (range) {
      let startAfter: string
      let endBefore: string
      if (Array.isArray(range)) {
        startAfter = range[0].toISOString()
        endBefore = range[range.length - 1].toISOString()
      } else {
        startAfter = range.start.toISOString()
        endBefore = range.end.toISOString()
      }
      url += `&start_after=${encodeURIComponent(startAfter)}&end_before=${encodeURIComponent(endBefore)}`
    } else {
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      url += `&start_after=${encodeURIComponent(startOfMonth.toISOString())}&end_before=${encodeURIComponent(endOfMonth.toISOString())}`
    }

    const { data: eventsList } = await apiFetchPaginated<ApiEvent[]>(url)

    return eventsList.map((event) => ({
      id: event.id,
      title: event.title,
      start: new Date(event.start_at),
      end: new Date(event.end_at),
      allDay: event.all_day || false,
      description: event.description || undefined,
      location: event.location || undefined,
      event_type: event.event_type || undefined,
      status: event.status || undefined,
      contact_id: event.contact_id || undefined,
      project_id: event.project_id || undefined,
    }))
  }, [])

  // Fetch Google Calendar events
  const fetchGoogleEvents = useCallback(async (range?: Date[] | { start: Date; end: Date }): Promise<CalendarEvent[]> => {
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
      setGoogleConnected(false)
      if (data.error) setGoogleError(data.error)
      return []
    }

    return data.events.map((event) => {
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
  }, [])

  // Fetch all events (both sources in parallel)
  const fetchAllEvents = useCallback(async (range?: Date[] | { start: Date; end: Date }) => {
    setIsLoading(true)
    if (range) setCurrentRange(range)

    try {
      // Always fetch local events
      const localPromise = fetchLocalEvents(range)

      // Fetch Google events if connected
      let googlePromise: Promise<CalendarEvent[]> = Promise.resolve([])
      if (googleConnected) {
        setIsLoadingGoogle(true)
        googlePromise = fetchGoogleEvents(range).catch((err) => {
          console.error('Error fetching Google Calendar events:', err)
          return [] // Graceful degradation — show local events even if Google fails
        })
      }

      const [localEvents, googleEvents] = await Promise.all([localPromise, googlePromise])
      setEvents([...localEvents, ...googleEvents])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
      setIsLoadingGoogle(false)
    }
  }, [fetchLocalEvents, fetchGoogleEvents, googleConnected])

  // Initial fetch when OAuth params are processed
  useEffect(() => {
    if (!oauthProcessed) return
    fetchAllEvents()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthProcessed, googleConnected])

  // Refetch when Google connection state changes (after connect/disconnect)
  const refetchAll = useCallback(() => {
    fetchAllEvents(currentRange || undefined)
  }, [fetchAllEvents, currentRange])

  // Google Calendar handlers
  const handleGoogleConnect = () => {
    setIsConnecting(true)
    setGoogleError(null)
    window.location.href = '/api/calendar/google/connect'
  }

  const handleGoogleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Calendar?')) return

    setIsConnecting(true)
    setGoogleError(null)
    try {
      await apiFetch('/api/calendar/google/disconnect', { method: 'POST' })
      setGoogleConnected(false)
      setGoogleEmail(null)
      // Remove Google events from merged array
      setEvents(prev => prev.filter(e => e.event_type !== 'google'))
    } catch (err) {
      console.error('Error disconnecting Google Calendar:', err)
      setGoogleError('Failed to disconnect Google Calendar')
    } finally {
      setIsConnecting(false)
    }
  }

  // Slot select handler
  const handleSlotSelect = (slotInfo: { start: Date; end: Date }) => {
    if (googleConnected) {
      // Open Google create dialog
      let start = slotInfo.start
      let end = slotInfo.end
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
    } else {
      // Navigate to local event creation
      const startISO = slotInfo.start.toISOString()
      const endISO = slotInfo.end.toISOString()
      router.push(`/events/new?start=${startISO}&end=${endISO}`)
    }
  }

  // Event click handler
  const handleEventClick = (event: CalendarEvent) => {
    if (event.event_type === 'google') {
      setSelectedGoogleEvent(event)
    } else {
      router.push(`/events/${event.id}`)
    }
  }

  // Create Google event
  const handleCreateGoogleEvent = async () => {
    if (!newTitle.trim() || !newStart || !newEnd) return

    setIsCreating(true)
    setCreateError(null)
    try {
      const body: Record<string, unknown> = {
        summary: newTitle.trim(),
        allDay: newAllDay,
        description: newDescription.trim() || undefined,
        location: newLocation.trim() || undefined,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }

      if (newAllDay) {
        body.start = newStart.split('T')[0]
        body.end = newEnd.split('T')[0]
      } else {
        body.start = new Date(newStart).toISOString()
        body.end = new Date(newEnd).toISOString()
      }

      await apiFetch('/api/calendar/google/events', {
        method: 'POST',
        body,
      })
      setShowCreateDialog(false)
      setCreateError(null)
      refetchAll()
    } catch (err) {
      console.error('Error creating Google Calendar event:', err)
      setCreateError('Failed to create event. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events &amp; Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Manage appointments, inspections, and meetings
            </p>
          </div>

          {googleConnected && view === 'calendar' ? (
            <p className="text-sm text-muted-foreground italic">
              Click a time slot to create a Google Calendar event
            </p>
          ) : (
            <Link
              href="/events/new"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
            >
              + Schedule Event
            </Link>
          )}
        </div>

        {/* View Toggle + Google Connection */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'calendar'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Calendar View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'list'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="h-4 w-4" />
              List View
            </button>
          </div>

          {/* Google Calendar connection indicator */}
          {view === 'calendar' && (
            googleConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-secondary" />
                  <span className="text-muted-foreground">
                    {googleEmail ? `Google: ${googleEmail}` : 'Google Calendar connected'}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refetchAll}
                  disabled={isLoadingGoogle}
                  className="h-8 px-2"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingGoogle ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoogleDisconnect}
                  disabled={isConnecting}
                  className="h-8 text-muted-foreground hover:text-foreground"
                >
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGoogleConnect}
                disabled={isConnecting}
                className="gap-2"
              >
                {isConnecting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Calendar className="h-3.5 w-3.5" />
                )}
                Connect Google Calendar
              </Button>
            )
          )}
        </div>

        {/* Google error banner */}
        {googleError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{googleError}</AlertDescription>
          </Alert>
        )}

        {/* Content */}
        {view === 'calendar' ? (
          <div className="mt-6 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <span className="text-muted-foreground">Loading events...</span>
              </div>
            )}
            <StandardCalendar
              events={events}
              onEventClick={handleEventClick}
              onSlotSelect={handleSlotSelect}
              onRangeChange={fetchAllEvents}
            />
          </div>
        ) : (
          <div className="mt-6">
            <EventsTable params={{}} />
          </div>
        )}
      </div>

      {/* Google event detail dialog */}
      <Dialog open={!!selectedGoogleEvent} onOpenChange={(open) => !open && setSelectedGoogleEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedGoogleEvent?.title}</DialogTitle>
          </DialogHeader>
          {selectedGoogleEvent && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  {selectedGoogleEvent.start.toLocaleString()} &mdash; {selectedGoogleEvent.end.toLocaleString()}
                </span>
              </div>
              {selectedGoogleEvent.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{selectedGoogleEvent.location}</span>
                </div>
              )}
              {selectedGoogleEvent.description && (
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedGoogleEvent.description}</p>
              )}
              <p className="text-xs text-muted-foreground italic">This event is from Google Calendar</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Google event create dialog */}
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

/**
 * Events page with unified calendar view
 *
 * Shows all events (local + Google Calendar) in a single merged calendar.
 * Google Calendar events appear in teal; local events use their type-based colors.
 */
export default function EventsPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
            <span className="text-muted-foreground">Loading calendar...</span>
          </div>
        </div>
      </div>
    }>
      <EventsPageInner />
    </Suspense>
  )
}
