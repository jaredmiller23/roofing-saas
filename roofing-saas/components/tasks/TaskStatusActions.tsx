'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'

interface TaskStatusActionsProps {
  taskId: string
  currentStatus: string | null
}

export function TaskStatusActions({ taskId, currentStatus }: TaskStatusActionsProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true)
    try {
      const body: Record<string, unknown> = { status: newStatus }
      if (newStatus === 'completed') {
        body.completed_at = new Date().toISOString()
      }
      if (newStatus !== 'completed') {
        body.completed_at = null
      }

      await apiFetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body,
      })
      router.refresh()
    } catch {
      toast.error('Failed to update task status. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  // Show relevant quick actions based on current status
  const actions: { label: string; status: string; className: string }[] = []

  if (currentStatus !== 'completed') {
    actions.push({
      label: 'Mark Complete',
      status: 'completed',
      className: 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30',
    })
  }

  if (currentStatus !== 'in_progress' && currentStatus !== 'completed') {
    actions.push({
      label: 'Start Progress',
      status: 'in_progress',
      className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30',
    })
  }

  if (currentStatus === 'completed') {
    actions.push({
      label: 'Reopen',
      status: 'todo',
      className: 'bg-muted text-muted-foreground border border-border hover:bg-muted/80',
    })
  }

  if (currentStatus === 'in_progress') {
    actions.push({
      label: 'Back to To Do',
      status: 'todo',
      className: 'bg-muted text-muted-foreground border border-border hover:bg-muted/80',
    })
  }

  if (actions.length === 0) return null

  return (
    <div className="flex gap-2 flex-wrap">
      {actions.map((action) => (
        <button
          key={action.status}
          onClick={() => handleStatusChange(action.status)}
          disabled={isUpdating}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 ${action.className}`}
        >
          {isUpdating ? 'Updating...' : action.label}
        </button>
      ))}
    </div>
  )
}
