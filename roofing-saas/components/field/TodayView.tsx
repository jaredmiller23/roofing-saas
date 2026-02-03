'use client'

/**
 * TodayView Component
 *
 * Shows today's schedule including tasks, events, and appointments.
 * Designed for field workers to quickly see what's on their agenda.
 * Fetches real data from /api/tasks and /api/events.
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useUIMode } from '@/hooks/useUIMode'
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  Circle,
  Navigation,
  User,
  Building,
  CheckSquare,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'

interface TodayItem {
  id: string
  title: string
  type: 'task' | 'callback' | 'appointment'
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'high' | 'medium' | 'low'
  time: string
  duration?: number // minutes
  location?: {
    address: string
    city: string
    state: string
  }
  contact?: {
    name: string
    phone: string
    company?: string
  }
  notes?: string
  sourceType: 'task' | 'event'
}

interface TaskRecord {
  id: string
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
  due_date: string | null
  start_date: string | null
  project?: { id: string; name: string } | null
  contact?: { id: string; first_name: string; last_name: string } | null
}

interface EventRecord {
  id: string
  title: string
  description: string | null
  event_type: string | null
  status: string | null
  start_at: string
  end_at: string | null
  location: string | null
}

interface TodayViewProps {
  className?: string
}

function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return {
    todayStr: start.toISOString().split('T')[0],
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  }
}

function formatTimeFromISO(isoString: string): string {
  const date = new Date(isoString)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

function getDurationMinutes(startAt: string, endAt: string | null): number | undefined {
  if (!endAt) return undefined
  const start = new Date(startAt).getTime()
  const end = new Date(endAt).getTime()
  const minutes = Math.round((end - start) / 60000)
  return minutes > 0 ? minutes : undefined
}

export function TodayView({ className }: TodayViewProps) {
  const { isFieldMode } = useUIMode()
  const router = useRouter()
  const [todayItems, setTodayItems] = useState<TodayItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  const fetchTodaySchedule = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { todayStr, startISO, endISO } = getTodayRange()

      // Fetch tasks and events in parallel
      const [tasks, events] = await Promise.all([
        apiFetch<TaskRecord[]>(
          `/api/tasks?limit=100&sort_by=due_date&sort_order=asc`
        ),
        apiFetch<EventRecord[]>(
          `/api/events?start_after=${encodeURIComponent(startISO)}&end_before=${encodeURIComponent(endISO)}&limit=50`
        ),
      ])

      // Map tasks: include tasks due today or overdue, not completed/cancelled
      const taskItems: TodayItem[] = (tasks || [])
        .filter(t =>
          t.due_date &&
          t.due_date <= todayStr &&
          (t.status === 'todo' || t.status === 'in_progress')
        )
        .map(t => ({
          id: t.id,
          title: t.title,
          type: 'task' as const,
          status: t.status === 'in_progress' ? 'in_progress' as const : 'pending' as const,
          priority: t.priority,
          time: '',
          contact: t.contact ? {
            name: `${t.contact.first_name} ${t.contact.last_name}`.trim(),
            phone: '',
          } : undefined,
          notes: t.description || undefined,
          sourceType: 'task' as const,
        }))

      // Map events
      const eventItems: TodayItem[] = (events || []).map(e => ({
        id: e.id,
        title: e.title,
        type: 'appointment' as const,
        status: e.status === 'completed' ? 'completed' as const : 'pending' as const,
        priority: 'medium' as const,
        time: formatTimeFromISO(e.start_at),
        duration: getDurationMinutes(e.start_at, e.end_at),
        location: e.location ? { address: e.location, city: '', state: '' } : undefined,
        notes: e.description || undefined,
        sourceType: 'event' as const,
      }))

      // Merge: events with times sorted chronologically, then tasks without times
      const sorted = [
        ...eventItems.sort((a, b) => a.time.localeCompare(b.time)),
        ...taskItems,
      ]

      setTodayItems(sorted)
    } catch (err) {
      console.error('Error fetching today\'s schedule:', err)
      setError('Failed to load today\'s schedule')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodaySchedule()

    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchTodaySchedule])

  const getItemIcon = (type: TodayItem['type'], status: TodayItem['status']) => {
    if (status === 'completed') {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    }

    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-primary" />
      case 'callback':
        return <Phone className="h-5 w-5 text-secondary-foreground" />
      case 'task':
        return <Circle className="h-5 w-5 text-muted-foreground" />
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getPriorityColor = (priority: TodayItem['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-500/10'
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/10'
      case 'low': return 'border-l-green-500 bg-green-500/10'
    }
  }

  const getTypeLabel = (type: TodayItem['type']) => {
    switch (type) {
      case 'appointment': return 'Event'
      case 'callback': return 'Callback'
      case 'task': return 'Task'
    }
  }

  const isUpcoming = (timeString: string) => {
    if (!timeString) return false
    const [hours, minutes] = timeString.split(':').map(Number)
    if (isNaN(hours) || isNaN(minutes)) return false
    const itemTime = new Date()
    itemTime.setHours(hours, minutes, 0, 0)
    return itemTime > currentTime
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleGetDirections = (location: TodayItem['location']) => {
    if (location) {
      const parts = [location.address, location.city, location.state].filter(Boolean)
      const encodedAddress = encodeURIComponent(parts.join(', '))
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank')
    }
  }

  const markCompleted = async (item: TodayItem) => {
    // Optimistic update
    setTodayItems(items =>
      items.map(i =>
        i.id === item.id ? { ...i, status: 'completed' as const } : i
      )
    )

    try {
      if (item.sourceType === 'task') {
        await apiFetch(`/api/tasks/${item.id}`, {
          method: 'PATCH',
          body: { status: 'completed', completed_at: new Date().toISOString() },
        })
        toast.success('Task completed')
      }
    } catch (err) {
      // Revert optimistic update
      setTodayItems(items =>
        items.map(i =>
          i.id === item.id ? { ...i, status: item.status } : i
        )
      )
      console.error('Failed to mark as completed:', err)
      toast.error('Failed to update status')
    }
  }

  return (
    <div className={cn('w-full max-w-2xl mx-auto p-6', className)}>
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Today&apos;s Schedule
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTodaySchedule}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="p-4 border rounded-lg border-l-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-5 w-5 rounded mt-1" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-1" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-8 w-16" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Today's Items */}
          {!isLoading && todayItems.length > 0 && (
            <div className="space-y-3">
              {todayItems.map((item) => (
                <div
                  key={`${item.sourceType}-${item.id}`}
                  className={cn(
                    'p-4 border rounded-lg border-l-4 transition-colors',
                    getPriorityColor(item.priority),
                    item.status === 'completed' && 'opacity-60',
                    item.time && isUpcoming(item.time) && item.status === 'pending' && 'ring-2 ring-primary/20'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getItemIcon(item.type, item.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn(
                          'font-medium',
                          item.status === 'completed' ? 'line-through text-muted-foreground' : 'text-foreground'
                        )}>
                          {item.title}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {getTypeLabel(item.type)}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.time || 'All day'}
                          {item.duration && ` (${item.duration}min)`}
                        </span>
                        {item.time && isUpcoming(item.time) && item.status === 'pending' && (
                          <Badge className="bg-primary/10 text-primary text-xs">
                            Upcoming
                          </Badge>
                        )}
                      </div>

                      {/* Contact Info */}
                      {item.contact && (
                        <div className="flex items-center gap-3 text-sm mb-2">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.contact.name}
                          </span>
                          {item.contact.company && (
                            <span className="flex items-center gap-1">
                              <Building className="h-3 w-3" />
                              {item.contact.company}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Location Info */}
                      {item.location && item.location.address && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          {[item.location.address, item.location.city].filter(Boolean).join(', ')}
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-sm text-muted-foreground">
                          {item.notes}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {item.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markCompleted(item)}
                          className={cn(isFieldMode && 'h-9 px-3')}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}

                      {item.contact?.phone && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCall(item.contact!.phone)}
                          className={cn(isFieldMode && 'h-9 px-3')}
                        >
                          <Phone className="h-3 w-3" />
                        </Button>
                      )}

                      {item.location && item.location.address && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGetDirections(item.location!)}
                          className={cn(isFieldMode && 'h-9 px-3')}
                        >
                          <Navigation className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && todayItems.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No items scheduled today
              </h3>
              <p className="text-muted-foreground">
                Your schedule for today is clear
              </p>
            </div>
          )}

          {/* Quick Actions */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size={isFieldMode ? "lg" : "sm"}
                className="flex items-center gap-2"
                onClick={() => router.push('/events')}
              >
                <Calendar className="h-4 w-4" />
                Full Calendar
              </Button>
              <Button
                variant="outline"
                size={isFieldMode ? "lg" : "sm"}
                className="flex items-center gap-2"
                onClick={() => router.push('/tasks')}
              >
                <CheckSquare className="h-4 w-4" />
                All Tasks
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
