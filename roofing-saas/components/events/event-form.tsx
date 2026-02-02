'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, MapPin, User } from 'lucide-react'
import { apiFetch } from '@/lib/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { AddressLookup } from '@/components/events/address-lookup'

interface TeamMember {
  id: string
  email: string
  first_name?: string
  last_name?: string
  full_name: string
  role: string
}

interface EventFormProps {
  event?: {
    id: string
    title: string
    description: string | null
    event_type: string | null
    start_at: string
    end_at: string
    all_day: boolean | null
    status: string | null
    location: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
    outcome: string | null
    outcome_notes: string | null
    organizer: string | null
  }
  // Initial start/end times from calendar click (ISO strings)
  initialStart?: string
  initialEnd?: string
}

export function EventForm({ event, initialStart, initialEnd }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)

  // Fetch team members for assignment dropdown
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const data = await apiFetch<{ members: TeamMember[] }>('/api/team-members')
        setTeamMembers(data.members || [])
      } catch (err) {
        console.error('Failed to fetch team members:', err)
      } finally {
        setLoadingMembers(false)
      }
    }
    fetchTeamMembers()
  }, [])

  // Format datetime for input (convert from ISO to datetime-local format)
  const formatDateTimeLocal = (isoString: string | null) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    event_type: event?.event_type || 'appointment',
    // Use event data first, then initial props from calendar click, then empty
    start_at: formatDateTimeLocal(event?.start_at || initialStart || null),
    end_at: formatDateTimeLocal(event?.end_at || initialEnd || null),
    all_day: event?.all_day || false,
    status: event?.status || 'scheduled',
    location: event?.location || '',
    address_street: event?.address_street || '',
    address_city: event?.address_city || '',
    address_state: event?.address_state || '',
    address_zip: event?.address_zip || '',
    outcome: event?.outcome || '',
    outcome_notes: event?.outcome_notes || '',
    organizer: event?.organizer || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = event
        ? `/api/events/${event.id}`
        : '/api/events'
      const method = event ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        organizer: formData.organizer || null,
      }

      await apiFetch(url, {
        method,
        body: payload,
      })

      router.push('/events')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Event Details */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Event Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="appointment">Appointment</option>
                <option value="inspection">Inspection</option>
                <option value="adjuster_meeting">Adjuster Meeting</option>
                <option value="crew_meeting">Crew Meeting</option>
                <option value="follow_up">Follow Up</option>
                <option value="callback">Callback</option>
                <option value="estimate">Estimate</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Assigned To
                </span>
              </label>
              <select
                value={formData.organizer}
                onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loadingMembers}
              >
                <option value="">
                  {loadingMembers ? 'Loading...' : 'Select team member'}
                </option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.full_name} ({member.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Event description..."
            />
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Date & Time</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.all_day}
              onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
              className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <label className="ml-2 block text-sm text-foreground">
              All Day Event
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Start *
              </label>
              <DateTimePicker
                value={formData.start_at}
                onChange={(value) => setFormData({ ...formData, start_at: value })}
                placeholder="Select start date & time"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                End *
              </label>
              <DateTimePicker
                value={formData.end_at}
                onChange={(value) => setFormData({ ...formData, end_at: value })}
                placeholder="Select end date & time"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Location</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Quick fill from contact or project */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Quick Fill
            </label>
            <AddressLookup
              onSelect={(address) => {
                setFormData({
                  ...formData,
                  location: address.location,
                  address_street: address.address_street,
                  address_city: address.address_city,
                  address_state: address.address_state,
                  address_zip: address.address_zip,
                })
              }}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Location Name
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Location name or venue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={formData.address_street}
              onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.address_city}
                onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.address_state}
                onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="TN"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.address_zip}
                onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="12345"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Outcome */}
      {event && (
        <div className="bg-card shadow-sm rounded-lg border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-6">Outcome</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Outcome
              </label>
              <input
                type="text"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., signed contract, scheduled follow-up"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Outcome Notes
              </label>
              <textarea
                value={formData.outcome_notes}
                onChange={(e) => setFormData({ ...formData, outcome_notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Detailed notes about the outcome..."
              />
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : event ? 'Update Event' : 'Schedule Event'}
        </button>
      </div>
    </form>
  )
}
