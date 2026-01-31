'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Plus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  start_date: string | null
  progress: number
  estimated_hours: number | null
  actual_hours: number | null
  tags: string[] | null
  created_at: string
  assigned_to: string | null
  project?: { id: string; name: string }
  contact?: { id: string; first_name: string; last_name: string }
  parent_task?: { id: string; title: string }
}

interface TasksListProps {
  params?: { [key: string]: string | string[] | undefined }
}

export function TasksList({ params = {} }: TasksListProps) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create a stable string representation of params for dependencies
  const paramsString = JSON.stringify(params)

  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const urlParams = new URLSearchParams()

        // Add all params from URL to API request
        const currentParams = JSON.parse(paramsString)
        Object.entries(currentParams).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            urlParams.append(key, String(value))
          }
        })

        const { data: tasksList } = await apiFetchPaginated<Task[]>(`/api/tasks?${urlParams.toString()}`)
        setTasks(tasksList)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setIsLoading(false)
      }
    }

    loadTasks()
  }, [paramsString])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      await apiFetch<void>(`/api/tasks/${id}`, { method: 'DELETE' })

      // Remove the deleted task from state
      setTasks(tasks.filter(task => task.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Circle className="h-5 w-5 text-muted-foreground" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-primary" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      todo: 'bg-muted text-muted-foreground',
      in_progress: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
      completed: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
      cancelled: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
    }

    const labels = {
      todo: 'To Do',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || colors.todo}`}>
        {labels[status as keyof typeof labels] || status}
      </span>
    )
  }

  const getPriorityBadge = (priority: string) => {
    const colors = {
      low: 'bg-muted text-muted-foreground',
      medium: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300',
      high: 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
    }

    const labels = {
      low: 'Low',
      medium: 'Medium',
      high: 'High'
    }

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[priority as keyof typeof colors] || colors.medium}`}>
        {labels[priority as keyof typeof labels] || priority}
      </span>
    )
  }

  return (
    <div>
      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertDescription className="text-red-900">{error}</AlertDescription>
        </Alert>
      )}

      {/* Tasks List */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
          <div className="bg-card rounded-lg shadow-sm border border p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No tasks found
            </h3>
            <p className="text-muted-foreground mb-6">
              Try adjusting your search or filters
            </p>
            <Button
              onClick={() => router.push('/tasks/new')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-card rounded-lg shadow-sm border border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {task.title}
                        </h3>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      {task.description && (
                        <p className="text-muted-foreground text-sm mb-3">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {task.project && (
                          <div>
                            <span className="font-medium">Project:</span>{' '}
                            <span>{task.project.name}</span>
                          </div>
                        )}
                        {task.contact && (
                          <div>
                            <span className="font-medium">Contact:</span>{' '}
                            <span>{task.contact.first_name} {task.contact.last_name}</span>
                          </div>
                        )}
                        {task.due_date && (
                          <div>
                            <span className="font-medium">Due:</span>{' '}
                            <span>{new Date(task.due_date).toLocaleDateString()}</span>
                          </div>
                        )}
                        {task.progress > 0 && (
                          <div>
                            <span className="font-medium">Progress:</span>{' '}
                            <span>{task.progress}%</span>
                          </div>
                        )}
                      </div>
                      {task.tags && task.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.tags.map((tag, idx) => (
                            <span key={idx} className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/tasks/${task.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/tasks/${task.id}/edit`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(task.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  )
}
