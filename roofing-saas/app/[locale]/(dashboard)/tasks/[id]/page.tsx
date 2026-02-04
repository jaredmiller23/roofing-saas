import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/lib/i18n/navigation'
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
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Task Not Found</h2>
            <p className="text-red-300 mb-4">The task you are looking for does not exist.</p>
            <Link href="/tasks" className="text-red-400 hover:text-red-300 underline">
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
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-yellow-500/20 text-yellow-400',
      high: 'bg-red-500/20 text-red-400',
    }
    return priority ? colors[priority] || 'bg-muted text-gray-800' : 'bg-muted text-gray-800'
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
      todo: 'bg-muted text-muted-foreground',
      in_progress: 'bg-blue-500/20 text-blue-400',
      completed: 'bg-green-500/20 text-green-400',
      cancelled: 'bg-red-500/20 text-red-400',
    }
    return status ? colors[status] || 'bg-muted text-gray-800' : 'bg-muted text-gray-800'
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
              {task.status === 'completed' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <Clock className="h-8 w-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
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
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              Edit
            </Link>
            <Link
              href="/tasks"
              className="px-4 py-2 border border-border text-muted-foreground rounded-lg hover:bg-background"
            >
              Back
            </Link>
          </div>
        </div>

        {/* Task Details */}
        <div className="bg-card rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-muted-foreground">Due Date</label>
              <p className="mt-1 text-foreground">
                {task.due_date ? new Date(task.due_date).toLocaleDateString() : '-'}
              </p>
            </div>
            {task.completed_at && (
              <div>
                <label className="block text-sm font-medium text-muted-foreground">Completed At</label>
                <p className="mt-1 text-foreground">
                  {new Date(task.completed_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {task.description && (
          <div className="bg-card rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Description</h2>
            <p className="text-foreground whitespace-pre-wrap">{task.description}</p>
          </div>
        )}
      </div>
    </div>
  )
}
