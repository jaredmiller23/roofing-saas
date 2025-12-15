'use client'

/**
 * Project Form Component - Placeholder
 * Full implementation in SPRINT3-003
 */

interface ProjectFormProps {
  mode?: 'create' | 'edit'
  projectId?: string
}

export function ProjectForm({ mode = 'create' }: ProjectFormProps) {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-muted-foreground">
        Project form - {mode} mode. Template selection coming soon.
      </p>
    </div>
  )
}
