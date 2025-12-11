import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CallLogsWithFilters } from '@/components/call-logs/call-logs-with-filters'

/**
 * Call Logs list page
 *
 * Features:
 * - Configurable FilterBar integration
 * - List all call logs with Twilio integration
 * - Filter by direction, outcome, disposition
 * - View call recordings and transcriptions
 * - Track follow-ups
 */
export default async function CallLogsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Call Logs</h1>
            <p className="text-gray-600 mt-1">
              View call history, recordings, and transcriptions
            </p>
          </div>

          <Link
            href="/call-logs/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Log Call
          </Link>
        </div>

        {/* FilterBar + CallLogsTable */}
        <div className="mt-6">
          <CallLogsWithFilters />
        </div>
      </div>
    </div>
  )
}
