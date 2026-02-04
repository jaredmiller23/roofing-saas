'use client'

import { useEffect, useState, useCallback } from 'react'
import { apiFetch } from '@/lib/api/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Phone,
  Mail,
  MessageSquare,
  FileText,
  Calendar,
  MapPin,
  Camera,
  Clock,
  ChevronDown,
  AlertCircle,
  Plus,
  Send,
  X,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ACTIVITY_TYPE_COLORS } from '@/lib/constants/activity-colors'

interface ActivityItem {
  id: string
  type: string
  subject: string | null
  content: string | null
  notes: string | null
  created_at: string | null
  created_by: string | null
  project_id: string | null
  contact_id: string | null
}

interface ContactActivityTimelineProps {
  contactId: string
}

const INITIAL_LIMIT = 10
const LOAD_MORE_LIMIT = 20

const activityConfig: Record<string, { icon: typeof Phone; label: string; color: string }> = {
  call: { icon: Phone, label: 'Call', color: ACTIVITY_TYPE_COLORS.call },
  email: { icon: Mail, label: 'Email', color: ACTIVITY_TYPE_COLORS.email },
  sms: { icon: MessageSquare, label: 'SMS', color: ACTIVITY_TYPE_COLORS.sms },
  note: { icon: FileText, label: 'Note', color: ACTIVITY_TYPE_COLORS.note },
  meeting: { icon: Calendar, label: 'Meeting', color: ACTIVITY_TYPE_COLORS.meeting },
  door_knock: { icon: MapPin, label: 'Door Knock', color: ACTIVITY_TYPE_COLORS.door_knock },
  photo: { icon: Camera, label: 'Photo', color: ACTIVITY_TYPE_COLORS.photo },
  task: { icon: FileText, label: 'Task', color: ACTIVITY_TYPE_COLORS.task },
}

const QUICK_TYPES = [
  { type: 'note', icon: FileText, label: 'Note' },
  { type: 'call', icon: Phone, label: 'Call' },
  { type: 'email', icon: Mail, label: 'Email' },
  { type: 'meeting', icon: Calendar, label: 'Meeting' },
  { type: 'door_knock', icon: MapPin, label: 'Knock' },
] as const

function getActivityConfig(type: string) {
  return activityConfig[type] || { icon: Clock, label: type.replace(/_/g, ' '), color: 'text-muted-foreground bg-muted' }
}

export function ContactActivityTimeline({ contactId }: ContactActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)

  // Activity input state
  const [showForm, setShowForm] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('note')
  const [activityContent, setActivityContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const fetchActivities = useCallback(async (limit: number, append = false) => {
    if (!append) setIsLoading(true)
    else setLoadingMore(true)
    setError(null)

    try {
      const result = await apiFetch<ActivityItem[]>(
        `/api/activities?contact_id=${contactId}&limit=${limit}`
      )
      const items = Array.isArray(result) ? result : []
      setActivities(items)
      setHasMore(items.length >= limit)
    } catch (err) {
      console.error('Failed to fetch contact activities:', err)
      setError('Failed to load activities')
    } finally {
      setIsLoading(false)
      setLoadingMore(false)
    }
  }, [contactId])

  useEffect(() => {
    fetchActivities(INITIAL_LIMIT)
  }, [fetchActivities])

  const handleLoadMore = () => {
    fetchActivities(activities.length + LOAD_MORE_LIMIT, true)
  }

  const handleSubmitActivity = async () => {
    if (!activityContent.trim()) return

    setIsSaving(true)
    setSaveError(null)

    try {
      const newActivity = await apiFetch<ActivityItem>('/api/activities', {
        method: 'POST',
        body: {
          type: selectedType,
          content: activityContent.trim(),
          contact_id: contactId,
        },
      })

      // Prepend new activity to the list
      setActivities(prev => [newActivity, ...prev])
      setActivityContent('')
      setShowForm(false)
    } catch (err) {
      console.error('Failed to create activity:', err)
      setSaveError(err instanceof Error ? err.message : 'Failed to save activity')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmitActivity()
    }
  }

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h2>
        <div className="space-y-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h2>
        <div className="flex flex-col items-center py-6 text-center">
          <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm mb-3">{error}</p>
          <Button onClick={() => fetchActivities(INITIAL_LIMIT)} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Activity Timeline</h2>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Log Activity
          </Button>
        )}
      </div>

      {/* Activity Input Form */}
      {showForm && (
        <div className="mb-4 border border-border rounded-lg p-3">
          {/* Type selector */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {QUICK_TYPES.map(({ type, icon: TypeIcon, label }) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  selectedType === type
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <TypeIcon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Content input */}
          <textarea
            value={activityContent}
            onChange={(e) => setActivityContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Add a ${getActivityConfig(selectedType).label.toLowerCase()}...`}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={2}
            autoFocus
          />

          {saveError && (
            <p className="text-xs text-red-500 mt-1">{saveError}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {navigator.platform.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to save
            </p>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  setShowForm(false)
                  setActivityContent('')
                  setSaveError(null)
                }}
                variant="ghost"
                size="sm"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmitActivity}
                size="sm"
                disabled={!activityContent.trim() || isSaving}
              >
                <Send className="h-3.5 w-3.5 mr-1" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {activities.length === 0 && !showForm ? (
        <div className="flex flex-col items-center py-6 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No activity recorded yet</p>
          <p className="text-muted-foreground text-xs mt-1">
            Calls, emails, notes, and other interactions will appear here
          </p>
          <Button
            onClick={() => setShowForm(true)}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            <Plus className="h-4 w-4 mr-1" />
            Log first activity
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.type)
              const Icon = config.icon
              const displayText = activity.subject || activity.notes || activity.content || config.label

              return (
                <div key={activity.id} className="flex items-start gap-3 relative">
                  {/* Icon */}
                  <div className={`relative z-10 p-1.5 rounded-full flex-shrink-0 ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 -mt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {displayText}
                        </p>
                        {activity.subject && (activity.notes || activity.content) && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {activity.notes || activity.content}
                          </p>
                        )}
                      </div>
                      <Badge variant="outline" className="text-xs flex-shrink-0 capitalize">
                        {config.label}
                      </Badge>
                    </div>
                    {activity.created_at && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load More */}
          {hasMore && (
            <div className="mt-4 text-center">
              <Button
                onClick={handleLoadMore}
                variant="ghost"
                size="sm"
                disabled={loadingMore}
                className="text-muted-foreground"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {loadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
