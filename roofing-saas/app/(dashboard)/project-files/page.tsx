import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ProjectFilesTable } from '@/components/project-files/project-files-table'

/**
 * Project Files list page
 *
 * Features:
 * - List all project files with filtering
 * - Filter by file type and category
 * - View file details and download
 * - Photo galleries and document management
 */
export default async function ProjectFilesPage({
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
            <h1 className="text-3xl font-bold text-gray-900">Project Files</h1>
            <p className="text-gray-600 mt-1">
              Manage photos, documents, and files for projects
            </p>
          </div>

          <Link
            href="/project-files/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Upload File
          </Link>
        </div>

        {/* Table */}
        <div className="mt-6">
          <ProjectFilesTable params={params} />
        </div>
      </div>
    </div>
  )
}
