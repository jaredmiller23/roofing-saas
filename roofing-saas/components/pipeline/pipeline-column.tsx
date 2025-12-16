'use client'

import { Project, PipelineStage } from '@/lib/types/api'
import { ProjectCard } from './project-card'

interface PipelineColumnProps {
  stage: {
    id: string
    name: string
    color: string
  }
  projects: Project[]
  onMoveProject?: (projectId: string, newStage: PipelineStage) => void
  isDragDisabled?: boolean
}

export function PipelineColumn({ stage, projects, onMoveProject, isDragDisabled = false }: PipelineColumnProps) {
  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className="bg-card rounded-t-lg border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
            <h3 className="font-semibold text-foreground">{stage.name}</h3>
          </div>
          <span className="text-sm font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
            {projects.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 bg-muted/30 rounded-b-lg border-x border-b border p-3 overflow-y-auto space-y-3 min-h-[200px]">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            onMoveProject={onMoveProject}
            isDragDisabled={isDragDisabled}
          />
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {isDragDisabled ? 'No opportunities in this stage' : 'Drop opportunities here'}
          </div>
        )}
      </div>
    </div>
  )
}
