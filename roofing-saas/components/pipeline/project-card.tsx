'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { Project } from '@/lib/types/api'
import Link from 'next/link'
import { Phone, MessageSquare, Mail, DollarSign, TrendingUp, Clock, User, Play, X, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { PipelineStage } from '@/lib/types/api'

interface ProjectCardProps {
  project: Project
  isDragging?: boolean
}

// Active sales stages where Mark Lost button should appear
const ACTIVE_SALES_STAGES: PipelineStage[] = ['prospect', 'qualified', 'quote_sent', 'negotiation']

export function ProjectCard({ project, isDragging = false }: ProjectCardProps) {
  const router = useRouter()
  const [startingProduction, setStartingProduction] = useState(false)
  const [markingLost, setMarkingLost] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: project.id,
  })

  const handleStartProduction = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (startingProduction) return

    try {
      setStartingProduction(true)
      const response = await fetch(`/api/projects/${project.id}/start-production`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_type: 'roof_replacement' }),
      })

      if (response.ok) {
        const data = await response.json()
        // Navigate to the newly created job
        if (data.job?.id) {
          router.push(`/jobs/${data.job.id}`)
        } else {
          // Refresh the page to show updated pipeline
          router.refresh()
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to start production')
      }
    } catch (error) {
      console.error('Error starting production:', error)
      alert('Failed to start production. Please try again.')
    } finally {
      setStartingProduction(false)
    }
  }

  const handleMarkLost = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (markingLost) return

    // Confirm before marking as lost
    if (!confirm('Are you sure you want to mark this opportunity as lost?')) {
      return
    }

    try {
      setMarkingLost(true)
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: 'lost' }),
      })

      if (response.ok) {
        // Refresh the page to show updated pipeline
        router.refresh()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to mark as lost')
      }
    } catch (error) {
      console.error('Error marking as lost:', error)
      alert('Failed to mark as lost. Please try again.')
    } finally {
      setMarkingLost(false)
    }
  }

  const handleReactivate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (reactivating) return

    try {
      setReactivating(true)
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: 'prospect' }),
      })

      if (response.ok) {
        // Refresh the page to show updated pipeline
        router.refresh()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Failed to reactivate opportunity')
      }
    } catch (error) {
      console.error('Error reactivating:', error)
      alert('Failed to reactivate. Please try again.')
    } finally {
      setReactivating(false)
    }
  }

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined

  const formatCurrency = (value?: number | null) => {
    if (!value) return null
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const getTimeSince = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    const diffInWeeks = Math.floor(diffInDays / 7)
    return `${diffInWeeks}w ago`
  }

  // Calculate days in current pipeline stage
  const getDaysInStage = (stageChangedAt?: string) => {
    if (!stageChangedAt) return null
    const date = new Date(stageChangedAt)
    const now = new Date()
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    return diffInDays
  }

  // Get color for days-in-stage badge based on urgency
  const getDaysInStageColor = (days: number) => {
    if (days <= 3) return 'bg-green-100 text-green-700' // Fresh
    if (days <= 7) return 'bg-yellow-100 text-yellow-700' // Needs attention
    if (days <= 14) return 'bg-orange-100 text-orange-700' // Getting stale
    return 'bg-red-100 text-red-700' // Urgent
  }

  const daysInStage = getDaysInStage(project.stage_changed_at)

  const getLeadScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground bg-gray-50'
    if (score >= 80) return 'text-green-600 bg-green-50'
    if (score >= 60) return 'text-blue-600 bg-blue-50'
    if (score >= 40) return 'text-yellow-600 bg-yellow-50'
    return 'text-muted-foreground bg-gray-50'
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'low':
        return 'bg-muted text-muted-foreground'
      default:
        return null // Don't show normal priority
    }
  }

  const contactName = project.contact
    ? `${project.contact.first_name} ${project.contact.last_name}`
    : 'No contact'

  const contactPhone = project.contact?.phone
  const contactEmail = project.contact?.email

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        bg-card rounded-lg border border p-4
        hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
      `}
    >
      {/* Header: Project Name + Lead Score */}
      <div className="flex items-start justify-between mb-2">
        <Link
          href={`/projects/${project.id}`}
          className="font-semibold text-foreground hover:text-blue-600 flex-1"
          onClick={(e) => e.stopPropagation()}
        >
          {project.name || 'Untitled Project'}
        </Link>
        {project.lead_score && project.lead_score > 0 && (
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${getLeadScoreColor(project.lead_score)}`}>
            <TrendingUp className="h-3 w-3" />
            {project.lead_score}
          </div>
        )}
      </div>

      {/* Contact Name */}
      <div className="flex items-center gap-1.5 mb-3 text-sm text-muted-foreground">
        <User className="h-3.5 w-3.5" />
        <Link
          href={`/contacts/${project.contact_id}`}
          className="hover:text-blue-600"
          onClick={(e) => e.stopPropagation()}
        >
          {contactName}
        </Link>
      </div>

      {/* Estimated Value */}
      {(project.budget || project.actual_cost) && (
        <div className="flex items-center gap-1.5 mb-2 text-lg font-bold text-green-700">
          <DollarSign className="h-4 w-4" />
          {formatCurrency(project.budget || project.actual_cost)}
        </div>
      )}

      {/* Contact Details */}
      <div className="space-y-1 text-sm text-muted-foreground">
        {contactEmail && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="truncate">{contactEmail}</span>
          </div>
        )}

        {contactPhone && (
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <span>{contactPhone}</span>
          </div>
        )}

        {project.lead_source && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Source:</span>
            <span className="font-medium capitalize">{project.lead_source}</span>
          </div>
        )}
      </div>

      {/* Priority + Days in Stage + Last Updated */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {project.priority && getPriorityBadge(project.priority) && (
            <span
              className={`inline-block px-2 py-1 text-xs font-semibold rounded capitalize ${getPriorityBadge(project.priority)}`}
            >
              {project.priority}
            </span>
          )}
          {/* Days in Stage Badge */}
          {daysInStage !== null && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded ${getDaysInStageColor(daysInStage)}`}
              title={`${daysInStage} day${daysInStage !== 1 ? 's' : ''} in this stage`}
            >
              <Clock className="h-3 w-3" />
              {daysInStage}d
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Last updated">
          {getTimeSince(project.updated_at)}
        </div>
      </div>

      {/* Start Production Button - Only for Won stage */}
      {project.pipeline_stage === 'won' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleStartProduction}
            disabled={startingProduction}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            {startingProduction ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Starting...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Production
              </>
            )}
          </button>
        </div>
      )}

      {/* Mark Lost Button - Only for active sales stages */}
      {ACTIVE_SALES_STAGES.includes(project.pipeline_stage as PipelineStage) && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleMarkLost}
            disabled={markingLost}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-red-50 hover:text-red-700 disabled:bg-gray-50 text-muted-foreground rounded-md text-sm font-medium transition-colors"
          >
            {markingLost ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                Updating...
              </>
            ) : (
              <>
                <X className="h-4 w-4" />
                Mark as Lost
              </>
            )}
          </button>
        </div>
      )}

      {/* Reactivate Button - Only for lost deals */}
      {project.pipeline_stage === 'lost' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={handleReactivate}
            disabled={reactivating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md text-sm font-medium transition-colors"
          >
            {reactivating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Reactivating...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Reactivate
              </>
            )}
          </button>
        </div>
      )}

      {/* Quick Actions - Mobile Friendly */}
      {(contactPhone || contactEmail) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          {contactPhone && (
            <>
              <a
                href={`tel:${contactPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-md text-xs font-medium transition-colors"
                title="Call"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Call</span>
              </a>
              <a
                href={`sms:${contactPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md text-xs font-medium transition-colors"
                title="Text"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Text</span>
              </a>
            </>
          )}
          {contactEmail && (
            <a
              href={`mailto:${contactEmail}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md text-xs font-medium transition-colors"
              title="Email"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Email</span>
            </a>
          )}
        </div>
      )}
    </div>
  )
}
