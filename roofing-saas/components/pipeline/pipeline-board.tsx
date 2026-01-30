/* eslint-disable */
'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { Project, PipelineStage } from '@/lib/types/api'
import { PipelineColumn } from './pipeline-column'
import { ProjectCard } from './project-card'
import { Search, Filter, AlertCircle, X } from 'lucide-react'
import {
  isValidStageTransition,
  getTransitionError,
  validateStageRequirements,
  formatMissingFieldsError,
  STAGE_DISPLAY_NAMES,
} from '@/lib/pipeline/validation'
import { useRealtimeSubscription } from '@/lib/hooks/useRealtimeSubscription'
import { RealtimeToast } from '@/components/collaboration/RealtimeToast'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { hexToTailwindBg } from '@/lib/utils/colors'

// Default stages - used as fallback if DB fetch fails
const DEFAULT_STAGES: Array<{ id: PipelineStage; name: string; color: string }> = [
  { id: 'prospect', name: 'Prospect', color: 'bg-gray-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-500' },
  { id: 'quote_sent', name: 'Quote Sent', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
  { id: 'production', name: 'Production', color: 'bg-cyan-500' },
  { id: 'complete', name: 'Complete', color: 'bg-emerald-600' },
  { id: 'lost', name: 'Lost', color: 'bg-red-500' },
]

// Valid pipeline stage IDs for type checking
const VALID_STAGE_IDS: PipelineStage[] = [
  'prospect', 'qualified', 'quote_sent', 'negotiation',
  'won', 'production', 'complete', 'lost'
]

// Quick filter categories
type QuickFilter = 'all' | 'active' | 'production' | 'closed'

// Quick filter definitions with stage mappings
const QUICK_FILTER_STAGES: Record<QuickFilter, PipelineStage[]> = {
  all: VALID_STAGE_IDS,
  active: ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won'],
  production: ['production'],
  closed: ['complete', 'lost'],
}

const QUICK_FILTER_NAMES: Record<QuickFilter, string> = {
  all: 'All',
  active: 'Active Sales',
  production: 'In Production',
  closed: 'Closed',
}

const PROJECTS_PER_COLUMN = 50 // Limit for performance

// Format currency for display
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

interface ValidationError {
  message: string
  projectName: string
  fromStage: string
  toStage: string
}

// Database stage configuration type
interface DBPipelineStage {
  id: string
  name: string
  color: string
  stage_key: string
  stage_order: number
  stage_type: string
  is_active: boolean
}

export function PipelineBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [stages, setStages] = useState<Array<{ id: PipelineStage; name: string; color: string }>>(DEFAULT_STAGES)
  const [selectedStages, setSelectedStages] = useState<PipelineStage[]>(VALID_STAGE_IDS)
  const [validationError, setValidationError] = useState<ValidationError | null>(null)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const locallyDraggingRef = useRef<Set<string>>(new Set())
  const recentUpdatesRef = useRef<Map<string, number>>(new Map())

  useEffect(() => {
    fetchProjects()
    fetchStages()
  }, [])

  // Fetch pipeline stages from database
  async function fetchStages() {
    try {
      const response = await fetch('/api/settings/pipeline-stages')
      if (response.ok) {
        const result = await response.json()
        const dbStages: DBPipelineStage[] = result.data?.stages || result.stages || []

        if (dbStages.length > 0) {
          // Map DB stages to our format using stage_key for stable mapping
          const mappedStages = dbStages
            .filter(s => s.is_active !== false)
            .map(s => {
              const stageKey = (s.stage_key || '') as PipelineStage
              if (VALID_STAGE_IDS.includes(stageKey)) {
                return {
                  id: stageKey,
                  name: s.name,
                  color: hexToTailwindBg(s.color),
                }
              }
              return null
            })
            .filter((s): s is { id: PipelineStage; name: string; color: string } => s !== null)

          // Sort by stage_order from DB
          mappedStages.sort((a, b) => {
            const orderA = dbStages.find(s => s.stage_key === a.id)?.stage_order ?? 999
            const orderB = dbStages.find(s => s.stage_key === b.id)?.stage_order ?? 999
            return orderA - orderB
          })

          if (mappedStages.length > 0) {
            setStages(mappedStages)
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch pipeline stages:', error)
      // Keep using default stages on error
    }
  }

  // Get current user on mount
  useEffect(() => {
    async function getCurrentUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }
    }
    getCurrentUser()
  }, [])

  async function fetchProjects() {
    try {
      // Fetch all projects for pipeline view (increased limit to 2000)
      const response = await fetch('/api/projects?limit=2000')
      if (response.ok) {
        const result = await response.json()
        // Handle response format: { success, data: { projects, ... } } or { projects, ... }
        const data = result.data || result
        setProjects(data.projects || [])
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  // Real-time subscription for project updates
  useRealtimeSubscription({
    channelName: 'pipeline-board-projects',
    table: 'projects',
    event: 'UPDATE',
    onPayload: (payload: any) => {
      const updatedProject = payload.new as Project
      const oldProject = payload.old as Project

      if (updatedProject.pipeline_stage !== oldProject.pipeline_stage) {
        const projectId = updatedProject.id
        const now = Date.now()
        const recentUpdate = recentUpdatesRef.current.get(projectId)
        const isRecentLocalUpdate = recentUpdate && (now - recentUpdate) < 2000

        if (isRecentLocalUpdate || locallyDraggingRef.current.has(projectId)) {
          locallyDraggingRef.current.delete(projectId)
          return
        }

        setProjects((prev) => {
          const existingIndex = prev.findIndex((p) => p.id === projectId)
          if (existingIndex >= 0) {
            const newProjects = [...prev]
            newProjects[existingIndex] = updatedProject
            return newProjects
          }
          return prev
        })

        const projectName = updatedProject.name || 'Unnamed Project'
        const fromStage = STAGE_DISPLAY_NAMES[oldProject.pipeline_stage] || oldProject.pipeline_stage
        const toStage = STAGE_DISPLAY_NAMES[updatedProject.pipeline_stage] || updatedProject.pipeline_stage

        toast.custom((t) => (
          <RealtimeToast
            type="data-updated"
            title="Project moved"
            description={`${projectName} moved from ${fromStage} to ${toStage}`}
            duration={4000}
            onDismiss={() => toast.dismiss(t)}
          />
        ))
      }
    },
    onError: (error) => {
      console.error('Realtime subscription error:', error)
    },
  })

  // Function to handle moving projects between stages
  async function moveProject(projectId: string, newStage: PipelineStage) {
    const project = projects.find((p) => p.id === projectId)
    if (!project || project.pipeline_stage === newStage) return

    const currentStage = project.pipeline_stage as PipelineStage

    // Client-side validation
    if (!isValidStageTransition(currentStage, newStage)) {
      setValidationError({
        message: getTransitionError(currentStage, newStage),
        projectName: project.name || 'Unnamed Project',
        fromStage: STAGE_DISPLAY_NAMES[currentStage],
        toStage: STAGE_DISPLAY_NAMES[newStage],
      })
      // Auto-dismiss after 5 seconds
      setTimeout(() => setValidationError(null), 5000)
      return
    }

    // Check required fields
    const requirements = validateStageRequirements(newStage, {
      estimated_value: project.estimated_value,
      approved_value: project.approved_value,
    })
    if (!requirements.valid) {
      setValidationError({
        message: formatMissingFieldsError(requirements.missingFields),
        projectName: project.name || 'Unnamed Project',
        fromStage: STAGE_DISPLAY_NAMES[currentStage],
        toStage: STAGE_DISPLAY_NAMES[newStage],
      })
      setTimeout(() => setValidationError(null), 5000)
      return
    }

    // Track this update as local
    recentUpdatesRef.current.set(projectId, Date.now())

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, pipeline_stage: newStage } : p
      )
    )

    // Update on server
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipeline_stage: newStage }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        // Show server validation error
        setValidationError({
          message: errorData.error?.message || 'Failed to update project',
          projectName: project.name || 'Unnamed Project',
          fromStage: STAGE_DISPLAY_NAMES[currentStage],
          toStage: STAGE_DISPLAY_NAMES[newStage],
        })
        setTimeout(() => setValidationError(null), 5000)
        throw new Error(errorData.error?.message || 'Failed to update project')
      }
    } catch (error) {
      console.error('Failed to update project stage:', error)
      // Clean up tracking on error
      locallyDraggingRef.current.delete(projectId)
      recentUpdatesRef.current.delete(projectId)
      // Revert on error
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, pipeline_stage: project.pipeline_stage } : p
        )
      )
    }
  }

  // Filter projects based on search and selected stages
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const projectName = project.name?.toLowerCase() || ''
        const contactName = project.contact
          ? `${project.contact.first_name} ${project.contact.last_name}`.toLowerCase()
          : ''
        const email = project.contact?.email?.toLowerCase() || ''
        const phone = project.contact?.phone?.toLowerCase() || ''

        if (
          !projectName.includes(query) &&
          !contactName.includes(query) &&
          !email.includes(query) &&
          !phone.includes(query)
        ) {
          return false
        }
      }

      return true
    })
  }, [projects, searchQuery])

  // Calculate total pipeline value for visible projects
  // Must be called unconditionally (before loading check) to satisfy React hooks rules
  const totalPipelineValue = useMemo(() => {
    return filteredProjects
      .filter(p => selectedStages.includes(p.pipeline_stage))
      .reduce((sum, p) => {
        const value = p.final_value || p.approved_value || p.estimated_value
        return sum + (value || 0)
      }, 0)
  }, [filteredProjects, selectedStages])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading pipeline...</div>
      </div>
    )
  }

  const projectsByStage = stages.reduce(
    (acc, stage) => {
      if (!selectedStages.includes(stage.id)) {
        acc[stage.id] = []
        return acc
      }

      const stageProjects = filteredProjects.filter((p) => p.pipeline_stage === stage.id)
      // Limit projects per column for performance
      acc[stage.id] = stageProjects.slice(0, PROJECTS_PER_COLUMN)
      acc[`${stage.id}_total`] = stageProjects.length
      return acc
    },
    {} as Record<string, Project[] | number>
  )

  const toggleStage = (stageId: PipelineStage) => {
    setQuickFilter('all') // Reset quick filter when manually toggling stages
    setSelectedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    )
  }

  const handleQuickFilter = (filterId: QuickFilter) => {
    setQuickFilter(filterId)
    const filterStages = QUICK_FILTER_STAGES[filterId]
    if (filterStages) {
      setSelectedStages(filterStages)
    }
  }

  // Calculate value for a stage
  const getStageValue = (stageId: PipelineStage) => {
    const stageProjects = projectsByStage[stageId] as Project[]
    if (!stageProjects || stageProjects.length === 0) return 0
    return stageProjects.reduce((sum, project) => {
      const value = project.final_value || project.approved_value || project.estimated_value
      return sum + (value || 0)
    }, 0)
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Validation Error Banner */}
      {validationError && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
          <div className="mx-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <h4 className="text-sm font-semibold text-red-800">
                    Cannot Move &quot;{validationError.projectName}&quot;
                  </h4>
                  <button
                    onClick={() => setValidationError(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-red-700 mt-1">{validationError.message}</p>
                <p className="text-xs text-red-500 mt-2">
                  {validationError.fromStage} → {validationError.toStage}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header with Search and Filters */}
      <div className="p-4 bg-card border-b border">
        <div className="flex flex-col gap-3">
          {/* Top row: Search and Quick Filters */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search opportunities by name, contact, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-card border border-border rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
              />
            </div>

            {/* Quick Filter Chips */}
            <div className="flex items-center gap-2">
              {(Object.keys(QUICK_FILTER_NAMES) as QuickFilter[]).map((filterId) => (
                <button
                  key={filterId}
                  onClick={() => handleQuickFilter(filterId)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    quickFilter === filterId
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {QUICK_FILTER_NAMES[filterId]}
                  <span className={`ml-1.5 text-xs ${
                    quickFilter === filterId ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    ({projects.filter(p => QUICK_FILTER_STAGES[filterId].includes(p.pipeline_stage)).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: Stage Toggles */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Stages:</span>
            {stages.map((stage) => (
              <button
                key={stage.id}
                onClick={() => toggleStage(stage.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  selectedStages.includes(stage.id)
                    ? `${stage.color} text-white`
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {stage.name}
              </button>
            ))}
            {/* Reset filters button */}
            {(searchQuery || selectedStages.length !== stages.length) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedStages(stages.map(s => s.id))
                  setQuickFilter('all')
                }}
                className="px-2 py-1 text-xs text-primary hover:text-primary font-medium underline ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-6 text-sm text-muted-foreground">
          <span>Total: {projects.length} opportunities</span>
          {(searchQuery || quickFilter !== 'all') && (
            <span>Showing: {filteredProjects.filter(p => selectedStages.includes(p.pipeline_stage)).length} opportunities</span>
          )}
          <span>
            Pipeline Value:{' '}
            <span className="font-semibold text-green-700">
              {formatCurrency(totalPipelineValue)}
            </span>
          </span>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="flex gap-4 p-4 flex-1 overflow-x-auto">
        {stages.filter(stage => selectedStages.includes(stage.id)).map((stage) => {
          const stageProjects = projectsByStage[stage.id] as Project[]
          const totalInStage = projectsByStage[`${stage.id}_total`] as number

          const stageValue = getStageValue(stage.id)

          return (
            <div key={stage.id} className="flex flex-col min-w-[300px]">
              {/* Column Header with Count and Value */}
              <div className="mb-2 px-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold text-muted-foreground">{stage.name}</h3>
                  <span className="text-xs text-muted-foreground">
                    {stageProjects.length}
                    {totalInStage > PROJECTS_PER_COLUMN && ` of ${totalInStage}`}
                  </span>
                </div>
                <div className="text-xs font-semibold text-green-700 h-4">
                  {stageValue > 0 ? formatCurrency(stageValue) : '\u00A0'}
                </div>
              </div>

              <PipelineColumn
                stage={stage}
                projects={stageProjects || []}
                onMoveProject={moveProject}
                isDragDisabled={true}
              />

              {/* Show more indicator */}
              {totalInStage > PROJECTS_PER_COLUMN && (
                <div className="mt-2 text-center">
                  <p className="text-xs text-muted-foreground">
                    + {totalInStage - PROJECTS_PER_COLUMN} more (use search to find)
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
