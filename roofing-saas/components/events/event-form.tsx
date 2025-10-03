'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, Clock, MapPin } from 'lucide-react'

interface EventFormProps {
  event?: {
    id: string
    title: string
    description: string | null
    event_type: string
    start_at: string
    end_at: string
    all_day: boolean
    status: string
    location: string | null
    address_street: string | null
    address_city: string | null
    address_state: string | null
    address_zip: string | null
    outcome: string | null
    outcome_notes: string | null
  }
}

export function EventForm({ event }: EventFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    start_at: formatDateTimeLocal(event?.start_at || null),
    end_at: formatDateTimeLocal(event?.end_at || null),
    all_day: event?.all_day || false,
    status: event?.status || 'scheduled',
    location: event?.location || '',
    address_street: event?.address_street || '',
    address_city: event?.address_city || '',
    address_state: event?.address_state || '',
    address_zip: event?.address_zip || '',
    outcome: event?.outcome || '',
    outcome_notes: event?.outcome_notes || '',
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
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Failed to save event')
      }

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
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Event Details */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Event Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event title"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event Type
              </label>
              <select
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="confirmed">Confirmed</option>
                <option value="cancelled">Cancelled</option>
                <option value="completed">Completed</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event description..."
            />
          </div>
        </div>
      </div>

      {/* Date & Time */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Date & Time</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={formData.all_day}
              onChange={(e) => setFormData({ ...formData, all_day: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-900">
              All Day Event
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End *
              </label>
              <input
                type="datetime-local"
                required
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-6">
          <MapPin className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Location</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location Name
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Location name or venue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address
            </label>
            <input
              type="text"
              value={formData.address_street}
              onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.address_city}
                onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={formData.address_state}
                onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="TN"
                maxLength={2}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.address_zip}
                onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="12345"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Outcome */}
      {event && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Outcome</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome
              </label>
              <input
                type="text"
                value={formData.outcome}
                onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., signed contract, scheduled follow-up"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome Notes
              </label>
              <textarea
                value={formData.outcome_notes}
                onChange={(e) => setFormData({ ...formData, outcome_notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : event ? 'Update Event' : 'Schedule Event'}
        </button>
      </div>
    </form>
  )
}
