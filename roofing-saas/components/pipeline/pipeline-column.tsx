'use client'

import { Project, PipelineStage } from '@/lib/types/api'
import { ProjectCard } from './project-card'
import { Droppable, Draggable } from '@hello-pangea/dnd'

interface PipelineColumnProps {
  stage: {
    id: string
    name: string
    color: string
  }
  projects: Project[]
  onMoveProject?: (projectId: string, newStage: PipelineStage) => void
  onSubstatusChange?: (projectId: string, newSubstatus: string) => void
  isDragDisabled?: boolean
}

export function PipelineColumn({ stage, projects, onMoveProject, onSubstatusChange, isDragDisabled = false }: PipelineColumnProps) {
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

      {/* Cards Container - Droppable zone */}
      <Droppable droppableId={stage.id} isDropDisabled={isDragDisabled}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 rounded-b-lg border-x border-b border p-3 overflow-y-auto space-y-3 min-h-[200px] transition-colors ${
              snapshot.isDraggingOver
                ? 'bg-primary/10 border-primary/30'
                : 'bg-muted/30'
            }`}
          >
            {projects.map((project, index) => (
              <Draggable
                key={project.id}
                draggableId={project.id}
                index={index}
                isDragDisabled={isDragDisabled}
              >
                {(dragProvided, dragSnapshot) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    {...dragProvided.dragHandleProps}
                  >
                    <ProjectCard
                      project={project}
                      onMoveProject={onMoveProject}
                      onSubstatusChange={onSubstatusChange}
                      isDragging={dragSnapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {projects.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isDragDisabled ? 'No opportunities in this stage' : 'Drop opportunities here'}
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
