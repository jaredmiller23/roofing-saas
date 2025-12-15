import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TaskBoard } from '@/components/tasks/TaskBoard'

/**
 * Task Board (Kanban) Page
 *
 * Features:
 * - Visual Kanban board with drag-and-drop
 * - Columns: To Do, In Progress, Completed
 * - Task cards with priority, assignee, due date
 * - Progress tracking
 * - Search and filter capabilities
 */
export default async function TaskBoardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return <TaskBoard />
}
