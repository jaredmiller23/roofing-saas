import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TasksWithFilters } from '@/components/tasks/tasks-with-filters'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Plus } from 'lucide-react'

/**
 * Tasks list page
 *
 * Features:
 * - Configurable FilterBar integration
 * - List all tasks with filtering
 * - Search tasks by title
 * - Filter by status, priority, assigned user
 * - View task details and manage tasks
 * - Progress tracking and deadlines
 * - Tags and labels for organization
 */
export default async function TasksPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/tasks/board">
                <Button variant="outline">
                  Board View
                </Button>
              </Link>
              <Link href="/tasks/new">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </Link>
            </div>
          </div>
          <p className="text-muted-foreground">
            Manage tasks and deadlines for projects and contacts
          </p>
        </div>

        {/* FilterBar + TasksList */}
        <TasksWithFilters />
      </div>
    </div>
  )
}
