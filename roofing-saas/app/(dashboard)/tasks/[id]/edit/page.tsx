import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TaskFormEnhanced } from '@/components/tasks/TaskFormEnhanced'
import Link from 'next/link'

/**
 * Edit task page
 */
export default async function EditTaskPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const tenantId = await getUserTenantId(user.id)
  if (!tenantId) {
    redirect('/dashboard')
  }

  const { id } = await params
  const supabase = await createClient()

  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single()

  if (error || !task) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-900 mb-2">Task Not Found</h2>
            <p className="text-red-700 mb-4">The task you are trying to edit does not exist.</p>
            <Link href="/tasks" className="text-red-600 hover:text-red-900 underline">
              Back to Tasks
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Edit Task</h1>
          <p className="text-gray-600 mt-1">
            Update task: {task.title}
          </p>
        </div>

        <TaskFormEnhanced task={task} />
      </div>
    </div>
  )
}
