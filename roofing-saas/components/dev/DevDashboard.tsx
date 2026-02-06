'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { DevMetricCard } from './DevMetricCard'
import { DevTaskQueue } from './DevTaskQueue'
import { apiFetchPaginated } from '@/lib/api/client'
import {
  ListTodo,
  Users,
  CheckCircle2,
  RefreshCw,
  Code2,
  Lightbulb,
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  due_date: string | null
  tags: string[] | null
  assigned_to: string | null
}

interface Decision {
  date: string
  description: string
}

/**
 * DevDashboard - Main development dashboard layout
 *
 * Displays metrics, recent decisions, and task queue for Clarity's
 * internal development team.
 */
export function DevDashboard() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Hardcoded decisions for MVP - will be replaced with database table later
  const recentDecisions: Decision[] = [
    {
      date: 'Feb 5',
      description: 'Use substatus system for 18-stage workflow',
    },
    {
      date: 'Feb 5',
      description: 'Campaign auto-cancel implemented',
    },
    {
      date: 'Feb 4',
      description: 'Speed vs automation tradeoff accepted',
    },
  ]

  useEffect(() => {
    const loadTasks = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Fetch all tasks - we'll filter client-side for dev/clarity tags
        // In production, you'd add a tag filter to the API
        const { data: allTasks } = await apiFetchPaginated<Task[]>(
          '/api/tasks?limit=100&status=todo,in_progress'
        )

        // Filter for dev-related tasks (tags containing 'dev' or 'clarity')
        const devTasks = allTasks.filter((task) => {
          if (!task.tags || task.tags.length === 0) return false
          return task.tags.some(
            (tag) =>
              tag.toLowerCase().includes('dev') ||
              tag.toLowerCase().includes('clarity')
          )
        })

        setTasks(devTasks)
      } catch (err) {
        console.error('Failed to load tasks:', err)
        setError(err instanceof Error ? err.message : 'Failed to load tasks')
      } finally {
        setIsLoading(false)
      }
    }

    loadTasks()
  }, [refreshKey])

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1)
  }

  // Calculate metrics from tasks
  const myTasks = tasks.filter((t) => t.status !== 'completed')
  const todaysTasks = myTasks.filter((t) => {
    if (!t.due_date) return false
    const due = new Date(t.due_date)
    const today = new Date()
    return (
      due.getFullYear() === today.getFullYear() &&
      due.getMonth() === today.getMonth() &&
      due.getDate() === today.getDate()
    )
  })
  const openTasks = tasks.filter((t) => t.status !== 'completed')
  const completedThisWeek = tasks.filter((t) => {
    if (t.status !== 'completed') return false
    // This is approximate - in production you'd track completion date
    return true
  })

  // Map tasks to the DevTaskQueue format
  const queueTasks = openTasks.map((task) => ({
    id: task.id,
    title: task.title,
    priority: task.priority as 'high' | 'medium' | 'low',
    assignee: task.assigned_to,
    dueDate: task.due_date,
    status: task.status as 'todo' | 'in_progress' | 'completed' | 'cancelled',
    tags: task.tags || undefined,
  }))

  // Sort by priority (high first) then by due date
  queueTasks.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    const priorityDiff =
      (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
    if (priorityDiff !== 0) return priorityDiff

    // Then by due date (earliest first, null last)
    if (!a.dueDate && !b.dueDate) return 0
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary rounded-lg">
            <Code2 className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              Clarity Development Dashboard
            </h1>
            <p className="text-muted-foreground">
              Internal task tracking and decision log
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <DevMetricCard
          title="My Tasks"
          value={todaysTasks.length}
          subtitle="due today"
          icon={<ListTodo className="h-5 w-5" />}
          variant={todaysTasks.length > 0 ? 'warning' : 'default'}
          isLoading={isLoading}
        />
        <DevMetricCard
          title="Team Tasks"
          value={openTasks.length}
          subtitle="open"
          icon={<Users className="h-5 w-5" />}
          variant="default"
          isLoading={isLoading}
        />
        <DevMetricCard
          title="Completed"
          value={completedThisWeek.length}
          subtitle="this week"
          icon={<CheckCircle2 className="h-5 w-5" />}
          variant="success"
          isLoading={isLoading}
        />
      </div>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Recent Decisions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-5 flex-1" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-3">
              {recentDecisions.map((decision, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <span className="text-sm font-medium text-muted-foreground min-w-[50px]">
                    {decision.date}:
                  </span>
                  <span className="text-foreground">{decision.description}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Task Queue */}
      <DevTaskQueue tasks={queueTasks} isLoading={isLoading} />
    </div>
  )
}
