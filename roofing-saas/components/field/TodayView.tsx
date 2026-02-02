'use client'

/**
 * TodayView Component
 *
 * Shows today's schedule including tasks, callbacks, and appointments.
 * Designed for field workers to quickly see what's on their agenda.
 */

import { useState, useEffect } from 'react'
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
  Route,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface TodayTask {
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
}

interface TodayViewProps {
  className?: string
}

export function TodayView({ className }: TodayViewProps) {
  const { isFieldMode } = useUIMode()
  const [todayItems, setTodayItems] = useState<TodayTask[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    fetchTodaySchedule()

    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const fetchTodaySchedule = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Mock data for today's schedule
      const mockItems: TodayTask[] = [
        {
          id: '1',
          title: 'Smith Property Inspection',
          type: 'appointment',
          status: 'pending',
          priority: 'high',
          time: '09:00',
          duration: 60,
          location: {
            address: '123 Oak Street',
            city: 'Springfield',
            state: 'IL'
          },
          contact: {
            name: 'John Smith',
            phone: '+1-555-0123',
            company: 'ABC Construction'
          },
          notes: 'Roof damage assessment after storm'
        },
        {
          id: '2',
          title: 'Follow up: Wilson estimate',
          type: 'callback',
          status: 'pending',
          priority: 'medium',
          time: '11:30',
          contact: {
            name: 'Mike Wilson',
            phone: '+1-555-0125',
            company: 'Wilson Properties'
          },
          notes: 'Decision deadline today'
        },
        {
          id: '3',
          title: 'Upload photos from yesterday',
          type: 'task',
          status: 'completed',
          priority: 'low',
          time: '08:00',
          notes: 'Brown property documentation'
        },
        {
          id: '4',
          title: 'Davis Consultation',
          type: 'appointment',
          status: 'pending',
          priority: 'medium',
          time: '14:00',
          duration: 45,
          location: {
            address: '456 Maple Avenue',
            city: 'Springfield',
            state: 'IL'
          },
          contact: {
            name: 'Emily Davis',
            phone: '+1-555-0126'
          },
          notes: 'New customer - gutter replacement'
        },
        {
          id: '5',
          title: 'Submit daily report',
          type: 'task',
          status: 'pending',
          priority: 'medium',
          time: '17:00',
          notes: 'End of day summary'
        }
      ]

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Sort by time
      const sorted = mockItems.sort((a, b) => a.time.localeCompare(b.time))
      setTodayItems(sorted)
    } catch (err) {
      console.error('Error fetching today&apos;s schedule:', err)
      setError('Failed to load today&apos;s schedule')
    } finally {
      setIsLoading(false)
    }
  }

  const getItemIcon = (type: TodayTask['type'], status: TodayTask['status']) => {
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

  const getPriorityColor = (priority: TodayTask['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500 bg-red-500/10'
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/10'
      case 'low': return 'border-l-green-500 bg-green-500/10'
    }
  }

  const getTypeLabel = (type: TodayTask['type']) => {
    switch (type) {
      case 'appointment': return 'Appointment'
      case 'callback': return 'Callback'
      case 'task': return 'Task'
    }
  }

  const isUpcoming = (timeString: string) => {
    const itemTime = new Date()
    const [hours, minutes] = timeString.split(':').map(Number)
    itemTime.setHours(hours, minutes, 0, 0)
    return itemTime > currentTime
  }

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleGetDirections = (location: TodayTask['location']) => {
    if (location) {
      const address = `${location.address}, ${location.city}, ${location.state}`
      const encodedAddress = encodeURIComponent(address)
      window.open(`https://maps.google.com/maps?q=${encodedAddress}`, '_blank')
    }
  }

  const markCompleted = (id: string) => {
    setTodayItems(items =>
      items.map(item =>
        item.id === id ? { ...item, status: 'completed' } : item
      )
    )
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
                  key={item.id}
                  className={cn(
                    'p-4 border rounded-lg border-l-4 transition-colors',
                    getPriorityColor(item.priority),
                    item.status === 'completed' && 'opacity-60',
                    isUpcoming(item.time) && item.status === 'pending' && 'ring-2 ring-primary/20'
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
                          {item.time}
                          {item.duration && ` (${item.duration}min)`}
                        </span>
                        {isUpcoming(item.time) && item.status === 'pending' && (
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
                      {item.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                          <MapPin className="h-3 w-3" />
                          {item.location.address}, {item.location.city}
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
                          onClick={() => markCompleted(item.id)}
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

                      {item.location && (
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
              >
                <Calendar className="h-4 w-4" />
                Full Calendar
              </Button>
              <Button
                variant="outline"
                size={isFieldMode ? "lg" : "sm"}
                className="flex items-center gap-2"
              >
                <Route className="h-4 w-4" />
                Route Planner
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}