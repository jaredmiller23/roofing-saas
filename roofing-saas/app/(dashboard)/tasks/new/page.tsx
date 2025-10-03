import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { TaskForm } from '@/components/tasks/task-form'

/**
 * Create new task page
 */
export default async function NewTaskPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">New Task</h1>
        <TaskForm />
      </div>
    </div>
  )
}
