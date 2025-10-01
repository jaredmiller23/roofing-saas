import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'

/**
 * Projects Page
 *
 * Displays all roofing projects/jobs for the tenant
 * This will be expanded in Phase 1 to include:
 * - Project list view
 * - Project details
 * - Job tracking
 * - Status updates
 */
export default async function ProjectsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage your roofing projects and jobs
        </p>
      </div>

      {/* Placeholder content */}
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No projects yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Projects page is coming soon. This will display all your roofing jobs and their status.
          </p>
        </div>
      </div>

      {/* Debug info */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
        <p className="text-sm text-gray-600">Debug: Tenant ID = {tenantId}</p>
        <p className="text-sm text-gray-600">Debug: User = {user.email}</p>
      </div>
    </div>
  )
}
