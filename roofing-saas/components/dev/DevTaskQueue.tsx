'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Circle, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

interface Task {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  assignee: string | null
  dueDate: string | null
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  tags?: string[]
}

interface DevTaskQueueProps {
  tasks: Task[]
  isLoading?: boolean
}

/**
 * DevTaskQueue - Task list with priority indicators
 *
 * Displays tasks in a table format with priority badges,
 * status indicators, and due dates.
 */
export function DevTaskQueue({ tasks, isLoading = false }: DevTaskQueueProps) {
  const getPriorityIndicator = (priority: string) => {
    switch (priority) {
      case 'high':
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-red-600 dark:text-red-400 font-medium">High</span>
          </span>
        )
      case 'medium':
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="text-yellow-600 dark:text-yellow-400 font-medium">Med</span>
          </span>
        )
      case 'low':
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-green-600 dark:text-green-400 font-medium">Low</span>
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-muted-foreground" />
            <span className="text-muted-foreground">-</span>
          </span>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'todo':
        return (
          <Badge variant="outline" className="gap-1">
            <Circle className="h-3 w-3" />
            Todo
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="default" className="gap-1">
            <Clock className="h-3 w-3" />
            In Progress
          </Badge>
        )
      case 'completed':
        return (
          <Badge variant="default" className="gap-1 bg-green-500 hover:bg-green-500/90">
            <CheckCircle2 className="h-3 w-3" />
            Done
          </Badge>
        )
      case 'cancelled':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDueDate = (dueDate: string | null) => {
    if (!dueDate) return '-'

    const date = new Date(dueDate)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Reset time for comparison
    today.setHours(0, 0, 0, 0)
    tomorrow.setHours(0, 0, 0, 0)
    const dueDay = new Date(date)
    dueDay.setHours(0, 0, 0, 0)

    if (dueDay.getTime() === today.getTime()) {
      return <span className="text-red-600 dark:text-red-400 font-medium">Today</span>
    }
    if (dueDay.getTime() === tomorrow.getTime()) {
      return <span className="text-yellow-600 dark:text-yellow-400 font-medium">Tomorrow</span>
    }
    if (dueDay < today) {
      return <span className="text-red-600 dark:text-red-400 font-medium">Overdue</span>
    }

    // Show day of week for this week, otherwise show date
    const daysDiff = Math.ceil((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysDiff <= 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' })
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No dev tasks found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Tasks with &apos;dev&apos; or &apos;clarity&apos; tags will appear here
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Task Queue</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Priority</TableHead>
              <TableHead>Task</TableHead>
              <TableHead className="w-[100px]">Assignee</TableHead>
              <TableHead className="w-[80px]">Due</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{getPriorityIndicator(task.priority)}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium text-foreground">{task.title}</p>
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {task.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {task.assignee || '-'}
                </TableCell>
                <TableCell>{formatDueDate(task.dueDate)}</TableCell>
                <TableCell>{getStatusBadge(task.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
