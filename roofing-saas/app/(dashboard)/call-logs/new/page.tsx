import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { CallLogForm } from '@/components/call-logs/call-log-form'

/**
 * New call log page
 */
export default async function NewCallLogPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Log New Call</h1>
          <p className="text-gray-600 mt-1">
            Record details of a phone call
          </p>
        </div>

        <CallLogForm />
      </div>
    </div>
  )
}
