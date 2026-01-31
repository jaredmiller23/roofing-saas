'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { STAGE_DISPLAY_NAMES } from '@/lib/pipeline/validation'
import type { PipelineStage } from '@/lib/types/api'
import { apiFetch } from '@/lib/api/client'

interface Project {
  id: string
  name: string
  project_number: string | null
  status: string
  pipeline_stage: PipelineStage
  type: string | null
  estimated_value: number | null
  approved_value: number | null
  final_value: number | null
  profit_margin: number | null
  description: string | null
  scope_of_work: string | null
  created_at: string
  updated_at: string
  estimated_start: string | null
  actual_start: string | null
  actual_completion: string | null
  custom_fields: {
    lead_source?: string
    [key: string]: unknown
  } | null
  contact_id: string | null
}

interface FormData {
  name: string
  description: string
  scope_of_work: string
  type: string
  estimated_value: string
  approved_value: string
  final_value: string
  estimated_start: string
  pipeline_stage: PipelineStage
  lead_source: string
}

const PROJECT_TYPES = [
  { value: 'roof_replacement', label: 'Roof Replacement' },
  { value: 'roof_repair', label: 'Roof Repair' },
  { value: 'gutter_installation', label: 'Gutter Installation' },
  { value: 'siding_replacement', label: 'Siding Replacement' },
  { value: 'storm_damage_repair', label: 'Storm Damage Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
]

const LEAD_SOURCES = [
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'door_to_door', label: 'Door to Door' },
  { value: 'insurance_claim', label: 'Insurance Claim' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'yellow_pages', label: 'Yellow Pages' },
  { value: 'other', label: 'Other' },
]

const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'prospect', label: STAGE_DISPLAY_NAMES.prospect },
  { value: 'qualified', label: STAGE_DISPLAY_NAMES.qualified },
  { value: 'quote_sent', label: STAGE_DISPLAY_NAMES.quote_sent },
  { value: 'negotiation', label: STAGE_DISPLAY_NAMES.negotiation },
  { value: 'won', label: STAGE_DISPLAY_NAMES.won },
  { value: 'lost', label: STAGE_DISPLAY_NAMES.lost },
  { value: 'production', label: STAGE_DISPLAY_NAMES.production },
  { value: 'complete', label: STAGE_DISPLAY_NAMES.complete },
]

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    scope_of_work: '',
    type: '',
    estimated_value: '',
    approved_value: '',
    final_value: '',
    estimated_start: '',
    pipeline_stage: 'prospect',
    lead_source: '',
  })

  useEffect(() => {
    fetchProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  async function fetchProject() {
    try {
      setLoading(true)
      const projectData = await apiFetch<Project>(`/api/projects/${projectId}`)

      setProject(projectData)

      // Populate form with existing data
      setFormData({
        name: projectData.name || '',
        description: projectData.description || '',
        scope_of_work: projectData.scope_of_work || '',
        type: projectData.type || '',
        estimated_value: projectData.estimated_value?.toString() || '',
        approved_value: projectData.approved_value?.toString() || '',
        final_value: projectData.final_value?.toString() || '',
        estimated_start: projectData.estimated_start ? projectData.estimated_start.split('T')[0] : '',
        pipeline_stage: projectData.pipeline_stage || 'prospect',
        lead_source: projectData.custom_fields?.lead_source || '',
      })
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('Project name is required')
      return
    }

    try {
      setSaving(true)

      const updateData: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        scope_of_work: formData.scope_of_work.trim() || null,
        type: formData.type || null,
        pipeline_stage: formData.pipeline_stage,
        estimated_start: formData.estimated_start || null,
      }

      // Handle numeric fields
      if (formData.estimated_value) {
        const estimatedValue = parseFloat(formData.estimated_value)
        if (!isNaN(estimatedValue)) {
          updateData.estimated_value = estimatedValue
        }
      }

      if (formData.approved_value) {
        const approvedValue = parseFloat(formData.approved_value)
        if (!isNaN(approvedValue)) {
          updateData.approved_value = approvedValue
        }
      }

      if (formData.final_value) {
        const finalValue = parseFloat(formData.final_value)
        if (!isNaN(finalValue)) {
          updateData.final_value = finalValue
        }
      }

      // Handle custom fields
      const customFields = { ...project?.custom_fields }
      if (formData.lead_source) {
        customFields.lead_source = formData.lead_source
      }
      updateData.custom_fields = customFields

      await apiFetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        body: updateData,
      })

      toast.success('Project updated successfully')
      router.push(`/projects/${projectId}`)
    } catch (error) {
      console.error('Failed to update project:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update project')
    } finally {
      setSaving(false)
    }
  }

  const formatCurrency = (value: string) => {
    if (!value) return ''
    const numValue = parseFloat(value)
    if (isNaN(numValue)) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>Project not found</AlertDescription>
          </Alert>
          <Link href="/projects" className="text-primary hover:text-primary/80 mt-4 inline-block">
            ← Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Edit Project</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Update project details and settings
              </p>
            </div>
            <div className="flex gap-3">
              <Link href={`/projects/${projectId}`}>
                <Button variant="outline">Cancel</Button>
              </Link>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Essential project details and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter project name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Project Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select project type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Type Selected</SelectItem>
                      {PROJECT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the project..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="scope_of_work">Scope of Work</Label>
                <Textarea
                  id="scope_of_work"
                  value={formData.scope_of_work}
                  onChange={(e) => setFormData(prev => ({ ...prev, scope_of_work: e.target.value }))}
                  placeholder="Define the scope of work..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Pipeline & Status */}
          <Card>
            <CardHeader>
              <CardTitle>Pipeline & Status</CardTitle>
              <CardDescription>
                Project stage and lead information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pipeline_stage">Pipeline Stage</Label>
                  <Select
                    value={formData.pipeline_stage}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pipeline_stage: value as PipelineStage }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Select
                    value={formData.lead_source}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, lead_source: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select lead source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No Source Selected</SelectItem>
                      {LEAD_SOURCES.map((source) => (
                        <SelectItem key={source.value} value={source.value}>
                          {source.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Financial Information</CardTitle>
              <CardDescription>
                Project values and pricing details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="estimated_value">Estimated Value</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimated_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_value: e.target.value }))}
                    placeholder="0.00"
                  />
                  {formData.estimated_value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(formData.estimated_value)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="approved_value">Approved Value</Label>
                  <Input
                    id="approved_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.approved_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, approved_value: e.target.value }))}
                    placeholder="0.00"
                  />
                  {formData.approved_value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(formData.approved_value)}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="final_value">Final Value</Label>
                  <Input
                    id="final_value"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.final_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, final_value: e.target.value }))}
                    placeholder="0.00"
                  />
                  {formData.final_value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(formData.final_value)}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>
                Important project dates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimated_start">Estimated Start Date</Label>
                  <Input
                    id="estimated_start"
                    type="date"
                    value={formData.estimated_start}
                    onChange={(e) => setFormData(prev => ({ ...prev, estimated_start: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}