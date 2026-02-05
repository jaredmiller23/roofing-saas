'use client'

import { useState, useEffect } from 'react'
import { useRouter } from '@/lib/i18n/navigation'
import { useParams } from 'next/navigation'
import { Link } from '@/lib/i18n/navigation'
import { useForm, Controller, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { projectEditSchema, type ProjectEditInput } from '@/lib/validations/project'
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

// Clean form data before Zod validation
function cleanFormData(data: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = { ...data }
  const numberFields = ['estimated_value', 'approved_value', 'final_value']
  const optionalStringFields = ['type', 'lead_source', 'description', 'scope_of_work', 'estimated_start']

  for (const key of Object.keys(cleaned)) {
    const value = cleaned[key]
    if (typeof value === 'number' && isNaN(value)) {
      cleaned[key] = undefined
    }
    if (numberFields.includes(key) && value === '') {
      cleaned[key] = undefined
    }
    if (optionalStringFields.includes(key) && value === '') {
      cleaned[key] = undefined
    }
  }
  return cleaned
}

const projectEditResolver: Resolver<ProjectEditInput> = async (values, context, options) => {
  const cleanedValues = cleanFormData(values) as ProjectEditInput
  return zodResolver(projectEditSchema)(cleanedValues, context, options)
}

export default function EditProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectEditInput>({
    resolver: projectEditResolver,
    defaultValues: {
      name: '',
      description: '',
      scope_of_work: '',
      type: '',
      estimated_value: undefined,
      approved_value: undefined,
      final_value: undefined,
      estimated_start: '',
      pipeline_stage: 'prospect',
      lead_source: '',
    },
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

      // Populate form with existing data via reset
      reset({
        name: projectData.name || '',
        description: projectData.description || '',
        scope_of_work: projectData.scope_of_work || '',
        type: projectData.type || '',
        estimated_value: projectData.estimated_value ?? undefined,
        approved_value: projectData.approved_value ?? undefined,
        final_value: projectData.final_value ?? undefined,
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

  const onSubmit = async (data: ProjectEditInput) => {
    try {
      const updateData: Record<string, unknown> = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        scope_of_work: data.scope_of_work?.trim() || null,
        type: data.type || null,
        pipeline_stage: data.pipeline_stage,
        estimated_start: data.estimated_start || null,
      }

      // Handle numeric fields
      if (data.estimated_value != null) {
        updateData.estimated_value = data.estimated_value
      }
      if (data.approved_value != null) {
        updateData.approved_value = data.approved_value
      }
      if (data.final_value != null) {
        updateData.final_value = data.final_value
      }

      // Handle custom fields
      const customFields = { ...project?.custom_fields }
      if (data.lead_source) {
        customFields.lead_source = data.lead_source
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
    }
  }

  const estimatedValue = watch('estimated_value')
  const approvedValue = watch('approved_value')
  const finalValue = watch('final_value')

  const formatCurrency = (value: number | undefined | null) => {
    if (value == null) return ''
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
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
              <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
                {isSubmitting ? (
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                    {...register('name')}
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="type">Project Type</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
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
                    )}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register('description')}
                  placeholder="Describe the project..."
                  rows={3}
                />
                {errors.description && (
                  <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="scope_of_work">Scope of Work</Label>
                <Textarea
                  id="scope_of_work"
                  {...register('scope_of_work')}
                  placeholder="Define the scope of work..."
                  rows={4}
                />
                {errors.scope_of_work && (
                  <p className="text-sm text-red-500 mt-1">{errors.scope_of_work.message}</p>
                )}
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
                  <Controller
                    name="pipeline_stage"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
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
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="lead_source">Lead Source</Label>
                  <Controller
                    name="lead_source"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
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
                    )}
                  />
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
                    {...register('estimated_value', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {estimatedValue != null && !isNaN(estimatedValue) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(estimatedValue)}
                    </p>
                  )}
                  {errors.estimated_value && (
                    <p className="text-sm text-red-500 mt-1">{errors.estimated_value.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="approved_value">Approved Value</Label>
                  <Input
                    id="approved_value"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('approved_value', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {approvedValue != null && !isNaN(approvedValue) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(approvedValue)}
                    </p>
                  )}
                  {errors.approved_value && (
                    <p className="text-sm text-red-500 mt-1">{errors.approved_value.message}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="final_value">Final Value</Label>
                  <Input
                    id="final_value"
                    type="number"
                    min="0"
                    step="0.01"
                    {...register('final_value', { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {finalValue != null && !isNaN(finalValue) && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatCurrency(finalValue)}
                    </p>
                  )}
                  {errors.final_value && (
                    <p className="text-sm text-red-500 mt-1">{errors.final_value.message}</p>
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
                    {...register('estimated_start')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
