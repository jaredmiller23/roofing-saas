import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EventForm } from '@/components/events/event-form'
import Link from 'next/link'

/**
 * Edit event page
 */
export default async function EditEventPage({
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
            <p className="text-red-700 mb-4">The event you are trying to edit does not exist.</p>
            <Link href="/events" className="text-red-600 hover:text-red-900 underline">
              Back to Events
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Edit Event</h1>
          <p className="text-gray-600 mt-1">
            Update event: {event.title}
          </p>
        </div>

        <EventForm event={event} />
      </div>
    </div>
  )
}
