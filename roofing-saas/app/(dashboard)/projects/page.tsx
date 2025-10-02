import { getCurrentUser } from '@/lib/auth/session'
import { getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ProjectsSearch } from '@/components/projects/projects-search'
import { ProjectsTable } from '@/components/projects/projects-table'
import Link from 'next/link'

/**
 * Projects Page
 *
 * Displays all roofing projects/jobs for the tenant with filtering and search
 * Features:
 * - Project list view with pagination
 * - Search by name/number
 * - Filter by status, pipeline, stage, assigned to
 * - Quick access to project details
 */

interface ProjectsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/register')
  }

  const params = await searchParams

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage your roofing projects and jobs
            </p>
          </div>
          <Link
            href="/projects/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            New Project
          </Link>
        </div>

        {/* Search and Filters */}
        <ProjectsSearch />

        {/* Projects Table */}
        <ProjectsTable params={params} />
      </div>
    </div>
  )
}
