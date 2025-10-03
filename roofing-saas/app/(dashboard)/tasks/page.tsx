import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TasksList } from '@/components/tasks/TasksList'

/**
 * Tasks list page
 *
 * Features:
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

  return <TasksList />
}
