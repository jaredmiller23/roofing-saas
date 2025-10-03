'use client'

import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation' // TODO: Use for navigation
import Link from 'next/link'
import { EventsTable } from '@/components/events/events-table'
import { StandardCalendar } from '@/components/calendar/StandardCalendar'
import { GoogleCalendar } from '@/components/calendar/GoogleCalendar'
import { Calendar, List } from 'lucide-react'

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
  // const router = useRouter() // TODO: Use for navigation
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [calendarType, setCalendarType] = useState<'standard' | 'google'>('standard')
  const [events, setEvents] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
    // Check user preference for calendar type
    const savedCalendarType = localStorage.getItem('calendarType')
    if (savedCalendarType === 'google') {
      setCalendarType('google')
    }
  }, [])

  const fetchEvents = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/events')
      const data = await response.json()

      // Transform events for calendar
      const calendarEvents = data.events?.map((event: Record<string, unknown>) => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start_at as string),
        end: new Date(event.end_at as string),
        allDay: event.all_day || false,
        description: event.description,
        location: event.location,
        event_type: event.event_type,
        status: event.status,
        contact_id: event.contact_id,
        project_id: event.project_id
      })) || []

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
            <h1 className="text-3xl font-bold text-gray-900">Events & Calendar</h1>
            <p className="text-gray-600 mt-1">
              Manage appointments, inspections, and meetings
            </p>
          </div>

          <Link
            href="/events/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Schedule Event
          </Link>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Calendar className="h-4 w-4" />
              Calendar View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                view === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
              List View
            </button>
          </div>

          {view === 'calendar' && (
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => handleCalendarTypeChange('standard')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  calendarType === 'standard'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Standard Calendar
              </button>
              <button
                onClick={() => handleCalendarTypeChange('google')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  calendarType === 'google'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
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
              <GoogleCalendar onDisconnect={() => handleCalendarTypeChange('standard')} />
            ) : (
              isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="text-gray-600">Loading calendar...</div>
                </div>
              ) : (
                <StandardCalendar
                  events={events}
                  onRangeChange={fetchEvents}
                />
              )
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
