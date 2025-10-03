'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertCircle,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  UserCircle
} from 'lucide-react'

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
  project?: { id: string; name: string }
  contact?: { id: string; first_name: string; last_name: string }
  assigned_user?: { id: string; email: string; raw_user_meta_data?: { full_name?: string } }
  parent_task?: { id: string; title: string }
}

export function TasksList() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()

      if (statusFilter && statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      if (priorityFilter && priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }
      if (searchQuery) {
        params.append('search', searchQuery)
      }

      const res = await fetch(`/api/tasks?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load tasks')
      }

      setTasks(data.tasks || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, priorityFilter, searchQuery])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error('Failed to delete task')
      }

      loadTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete task')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'todo':
        return <Circle className="h-5 w-5 text-gray-500" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'cancelled':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Circle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      todo: 'bg-gray-100 text-gray-700',
      in_progress: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700'
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
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-yellow-100 text-yellow-700',
      high: 'bg-red-100 text-red-700'
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

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.project?.name.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push('/tasks/board')}
              >
                Board View
              </Button>
              <Button
                onClick={() => router.push('/tasks/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
          <p className="text-gray-600">
            Manage tasks and deadlines for projects and contacts
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="md:w-48">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6 bg-red-50 border-red-200">
            <AlertDescription className="text-red-900">{error}</AlertDescription>
          </Alert>
        )}

        {/* Tasks List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No tasks found
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first task'}
            </p>
            {!searchQuery && (
              <Button
                onClick={() => router.push('/tasks/new')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {getStatusIcon(task.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {task.title}
                        </h3>
                        {getStatusBadge(task.status)}
                        {getPriorityBadge(task.priority)}
                      </div>
                      {task.description && (
                        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
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
                        {task.assigned_user && (
                          <div className="flex items-center gap-1">
                            <UserCircle className="h-4 w-4" />
                            <span>{task.assigned_user.raw_user_meta_data?.full_name || task.assigned_user.email}</span>
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
                            <span key={idx} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
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
    </div>
  )
}
