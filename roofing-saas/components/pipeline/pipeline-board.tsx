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
import { Search, Filter } from 'lucide-react'

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

const PROJECTS_PER_COLUMN = 50 // Limit for performance

export function PipelineBoard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [activeProject, setActiveProject] = useState<Project | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStages, setSelectedStages] = useState<PipelineStage[]>(STAGES.map(s => s.id))

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
        throw new Error('Failed to update project')
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600">Loading pipeline...</div>
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
    setSelectedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((id) => id !== stageId)
        : [...prev, stageId]
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Search and Filters */}
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search opportunities by name, contact, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Stage Filter Toggles */}
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                onClick={() => toggleStage(stage.id)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedStages.includes(stage.id)
                    ? `${stage.color} text-white`
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                }}
                className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium underline ml-2"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center gap-6 text-sm text-gray-600">
          <span>Total: {projects.length} opportunities</span>
          {searchQuery && (
            <span>Filtered: {filteredProjects.length} opportunities</span>
          )}
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

            return (
              <div key={stage.id} className="flex flex-col min-w-[300px]">
                {/* Column Header with Count */}
                <div className="mb-2 px-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700">{stage.name}</h3>
                    <span className="text-xs text-gray-500">
                      {stageProjects.length}
                      {totalInStage > PROJECTS_PER_COLUMN && ` of ${totalInStage}`}
                    </span>
                  </div>
                </div>

                <PipelineColumn
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
