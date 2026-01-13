'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCwIcon, InboxIcon, CheckCircleIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ApprovalItem } from './ApprovalItem'

interface QueueItem {
  id: string
  phone_number: string
  contact_id: string | null
  inbound_message: string
  suggested_response: string
  category: string
  status: string
  metadata: {
    contact_name?: string
    generated_at?: string
  }
  created_at: string
  expires_at: string
  contact?: {
    first_name: string
    last_name: string
  } | null
}

interface ApprovalQueueProps {
  /** Initial status filter */
  initialStatus?: 'pending' | 'reviewed' | 'all'
}

export function ApprovalQueue({ initialStatus = 'pending' }: ApprovalQueueProps) {
  const [items, setItems] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/aria/queue?status=${statusFilter}`)
      if (!response.ok) {
        throw new Error('Failed to fetch queue')
      }
      const data = await response.json()
      setItems(data.items || [])
      setPendingCount(data.pendingCount || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  // Poll for new items every 30 seconds when viewing pending
  useEffect(() => {
    if (statusFilter !== 'pending') return

    const interval = setInterval(fetchQueue, 30000)
    return () => clearInterval(interval)
  }, [statusFilter, fetchQueue])

  const handleItemAction = async (id: string, action: 'approve' | 'modify' | 'reject', finalResponse?: string, rejectionReason?: string) => {
    try {
      const response = await fetch('/api/aria/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, finalResponse, rejectionReason }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Action failed')
      }

      // Refresh the list
      fetchQueue()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Action failed' }
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'complaint':
        return 'bg-red-500'
      case 'pricing':
        return 'bg-yellow-500'
      case 'cancel':
        return 'bg-orange-500'
      case 'reschedule':
        return 'bg-blue-500'
      default:
        return 'bg-muted'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('pending')}
          >
            <InboxIcon className="size-4 mr-1" />
            Pending
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-primary/20">
                {pendingCount}
              </Badge>
            )}
          </Button>
          <Button
            variant={statusFilter === 'reviewed' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('reviewed')}
          >
            <CheckCircleIcon className="size-4 mr-1" />
            Reviewed
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={fetchQueue} disabled={loading}>
          <RefreshCwIcon className={`size-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-card border border-border">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="py-12 text-center">
          <InboxIcon className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-lg font-medium text-foreground">No items in queue</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {statusFilter === 'pending'
              ? 'ARIA responses requiring review will appear here.'
              : 'No reviewed items found.'}
          </p>
        </div>
      )}

      {/* Queue items */}
      {!loading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <ApprovalItem
              key={item.id}
              item={item}
              onApprove={(id) => handleItemAction(id, 'approve')}
              onModify={(id, response) => handleItemAction(id, 'modify', response)}
              onReject={(id, reason) => handleItemAction(id, 'reject', undefined, reason)}
              getCategoryColor={getCategoryColor}
              formatTimeAgo={formatTimeAgo}
            />
          ))}
        </div>
      )}
    </div>
  )
}
