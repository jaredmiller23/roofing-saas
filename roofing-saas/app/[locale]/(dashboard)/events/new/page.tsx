import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { EventForm } from '@/components/events/event-form'

interface NewEventPageProps {
  searchParams: Promise<{ start?: string; end?: string }>
}

/**
 * New event page
 */
export default async function NewEventPage({ searchParams }: NewEventPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const params = await searchParams
  const initialStart = params.start || undefined
  const initialEnd = params.end || undefined

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Schedule New Event</h1>
          <p className="text-muted-foreground mt-1">
            Create a new appointment, inspection, or meeting
          </p>
        </div>

        <EventForm initialStart={initialStart} initialEnd={initialEnd} />
      </div>
    </div>
  )
}
