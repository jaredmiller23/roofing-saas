import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CallLogsTable } from '@/components/call-logs/call-logs-table'

/**
 * Call Logs list page
 *
 * Features:
 * - List all call logs with Twilio integration
 * - Filter by direction, outcome, disposition
 * - View call recordings and transcriptions
 * - Track follow-ups
 */
export default async function CallLogsPage({
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
            <h1 className="text-3xl font-bold text-gray-900">Call Logs</h1>
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

        {/* Table */}
        <div className="mt-6">
          <CallLogsTable params={params} />
        </div>
      </div>
    </div>
  )
}
