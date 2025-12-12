import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, Clock, MapPin, FileText } from 'lucide-react'

/**
 * View event details page
 */
export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !event) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Event Not Found</h2>
            <p className="text-red-700 mb-4">The event you are trying to view does not exist.</p>
            <Link href="/events" className="text-red-600 hover:text-red-900 underline">
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      scheduled: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-muted text-gray-800',
      no_show: 'bg-orange-100 text-orange-800',
    }
    return badges[status as keyof typeof badges] || 'bg-muted text-gray-800'
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString()
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Event Details</h1>
              <p className="text-muted-foreground mt-1">{event.title}</p>
            </div>
            <Link
              href={`/events/${event.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Edit
            </Link>
          </div>
        </div>

        {/* Event Information Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Event Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Title</label>
              <p className="text-foreground">{event.title}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Event Type</label>
              <p className="text-foreground capitalize">{event.event_type?.replace('_', ' ')}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Status</label>
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(event.status)}`}>
                {event.status?.replace('_', ' ')}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">All Day</label>
              <p className="text-foreground">{event.all_day ? 'Yes' : 'No'}</p>
            </div>

            {event.description && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                <p className="text-foreground whitespace-pre-wrap">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Date & Time Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Date & Time</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">Start</label>
              <p className="text-foreground">{formatDateTime(event.start_at)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">End</label>
              <p className="text-foreground">{formatDateTime(event.end_at)}</p>
            </div>
          </div>
        </div>

        {/* Location Card */}
        {(event.location || event.address_street) && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Location</h2>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {event.location && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Location Name</label>
                  <p className="text-foreground">{event.location}</p>
                </div>
              )}

              {event.address_street && (
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1">Address</label>
                  <p className="text-foreground">
                    {event.address_street}
                    {event.address_city && (
                      <>
                        <br />
                        {event.address_city}, {event.address_state} {event.address_zip}
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Outcome Card */}
        {(event.outcome || event.outcome_notes) && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold text-foreground">Outcome</h2>
            </div>

            {event.outcome && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-muted-foreground mb-1">Outcome</label>
                <p className="text-foreground">{event.outcome}</p>
              </div>
            )}

            {event.outcome_notes && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">Notes</label>
                <p className="text-foreground whitespace-pre-wrap">{event.outcome_notes}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <Link
            href="/events"
            className="px-4 py-2 border border-gray-300 rounded-md text-muted-foreground hover:bg-background"
          >
            Back to Events
          </Link>
        </div>
      </div>
    </div>
  )
}
