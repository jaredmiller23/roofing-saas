import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EventsTable } from '@/components/events/events-table'

/**
 * Events list page
 *
 * Features:
 * - Calendar view of all events and appointments
 * - Schedule inspections and meetings
 * - Track adjuster meetings and callbacks
 * - Set reminders and notifications
 */
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Events</h1>
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

        {/* Table */}
        <div className="mt-6">
          <EventsTable params={params} />
        </div>
      </div>
    </div>
  )
}
