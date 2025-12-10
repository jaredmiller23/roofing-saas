'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { ProjectColumn } from './project-column'
import { ProjectCard } from './project-card'
import { Search, Filter } from 'lucide-react'

interface Project {
  id: string
  name: string
  project_number: string | null
  status: string
  type: string | null
  estimated_value: number
  approved_value: number
  final_value: number | null
  created_at: string
  estimated_start: string | null
  scheduled_start: string | null
  actual_start: string | null
  estimated_completion: string | null
  actual_completion: string | null
  assigned_to_name: string | null
  contact: {
    id: string
    first_name: string
    last_name: string
    email: string
    phone: string
  } | null
}

const STAGES = [
  { id: 'estimate', name: 'Estimate', color: 'bg-blue-500' },
  { id: 'approved', name: 'Approved', color: 'bg-purple-500' },
  { id: 'scheduled', name: 'Scheduled', color: 'bg-yellow-500' },
  { id: 'in_progress', name: 'In Progress', color: 'bg-orange-500' },
  { id: 'completed', name: 'Completed', color: 'bg-green-500' },
  { id: 'cancelled', name: 'Cancelled', color: 'bg-gray-500' },
]

// Quick filter categories
type QuickFilter = 'all' | 'active' | 'completed' | 'cancelled'

const QUICK_FILTERS: Array<{ id: QuickFilter; name: string; statuses: string[] }> = [
  { id: 'all', name: 'All', statuses: STAGES.map(s => s.id) },
  { id: 'active', name: 'Active', statuses: ['estimate', 'approved', 'scheduled', 'in_progress'] },
  { id: 'completed', name: 'Completed', statuses: ['completed'] },
  { id: 'cancelled', name: 'Cancelled', statuses: ['cancelled'] },
]

const PROJECTS_PER_COLUMN = 50 // Limit for performance

export function ProjectsKanbanBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStages, setSelectedStages] = useState<string[]>(
    STAGES.filter(s => s.id !== 'cancelled').map(s => s.id) // Hide cancelled by default
  )
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('active')

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
      // Fetch all projects for kanban view (increased limit to 2000)
      const response = await fetch('/api/projects?limit=2000')
      if (response.ok) {
        const result = await response.json()
        // Handle new response format: { success, data: { projects, ... } }
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
    const newStatus = over.id as string
    const project = projects.find((p) => p.id === projectId)

    if (!project || project.status === newStatus) return

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, status: newStatus } : p
      )
    )

    // Update on server
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update project')
      }
    } catch (error) {
      console.error('Failed to update project status:', error)
      // Revert on error
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, status: project.status } : p
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
        const name = project.name.toLowerCase()
        const projectNumber = project.project_number?.toLowerCase() || ''
        const contactName = project.contact
          ? `${project.contact.first_name} ${project.contact.last_name}`.toLowerCase()
          : ''

        if (!name.includes(query) && !projectNumber.includes(query) && !contactName.includes(query)) {
          return false
        }
      }

      return true
    })
  }, [projects, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading projects...</div>
      </div>
    )
  }

  const projectsByStage = STAGES.reduce(
    (acc, stage) => {
      if (!selectedStages.includes(stage.id)) {
        acc[stage.id] = []
        return acc
      }

      const stageProjects = filteredProjects.filter((p) => p.status === stage.id)
      // Limit projects per column for performance
      acc[stage.id] = stageProjects.slice(0, PROJECTS_PER_COLUMN)
      acc[`${stage.id}_total`] = stageProjects.length
      return acc
    },
    {} as Record<string, Project[] | number>
  )

  const toggleStage = (stageId: string) => {
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
      setSelectedStages(filter.statuses)
    }
  }

  // Calculate total value by stage
  const getTotalValue = (stageId: string) => {
    const stageProjects = projectsByStage[stageId] as Project[]
    if (!stageProjects) return 0
    return stageProjects.reduce((sum, project) => {
      const value = project.final_value || project.approved_value || project.estimated_value
      return sum + (value || 0)
    }, 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex flex-col gap-3">
          {/* Top row: Search and Quick Filters */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects by name, number, or contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter.name}
                  <span className={`ml-1.5 text-xs ${
                    quickFilter === filter.id ? 'text-blue-200' : 'text-gray-400'
                  }`}>
                    ({projects.filter(p => filter.statuses.includes(p.status)).length})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row: Stage Toggles */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-xs text-gray-500 mr-1">Statuses:</span>
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => toggleStage(stage.id)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors ${
                  selectedStages.includes(stage.id)
                    ? `${stage.color} text-white`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {stage.name}
              </button>
            ))}
            {/* Reset filters button */}
            {(searchQuery || selectedStages.length !== STAGES.length - 1) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedStages(STAGES.filter(s => s.id !== 'cancelled').map(s => s.id))
                  setQuickFilter('active')
                }}
                className="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 font-medium underline ml-1"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
          <span>Total: {projects.length} projects</span>
          {(searchQuery || quickFilter !== 'all') && (
            <span>Showing: {filteredProjects.filter(p => selectedStages.includes(p.status)).length} projects</span>
          )}
          <span>
            Pipeline Value:{' '}
            <span className="font-semibold text-green-700">
              {formatCurrency(
                filteredProjects.filter(p => selectedStages.includes(p.status)).reduce((sum, p) => {
                  const value = p.final_value || p.approved_value || p.estimated_value
                  return sum + (value || 0)
                }, 0)
              )}
            </span>
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 flex-1 overflow-x-auto">
          {STAGES.filter(stage => selectedStages.includes(stage.id)).map((stage) => {
            const stageProjects = projectsByStage[stage.id] as Project[]
            const totalInStage = projectsByStage[`${stage.id}_total`] as number
            const stageValue = getTotalValue(stage.id)

            return (
              <div key={stage.id} className="flex flex-col min-w-[300px]">
                {/* Column Header with Count and Value */}
                <div className="mb-2 px-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-semibold text-gray-700">{stage.name}</h3>
                    <span className="text-xs text-gray-500">
                      {stageProjects.length}
                      {totalInStage > PROJECTS_PER_COLUMN && ` of ${totalInStage}`}
                    </span>
                  </div>
                  {stageValue > 0 && (
                    <div className="text-xs font-semibold text-green-700">
                      {formatCurrency(stageValue)}
                    </div>
                  )}
                </div>

                <ProjectColumn
                  stage={stage}
                  projects={stageProjects || []}
                />

                {/* Show more indicator */}
                {totalInStage > PROJECTS_PER_COLUMN && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-500">
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
