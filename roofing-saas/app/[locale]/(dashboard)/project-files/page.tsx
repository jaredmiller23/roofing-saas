import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { Link } from '@/lib/i18n/navigation'
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
            <h1 className="text-3xl font-bold text-foreground">Project Files</h1>
            <p className="text-muted-foreground mt-1">
              Manage photos, documents, and files for projects
            </p>
          </div>

          <Link
            href="/project-files/new"
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
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
