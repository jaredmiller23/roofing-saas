'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, MapPin, ExternalLink, User } from 'lucide-react'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Event {
  id: string
  title: string
  event_type: string
  start_at: string
  end_at: string
  status: string
  location: string | null
  all_day: boolean
  description: string | null
  created_at: string
  organizer: string | null
}

interface TeamMember {
  id: string
  full_name: string
}

interface EventsTableProps {
  params: { [key: string]: string | string[] | undefined }
}

export function EventsTable({ params }: EventsTableProps) {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(parseInt((params.page as string) || '1'))
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])

  // Fetch team members for displaying organizer names
  useEffect(() => {
    async function fetchTeamMembers() {
      try {
        const data = await apiFetch<{ members: TeamMember[] }>('/api/team-members')
        setTeamMembers(data.members || [])
      } catch (err) {
        console.error('Failed to fetch team members:', err)
      }
    }
    fetchTeamMembers()
  }, [])

  // Get organizer name from team members
  const getOrganizerName = (organizerId: string | null) => {
    if (!organizerId) return null
    const member = teamMembers.find((m) => m.id === organizerId)
    return member?.full_name || 'Unknown'
  }

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true)
      setError(null)

      try {
        const queryParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value && typeof value === 'string') {
            queryParams.set(key, value)
          }
        })

        const { data: eventsList, pagination } = await apiFetchPaginated<Event[]>(
          `/api/events?${queryParams.toString()}`
        )
        setEvents(eventsList)
        setTotal(pagination.total)
        setPage(pagination.page)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [params])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      await apiFetch<void>(`/api/events/${id}`, { method: 'DELETE' })
      router.refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete event')
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-muted text-muted-foreground',
      no_show: 'bg-orange-100 text-orange-800',
    }
    return badges[status as keyof typeof badges] || 'bg-muted text-muted-foreground'
  }

  const getEventTypeBadge = (type: string) => {
    const badges = {
      appointment: 'bg-blue-100 text-blue-800',
      inspection: 'bg-purple-100 text-purple-800',
      adjuster_meeting: 'bg-green-100 text-green-800',
      crew_meeting: 'bg-yellow-100 text-yellow-800',
      follow_up: 'bg-orange-100 text-orange-800',
      callback: 'bg-pink-100 text-pink-800',
      estimate: 'bg-indigo-100 text-indigo-800',
      other: 'bg-muted text-muted-foreground',
    }
    return badges[type as keyof typeof badges] || 'bg-muted text-muted-foreground'
  }

  const formatDateTime = (dateStr: string, allDay: boolean) => {
    const date = new Date(dateStr)
    if (allDay) {
      return date.toLocaleDateString()
    }
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-2 text-sm font-medium text-foreground">No events</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started by scheduling an event.
        </p>
        <div className="mt-6">
          <Link
            href="/events/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90"
          >
            + Schedule Event
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card shadow-sm rounded-lg border border-border">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Assigned To
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Start
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {events.map((event) => (
              <tr
                key={event.id}
                className="hover:bg-accent cursor-pointer"
                onClick={() => router.push(`/events/${event.id}`)}
              >
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-foreground">{event.title}</div>
                      {event.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-xs">
                          {event.description}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEventTypeBadge(event.event_type)}`}>
                    {event.event_type?.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {event.organizer ? (
                    <div className="flex items-center text-sm text-foreground">
                      <User className="h-4 w-4 text-muted-foreground mr-2" />
                      {getOrganizerName(event.organizer)}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center text-sm text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                    {formatDateTime(event.start_at, event.all_day)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {event.location ? (
                    <div className="flex items-center text-sm text-foreground">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="truncate max-w-xs">{event.location}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(event.status)}`}>
                    {event.status?.replace('_', ' ')}
                  </span>
                </td>
                <td
                  className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link
                    href={`/events/${event.id}`}
                    className="text-primary hover:text-primary/80 mr-4"
                  >
                    <ExternalLink className="h-4 w-4 inline" />
                  </Link>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 10 && (
        <div className="bg-card px-4 py-3 flex items-center justify-between border-t border-border sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => router.push(`/events?page=${page - 1}`)}
              disabled={page === 1}
              className="relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => router.push(`/events?page=${page + 1}`)}
              disabled={page * 10 >= total}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-muted-foreground bg-card hover:bg-accent disabled:opacity-50"
            >
              Next
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium">{(page - 1) * 10 + 1}</span> to{' '}
                <span className="font-medium">{Math.min(page * 10, total)}</span> of{' '}
                <span className="font-medium">{total}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <button
                  onClick={() => router.push(`/events?page=${page - 1}`)}
                  disabled={page === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => router.push(`/events?page=${page + 1}`)}
                  disabled={page * 10 >= total}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-border bg-card text-sm font-medium text-muted-foreground hover:bg-accent disabled:opacity-50"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
