import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CheckCircle, Clock } from 'lucide-react'

/**
 * Task detail page
 */
export default async function TaskDetailPage({
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
            <p className="text-red-700 mb-4">The task you are looking for does not exist.</p>
            <Link href="/tasks" className="text-red-600 hover:text-red-900 underline">
              Back to Tasks
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const getPriorityLabel = (priority: string | null) => {
    const labels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    }
    return priority ? labels[priority] || priority : '-'
  }

  const getPriorityColor = (priority: string | null) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800',
    }
    return priority ? colors[priority] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
  }

  const getStatusLabel = (status: string | null) => {
    const labels: Record<string, string> = {
      todo: 'To Do',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled',
    }
    return status ? labels[status] || status : '-'
  }

  const getStatusColor = (status: string | null) => {
    const colors: Record<string, string> = {
      todo: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    return status ? colors[status] || 'bg-gray-100 text-gray-800' : 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center">
              {task.status === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <Clock className="h-8 w-8 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {task.title}
              </h1>
              <div className="flex gap-2 mt-2">
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </span>
                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link
              href={`/tasks/${task.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Edit
            </Link>
            <Link
              href="/tasks"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Due Date</label>
              <p className="mt-1 text-gray-900">
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
              </p>
            </div>
            {task.completed_at && (
              <div>
                <label className="block text-sm font-medium text-gray-500">Completed At</label>
                <p className="mt-1 text-gray-900">
                  {new Date(task.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
            <p className="text-gray-900 whitespace-pre-wrap">{task.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
