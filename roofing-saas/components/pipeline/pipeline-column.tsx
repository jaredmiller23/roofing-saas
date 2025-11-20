'use client'

import { useDroppable } from '@dnd-kit/core'
import { Project } from '@/lib/types/api'
import { ProjectCard } from './project-card'

interface PipelineColumnProps {
  stage: {
    id: string
    name: string
    color: string
  }
  projects: Project[]
}

export function PipelineColumn({ stage, projects }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  return (
    <div className="flex-shrink-0 w-80 flex flex-col">
      {/* Column Header */}
      <div className="bg-white rounded-t-lg border border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${stage.color}`} />
            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
          </div>
          <span className="text-sm font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {projects.length}
          </span>
        </div>
      </div>

      {/* Cards Container */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 bg-gray-50 rounded-b-lg border-x border-b border-gray-200
          p-3 overflow-y-auto space-y-3 min-h-[200px]
          ${isOver ? 'bg-blue-50 border-blue-300' : ''}
        `}
      >
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}

        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            Drop opportunities here
          </div>
        )}
      </div>
    </div>
  )
}
