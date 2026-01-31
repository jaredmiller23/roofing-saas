'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Briefcase, Calendar, DollarSign } from 'lucide-react'
import { SearchableSelect } from '@/components/ui/searchable-select'

interface Project {
  id: string
  name: string
}

interface JobFormProps {
  initialProjectId?: string
  job?: {
    id: string
    project_id: string | null
    job_type: string | null
    scheduled_date: string | null
    scheduled_start_time: string | null
    scheduled_end_time: string | null
    estimated_duration_hours: number | null
    status: string | null
    scope_of_work: string | null
    labor_cost: number | null
    material_cost: number | null
    equipment_cost: number | null
    other_costs: number | null
    notes: string | null
    internal_notes: string | null
    completion_percentage: number | null
  }
}

export function JobForm({ job, initialProjectId }: JobFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const [formData, setFormData] = useState({
    project_id: job?.project_id || initialProjectId || '',
    job_type: job?.job_type || 'roof_replacement',
    scheduled_date: job?.scheduled_date || '',
    scheduled_start_time: job?.scheduled_start_time || '',
    scheduled_end_time: job?.scheduled_end_time || '',
    estimated_duration_hours: job?.estimated_duration_hours?.toString() || '',
    status: job?.status || 'scheduled',
    scope_of_work: job?.scope_of_work || '',
    labor_cost: job?.labor_cost?.toString() || '',
    material_cost: job?.material_cost?.toString() || '',
    equipment_cost: job?.equipment_cost?.toString() || '',
    other_costs: job?.other_costs?.toString() || '',
    notes: job?.notes || '',
    internal_notes: job?.internal_notes || '',
    completion_percentage: job?.completion_percentage?.toString() || '0',
  })

  // Fetch projects for the dropdown
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true)
        const res = await fetch('/api/projects?limit=1000')
        const result = await res.json()

        if (res.ok && result.success) {
          const projectsData = result.data?.projects || result.projects || []
          setProjects(projectsData)
        } else {
          console.error('Failed to load projects:', result.error)
        }
      } catch (err) {
        console.error('Failed to fetch projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = job
        ? `/api/jobs/${job.id}`
        : '/api/jobs'
      const method = job ? 'PATCH' : 'POST'

      const payload = {
        ...formData,
        project_id: formData.project_id || null,
        estimated_duration_hours: formData.estimated_duration_hours ? parseFloat(formData.estimated_duration_hours) : null,
        labor_cost: formData.labor_cost ? parseFloat(formData.labor_cost) : null,
        material_cost: formData.material_cost ? parseFloat(formData.material_cost) : null,
        equipment_cost: formData.equipment_cost ? parseFloat(formData.equipment_cost) : null,
        other_costs: formData.other_costs ? parseFloat(formData.other_costs) : null,
        completion_percentage: parseInt(formData.completion_percentage),
        scheduled_date: formData.scheduled_date || null,
        scheduled_start_time: formData.scheduled_start_time || null,
        scheduled_end_time: formData.scheduled_end_time || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const result = await response.json()
        const message = result.error?.message || result.error || 'Failed to save job'
        throw new Error(message)
      }

      // Add timestamp to force jobs table to refetch (params change triggers useEffect)
      router.push(`/jobs?_t=${Date.now()}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Job Details */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Job Details</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Project
            </label>
            <SearchableSelect
              options={projects.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              value={formData.project_id}
              onValueChange={(value) => setFormData({ ...formData, project_id: value })}
              placeholder={loadingProjects ? 'Loading projects...' : 'Select a project (optional)'}
              searchPlaceholder="Search projects..."
              emptyMessage="No projects found."
              disabled={loadingProjects}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Leave blank if not associated with a specific project
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Job Type
              </label>
              <select
                value={formData.job_type}
                onChange={(e) => setFormData({ ...formData, job_type: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="roof_replacement">Roof Replacement</option>
                <option value="roof_repair">Roof Repair</option>
                <option value="inspection">Inspection</option>
                <option value="maintenance">Maintenance</option>
                <option value="emergency">Emergency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Scope of Work
            </label>
            <textarea
              value={formData.scope_of_work}
              onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe the work to be done..."
            />
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Scheduling</h2>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Scheduled Date
              </label>
              <input
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.scheduled_start_time}
                onChange={(e) => setFormData({ ...formData, scheduled_start_time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.scheduled_end_time}
                onChange={(e) => setFormData({ ...formData, scheduled_end_time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Estimated Duration (hours)
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.estimated_duration_hours}
                onChange={(e) => setFormData({ ...formData, estimated_duration_hours: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="8.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1">
                Completion %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.completion_percentage}
                onChange={(e) => setFormData({ ...formData, completion_percentage: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cost Tracking */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Cost Tracking</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Labor Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.labor_cost}
              onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Material Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.material_cost}
              onChange={(e) => setFormData({ ...formData, material_cost: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Equipment Cost
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.equipment_cost}
              onChange={(e) => setFormData({ ...formData, equipment_cost: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Other Costs
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.other_costs}
              onChange={(e) => setFormData({ ...formData, other_costs: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-card shadow-sm rounded-lg border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-6">Notes</h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="General job notes..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Internal notes (not visible to customers)..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-border rounded-md text-muted-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Saving...' : job ? 'Update Job' : 'Schedule Job'}
        </button>
      </div>
    </form>
  )
}
