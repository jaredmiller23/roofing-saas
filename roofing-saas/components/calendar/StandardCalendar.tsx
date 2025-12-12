'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import { useRouter } from 'next/navigation'

const locales = {
  'en-US': enUS,
}

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
})

interface CalendarEvent {
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

interface StandardCalendarProps {
  events: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onSlotSelect?: (slotInfo: { start: Date; end: Date }) => void
  onRangeChange?: (range: Date[] | { start: Date; end: Date }) => void
}

export function StandardCalendar({
  events,
  onEventClick,
  onSlotSelect,
  onRangeChange
}: StandardCalendarProps) {
  const router = useRouter()
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())

  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      if (onEventClick) {
        onEventClick(event)
      } else {
        router.push(`/events/${event.id}`)
      }
    },
    [onEventClick, router]
  )

  const handleSelectSlot = useCallback(
    (slotInfo: { start: Date; end: Date; action: string }) => {
      if (onSlotSelect) {
        onSlotSelect(slotInfo)
      } else {
        // Navigate to create event page with date pre-filled
        const startISO = slotInfo.start.toISOString()
        const endISO = slotInfo.end.toISOString()
        router.push(`/events/new?start=${startISO}&end=${endISO}`)
      }
    },
    [onSlotSelect, router]
  )

  // Event styling based on type and status
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3174ad' // default blue

    // Color by event type
    if (event.event_type === 'inspection') {
      backgroundColor = '#10b981' // green
    } else if (event.event_type === 'meeting') {
      backgroundColor = '#8b5cf6' // purple
    } else if (event.event_type === 'callback') {
      backgroundColor = '#f59e0b' // amber
    } else if (event.event_type === 'appointment') {
      backgroundColor = '#3b82f6' // blue
    } else if (event.event_type === 'deadline') {
      backgroundColor = '#ef4444' // red
    }

    // Dim if cancelled
    if (event.status === 'cancelled') {
      backgroundColor = '#9ca3af' // gray
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: event.status === 'cancelled' ? 0.6 : 1,
        color: 'white',
        border: '0px',
        display: 'block',
        fontSize: '13px',
        padding: '2px 5px'
      }
    }
  }, [])

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate)
  }, [])

  const handleViewChange = useCallback((newView: View) => {
    setView(newView)
  }, [])

  return (
    <div className="bg-card rounded-lg shadow-sm p-6">
      <div className="h-[700px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          date={date}
          onNavigate={handleNavigate}
          onView={handleViewChange}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          onRangeChange={onRangeChange}
          selectable
          eventPropGetter={eventStyleGetter}
          popup
          views={['month', 'week', 'day', 'agenda']}
          style={{ height: '100%' }}
          tooltipAccessor={(event) => event.description || event.title}
        />
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
          <span className="text-muted-foreground">Appointment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10b981' }} />
          <span className="text-muted-foreground">Inspection</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8b5cf6' }} />
          <span className="text-muted-foreground">Meeting</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f59e0b' }} />
          <span className="text-muted-foreground">Callback</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-muted-foreground">Deadline</span>
        </div>
      </div>
    </div>
  )
}
