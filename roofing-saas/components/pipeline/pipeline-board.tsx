'use client'

import { useEffect, useState, useMemo } from 'react'
import { Project, PipelineStage } from '@/lib/types/api'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
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

const STAGES: Array<{ id: PipelineStage; name: string; color: string }> = [
  { id: 'prospect', name: 'Prospect', color: 'bg-gray-500' },
  { id: 'qualified', name: 'Qualified', color: 'bg-blue-500' },
  { id: 'quote_sent', name: 'Quote Sent', color: 'bg-purple-500' },
  { id: 'negotiation', name: 'Negotiation', color: 'bg-orange-500' },
  { id: 'won', name: 'Won', color: 'bg-green-500' },
  { id: 'production', name: 'Production', color: 'bg-cyan-500' },
  { id: 'complete', name: 'Complete', color: 'bg-emerald-600' },
  { id: 'lost', name: 'Lost', color: 'bg-red-500' },
]

// Quick filter categories
type QuickFilter = 'all' | 'active' | 'production' | 'closed'

const QUICK_FILTERS: Array<{ id: QuickFilter; name: string; stages: PipelineStage[] }> = [
  { id: 'all', name: 'All', stages: STAGES.map(s => s.id) },
  { id: 'active', name: 'Active Sales', stages: ['prospect', 'qualified', 'quote_sent', 'negotiation', 'won'] },
  { id: 'production', name: 'In Production', stages: ['production'] },
  { id: 'closed', name: 'Closed', stages: ['complete', 'lost'] },
]

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

export function PipelineBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStages, setSelectedStages] = useState<PipelineStage[]>(STAGES.map(s => s.id))
  const [validationError, setValidationError] = useState<ValidationError | null>(null)
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchProjects()
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

  function handleDragStart(event: DragStartEvent) {
    const project = projects.find((p) => p.id === event.active.id)
    setActiveProject(project || null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveProject(null)

    if (!over) return

    const projectId = active.id as string
    const newStage = over.id as PipelineStage
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

  const projectsByStage = STAGES.reduce(
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
    const filter = QUICK_FILTERS.find(f => f.id === filterId)
    if (filter) {
      setSelectedStages(filter.stages)
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
    <div className="flex flex-col h-full">
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
              {QUICK_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => handleQuickFilter(filter.id)}
                  className={`px-4 py-1.5 text-sm font-medium rounded-full transition-colors ${
                    quickFilter === filter.id
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {filter.name}
                  <span className={`ml-1.5 text-xs ${
                    quickFilter === filter.id ? 'text-white/70' : 'text-muted-foreground'
                  }`}>
                    ({projects.filter(p => filter.stages.includes(p.pipeline_stage)).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: Stage Toggles */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground mr-1">Stages:</span>
            {STAGES.map((stage) => (
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
            {(searchQuery || selectedStages.length !== STAGES.length) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedStages(STAGES.map(s => s.id))
                  setQuickFilter('all')
                }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline ml-1"
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
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 flex-1 overflow-x-auto">
          {STAGES.filter(stage => selectedStages.includes(stage.id)).map((stage) => {
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

        <DragOverlay>
          {activeProject ? <ProjectCard project={activeProject} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
