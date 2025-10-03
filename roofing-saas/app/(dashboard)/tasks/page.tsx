import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TasksTable } from '@/components/tasks/tasks-table'

/**
 * Tasks list page
 *
 * Features:
 * - List all tasks with filtering
 * - Search tasks by title
 * - Filter by status, priority, assigned user
 * - View task details and manage tasks
 */
export default async function TasksPage({
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
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-1">
              Manage tasks and to-dos for projects and contacts
            </p>
          </div>

          <Link
            href="/tasks/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Add Task
          </Link>
        </div>

        {/* Table */}
        <div className="mt-6">
          <TasksTable params={params} />
        </div>
      </div>
    </div>
  )
}
