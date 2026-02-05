'use client'

import { useState } from 'react'
import { Project, PipelineStage } from '@/lib/types/api'
import { Link } from '@/lib/i18n/navigation'
import { Phone, MessageSquare, Mail, DollarSign, TrendingUp, Clock, User, Play, X, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from '@/lib/i18n/navigation'
import { apiFetch } from '@/lib/api/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ProjectSubstatusManager } from './ProjectSubstatusManager'

interface ProjectCardProps {
  project: Project
  isDragging?: boolean
  onMoveProject?: (projectId: string, newStage: PipelineStage) => void
  onSubstatusChange?: (projectId: string, newSubstatus: string) => void
}

// Active sales stages where Mark Lost button should appear
const ACTIVE_SALES_STAGES: PipelineStage[] = ['prospect', 'qualified', 'quote_sent', 'negotiation']

// Define stage order for navigation
const STAGE_ORDER: PipelineStage[] = ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won', 'production', 'complete', 'lost']

export function ProjectCard({ project, isDragging = false, onMoveProject, onSubstatusChange }: ProjectCardProps) {
  const router = useRouter()
  const [startingProduction, setStartingProduction] = useState(false)
  const [markingLost, setMarkingLost] = useState(false)
  const [reactivating, setReactivating] = useState(false)

  const handleStartProduction = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (startingProduction) return

    try {
      setStartingProduction(true)
      const data = await apiFetch<{ job?: { id: string } }>(`/api/projects/${project.id}/start-production`, {
        method: 'POST',
        body: { job_type: 'roof_replacement' },
      })

      // Navigate to the newly created job
      if (data.job?.id) {
        router.push(`/jobs/${data.job.id}`)
      } else {
        // Refresh the page to show updated pipeline
        router.refresh()
      }
    } catch (error) {
      console.error('Error starting production:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start production. Please try again.')
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
      // Delegate to parent — moveProject handles API call, optimistic update, and rollback
      if (onMoveProject) {
        await onMoveProject(project.id, 'lost')
      }
    } catch (error) {
      console.error('Error marking as lost:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to mark as lost. Please try again.')
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
      // Delegate to parent — moveProject handles API call, optimistic update, and rollback
      if (onMoveProject) {
        await onMoveProject(project.id, 'prospect')
      }
    } catch (error) {
      console.error('Error reactivating:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate. Please try again.')
    } finally {
      setReactivating(false)
    }
  }

  // Get possible stage movements
  const currentStageIndex = STAGE_ORDER.indexOf(project.pipeline_stage)
  const canMovePrevious = currentStageIndex > 0 && STAGE_ORDER[currentStageIndex - 1] !== 'lost'
  const canMoveNext = currentStageIndex >= 0 && currentStageIndex < STAGE_ORDER.length - 1 && STAGE_ORDER[currentStageIndex + 1] !== 'lost'
  const previousStage = canMovePrevious ? STAGE_ORDER[currentStageIndex - 1] : null
  const nextStage = canMoveNext ? STAGE_ORDER[currentStageIndex + 1] : null

  const handleMoveToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (previousStage && onMoveProject) {
      onMoveProject(project.id, previousStage)
    }
  }

  const handleMoveToNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (nextStage && onMoveProject) {
      onMoveProject(project.id, nextStage)
    }
  }

  const formatCurrency = (value?: number | null) => {
    if (value == null) return null
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
    if (days <= 3) return 'bg-green-500/20 text-green-600 dark:text-green-400' // Fresh
    if (days <= 7) return 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' // Needs attention
    if (days <= 14) return 'bg-orange-500/20 text-orange-600 dark:text-orange-400' // Getting stale
    return 'bg-red-500/20 text-red-600 dark:text-red-400' // Urgent
  }

  const daysInStage = getDaysInStage(project.stage_changed_at)

  const getLeadScoreColor = (score?: number) => {
    if (!score) return 'text-muted-foreground bg-muted'
    if (score >= 80) return 'text-green-400 bg-green-500/20'
    if (score >= 60) return 'text-blue-400 bg-blue-500/20'
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20'
    return 'text-muted-foreground bg-muted'
  }

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/20 text-red-600 dark:text-red-400'
      case 'high':
        return 'bg-orange-500/20 text-orange-600 dark:text-orange-400'
      case 'low':
        return 'bg-muted text-muted-foreground'
      default:
        return null // Don't show normal priority
    }
  }

  const contactName = project.contact
    ? `${project.contact.first_name || ''} ${project.contact.last_name || ''}`.trim() || 'Unnamed Contact'
    : 'No contact'

  const contactPhone = project.contact?.phone
  const contactEmail = project.contact?.email

  return (
    <div
      className={`
        bg-card rounded-lg border p-4
        hover:shadow-md transition-shadow
        ${isDragging ? 'opacity-50 rotate-3 shadow-lg' : ''}
      `}
    >
      {/* Header: Project Name + Lead Score */}
      <div className="flex items-start justify-between mb-2">
        <Link
          href={`/projects/${project.id}`}
          className="font-semibold text-foreground hover:text-primary flex-1"
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
        {project.contact_id ? (
          <Link
            href={`/contacts/${project.contact_id}`}
            className="hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            {contactName}
          </Link>
        ) : (
          <span>{contactName}</span>
        )}
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

      {/* Substatus Selector */}
      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
        <ProjectSubstatusManager
          projectId={project.id}
          status={project.status}
          currentSubstatus={project.substatus || null}
          onSubstatusUpdated={(newSubstatus) => onSubstatusChange?.(project.id, newSubstatus)}
          className="w-full"
        />
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

      {/* Stage Navigation - Always available as explicit affordance + mobile fallback */}
      {onMoveProject && (previousStage || nextStage) && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            {previousStage ? (
              <button
                onClick={handleMoveToPrevious}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-muted hover:bg-muted/80 text-muted-foreground rounded text-xs font-medium transition-colors"
                title={`Move to ${previousStage}`}
              >
                <ChevronLeft className="h-3 w-3" />
                <span className="capitalize">{previousStage.replace('_', ' ')}</span>
              </button>
            ) : (
              <div className="flex-1" />
            )}
            {nextStage ? (
              <button
                onClick={handleMoveToNext}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-xs font-medium transition-colors"
                title={`Move to ${nextStage}`}
              >
                <span className="capitalize">{nextStage.replace('_', ' ')}</span>
                <ChevronRight className="h-3 w-3" />
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        </div>
      )}

      {/* Start Production Button - Only for Won stage */}
      {project.pipeline_stage === 'won' && (
        <div className="mt-3 pt-3 border-t border-border">
          <Button
            onClick={handleStartProduction}
            disabled={startingProduction}
            variant="success"
            className="w-full"
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
          </Button>
        </div>
      )}

      {/* Mark Lost Button - Only for active sales stages */}
      {ACTIVE_SALES_STAGES.includes(project.pipeline_stage as PipelineStage) && (
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={handleMarkLost}
            disabled={markingLost}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-muted hover:bg-red-500/20 hover:text-red-400 disabled:bg-muted/50 text-muted-foreground rounded-md text-sm font-medium transition-colors"
          >
            {markingLost ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-muted-foreground border-t-transparent" />
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
        <div className="mt-3 pt-3 border-t border-border">
          <button
            onClick={handleReactivate}
            disabled={reactivating}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-md text-sm font-medium transition-colors"
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
        <div className="mt-3 pt-3 border-t border-border flex gap-2">
          {contactPhone && (
            <>
              <a
                href={`tel:${contactPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-md text-xs font-medium transition-colors"
                title="Call"
              >
                <Phone className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Call</span>
              </a>
              <a
                href={`sms:${contactPhone}`}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/20 hover:bg-primary/30 text-primary rounded-md text-xs font-medium transition-colors"
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
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-secondary/20 hover:bg-secondary/30 text-secondary rounded-md text-xs font-medium transition-colors"
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
