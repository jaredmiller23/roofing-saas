import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { JobsTable } from '@/components/jobs/jobs-table'

/**
 * Jobs list page
 *
 * Features:
 * - List all production jobs/installations
 * - Schedule crews and track progress
 * - Monitor job costs and profitability
 * - Track quality and safety inspections
 */
export default async function JobsPage({
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
            <h1 className="text-3xl font-bold text-foreground">Jobs</h1>
            <p className="text-muted-foreground mt-1">
              Manage production jobs, crew schedules, and job tracking
            </p>
          </div>

          <Link
            href="/jobs/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Schedule Job
          </Link>
        </div>

        {/* Table */}
        <div className="mt-6">
          <JobsTable params={params} />
        </div>
      </div>
    </div>
  )
}
