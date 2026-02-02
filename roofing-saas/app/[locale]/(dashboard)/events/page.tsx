'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { EventsTable } from '@/components/events/events-table'
import { Calendar, List } from 'lucide-react'
import { apiFetchPaginated } from '@/lib/api/client'

interface PageCalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  description?: string
  location?: string
  event_type?: string
  status?: string
  contact_id?: string
  project_id?: string
}

// Lazy load calendar components to reduce initial bundle
const StandardCalendar = dynamic(() => import('@/components/calendar/StandardCalendar').then(mod => ({ default: mod.StandardCalendar })), {
  loading: () => <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center"><span className="text-muted-foreground">Loading calendar...</span></div>,
  ssr: false
})

const GoogleCalendar = dynamic(() => import('@/components/calendar/GoogleCalendar').then(mod => ({ default: mod.GoogleCalendar })), {
  loading: () => <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center"><span className="text-muted-foreground">Loading calendar...</span></div>,
  ssr: false
})

/**
 * Wrapper component that handles OAuth URL params with proper Suspense boundary.
 * This is required because useSearchParams() must be used within a Suspense boundary in Next.js 13+.
 */
function GoogleCalendarWithParams({ onDisconnect }: { onDisconnect: () => void }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname() // Preserves locale prefix like /en/events

  const [oauthParams, setOauthParams] = useState<{
    googleConnected: boolean
    googleError: string | null
    email: string | null
    processed: boolean
  }>({ googleConnected: false, googleError: null, email: null, processed: false })

  useEffect(() => {
    if (oauthParams.processed) return

    const googleConnected = searchParams.get('google_connected') === 'true'
    const googleError = searchParams.get('google_error')
    const email = searchParams.get('email')

    if (googleConnected || googleError) {
      setOauthParams({
        googleConnected,
        googleError: googleError ? decodeURIComponent(googleError) : null,
        email: email ? decodeURIComponent(email) : null,
        processed: true
      })
      // Use current pathname to preserve locale prefix
      router.replace(pathname, { scroll: false })
    } else {
      setOauthParams(prev => ({ ...prev, processed: true }))
    }
  }, [searchParams, router, pathname, oauthParams.processed])

  return (
    <GoogleCalendar
      onDisconnect={onDisconnect}
      initialOAuthState={oauthParams}
    />
  )
}

/**
 * Events page with calendar view
 *
 * Features:
 * - Calendar view of all events and appointments
 * - Google Calendar integration with fallback
 * - Schedule inspections and meetings
 * - Track adjuster meetings and callbacks
 * - Set reminders and notifications
 */
export default function EventsPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [calendarType, setCalendarType] = useState<'standard' | 'google'>('standard')
  const [events, setEvents] = useState<PageCalendarEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
    // Check user preference for calendar type
    const savedCalendarType = localStorage.getItem('calendarType')
    if (savedCalendarType === 'google') {
      setCalendarType('google')
    }
  }, [])

  const fetchEvents = async (range?: Date[] | { start: Date; end: Date }) => {
    setIsLoading(true)
    try {
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

      // Build URL with date range if provided
      let url = '/api/events?limit=100' // Increase limit for calendar view
      if (range) {
        let startAfter: string
        let endBefore: string
        if (Array.isArray(range)) {
          // Array of dates (e.g., week view gives [Sun, Mon, Tue, ...])
          startAfter = range[0].toISOString()
          endBefore = range[range.length - 1].toISOString()
        } else {
          // Object with start/end (e.g., month view)
          startAfter = range.start.toISOString()
          endBefore = range.end.toISOString()
        }
        url += `&start_after=${encodeURIComponent(startAfter)}&end_before=${encodeURIComponent(endBefore)}`
      } else {
        // Default to current month if no range specified
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
        url += `&start_after=${encodeURIComponent(startOfMonth.toISOString())}&end_before=${encodeURIComponent(endOfMonth.toISOString())}`
      }

      const { data: eventsList } = await apiFetchPaginated<ApiEvent[]>(url)

      // Transform events for calendar
      const calendarEvents: PageCalendarEvent[] = eventsList.map((event) => ({
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

      setEvents(calendarEvents)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCalendarTypeChange = (type: 'standard' | 'google') => {
    setCalendarType(type)
    localStorage.setItem('calendarType', type)
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events & Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Manage appointments, inspections, and meetings
            </p>
          </div>

          <Link
            href="/events/new"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium"
          >
            + Schedule Event
          </Link>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-6">
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

          {view === 'calendar' && (
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => handleCalendarTypeChange('standard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  calendarType === 'standard'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Standard Calendar
              </button>
              <button
                onClick={() => handleCalendarTypeChange('google')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  calendarType === 'google'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Google Calendar
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        {view === 'calendar' ? (
          <div className="mt-6">
            {calendarType === 'google' ? (
              <Suspense fallback={
                <div className="h-[600px] bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">Loading calendar...</span>
                </div>
              }>
                <GoogleCalendarWithParams onDisconnect={() => handleCalendarTypeChange('standard')} />
              </Suspense>
            ) : (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                    <div className="text-muted-foreground">Loading events...</div>
                  </div>
                )}
                <StandardCalendar
                  events={events}
                  onRangeChange={fetchEvents}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-6">
            <EventsTable params={{}} />
          </div>
        )}
      </div>
    </div>
  )
}
