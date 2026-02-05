'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Search,
  Plus,
  Eye,
  Edit,
  Calendar,
  User,
  Clock,
  Flag
} from 'lucide-react'
import { apiFetch, apiFetchPaginated } from '@/lib/api/client'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  progress: number
  tags: string[] | null
  project?: { id: string; name: string }
  contact?: { id: string; first_name: string; last_name: string }
  assigned_user?: { id: string; email: string; raw_user_meta_data?: { full_name?: string } }
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'border-border bg-muted/30' },
  { id: 'in_progress', title: 'In Progress', color: 'border-primary bg-primary/10' },
  { id: 'completed', title: 'Completed', color: 'border-green-500 bg-green-500/10' }
]

export function TaskBoard() {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)

  const loadTasks = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()

      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (priorityFilter && priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }

      const { data: tasksList } = await apiFetchPaginated<Task[]>(`/api/tasks?${params.toString()}`)
      setTasks(tasksList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, priorityFilter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const handleDragStart = (task: Task) => {
    setDraggedTask(task)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (newStatus: string) => {
    if (!draggedTask || draggedTask.status === newStatus) {
      setDraggedTask(null)
      return
    }

    try {
      await apiFetch(`/api/tasks/${draggedTask.id}`, {
        method: 'PATCH',
        body: { status: newStatus },
      })

      // Optimistically update the UI
      setTasks(tasks.map(task =>
        task.id === draggedTask.id ? { ...task, status: newStatus } : task
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update task')
      // Reload tasks on error
      loadTasks()
    } finally {
      setDraggedTask(null)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600'
      case 'medium':
        return 'text-yellow-600'
      case 'low':
        return 'text-muted-foreground'
      default:
        return 'text-muted-foreground'
    }
  }

  const getPriorityIcon = (priority: string) => {
    return <Flag className={`h-4 w-4 ${getPriorityColor(priority)}`} />
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-lg">
                <svg className="h-6 w-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-foreground">Task Board</h1>
            </div>
            <Button
              onClick={() => router.push('/tasks/new')}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          <p className="text-muted-foreground">
            Drag and drop tasks to update their status
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full px-3 py-2 bg-card text-foreground border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <Button
              variant="outline"
              onClick={() => router.push('/tasks')}
            >
              List View
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {columns.map((column) => (
            <div
              key={column.id}
              className={`rounded-lg border-2 ${column.color} min-h-[500px]`}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{column.title}</h3>
                  <span className="px-2 py-1 bg-card rounded-full text-xs font-medium text-muted-foreground">
                    {getTasksByStatus(column.id).length}
                  </span>
                </div>
              </div>

              {/* Task Cards */}
              <div className="p-4 space-y-3">
                {getTasksByStatus(column.id).map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    className="bg-card rounded-lg border border-border p-4 cursor-move hover:shadow-md transition-shadow"
                  >
                    {/* Task Header */}
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-foreground flex-1">{task.title}</h4>
                      {getPriorityIcon(task.priority)}
                    </div>

                    {/* Task Description */}
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Task Meta */}
                    <div className="space-y-2 mb-3">
                      {task.project && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span>{task.project.name}</span>
                        </div>
                      )}
                      {task.assigned_user && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          <span>{task.assigned_user.raw_user_meta_data?.full_name || task.assigned_user.email}</span>
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {task.progress > 0 && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Progress</span>
                          <span>{task.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {task.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                        {task.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                            +{task.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/tasks/${task.id}`)
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/tasks/${task.id}/edit`)
                        }}
                        className="flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}

                {getTasksByStatus(column.id).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tasks</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
