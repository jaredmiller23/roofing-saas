'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Calculator, FileText, Camera, Import, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteOptions } from './QuoteOptions'
import {
  QUOTE_OPTION_PRESETS,
  calculateQuoteOptionTotals,
  formatCurrency
} from '@/lib/types/quote-option'

// Validation schema
const estimateSchema = z.object({
  name: z.string().min(1, 'Project name is required').max(200),
  description: z.string().optional(),
  contact_id: z.string().uuid('Please select a contact'),
  estimated_value: z.number().positive().optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  estimated_close_date: z.string().optional(),
  notes: z.string().optional(),
  quote_options: z.array(z.object({
    name: z.string().min(1, 'Option name is required'),
    description: z.string().optional(),
    is_recommended: z.boolean().optional(),
    display_order: z.number().min(0).optional(),
    tax_rate: z.number().min(0).max(100).optional(),
    line_items: z.array(z.object({
      description: z.string().min(1, 'Description is required'),
      quantity: z.number().positive('Quantity must be positive'),
      unit: z.string().min(1, 'Unit is required'),
      unit_price: z.number().positive('Price must be positive'),
      category: z.enum(['materials', 'labor', 'equipment', 'permits', 'other'])
    })).min(1, 'At least one line item is required')
  })).min(1, 'At least one quote option is required')
})

type EstimateFormData = z.infer<typeof estimateSchema>

interface EstimateFormProps {
  mode?: 'create' | 'edit'
  initialData?: Partial<EstimateFormData>
  projectId?: string
}

export function EstimateForm({ mode = 'create', initialData, projectId }: EstimateFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [arData, setArData] = useState<any>(null)
  const [loadingArData, setLoadingArData] = useState(false)
  const fromAr = searchParams?.get('from_ar') === 'true'

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors }
  } = useForm<EstimateFormData>({
    resolver: zodResolver(estimateSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      contact_id: initialData?.contact_id || '',
      estimated_value: initialData?.estimated_value || undefined,
      priority: initialData?.priority || 'normal',
      estimated_close_date: initialData?.estimated_close_date || '',
      notes: initialData?.notes || '',
      quote_options: initialData?.quote_options || [
        {
          name: 'Good',
          description: 'Essential quality materials and workmanship',
          is_recommended: false,
          display_order: 0,
          tax_rate: 8.25,
          line_items: []
        }
      ]
    }
  })

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: 'quote_options'
  })

  // Fetch AR data if coming from AR assessment
  useEffect(() => {
    if (fromAr && projectId) {
      fetchArData()
    }
  }, [fromAr, projectId])

  const fetchArData = async () => {
    if (!projectId) return

    try {
      setLoadingArData(true)
      const response = await fetch(`/api/ar/measurements?project_id=${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setArData(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch AR data:', error)
    } finally {
      setLoadingArData(false)
    }
  }

  const watchedOptions = watch('quote_options')

  // Add preset options
  const addPresetOption = useCallback((preset: keyof typeof QUOTE_OPTION_PRESETS) => {
    const presetData = QUOTE_OPTION_PRESETS[preset]
    appendOption({
      name: presetData.name,
      description: presetData.description,
      is_recommended: preset === 'BETTER',
      display_order: optionFields.length,
      tax_rate: 8.25,
      line_items: []
    })
  }, [appendOption, optionFields.length])

  // Import AR measurements as line items
  const importArMeasurements = (optionIndex: number) => {
    if (!arData) return

    const newLineItems: any[] = []

    // Add area measurements as roof repair items
    arData.measurements
      ?.filter((m: any) => m.type === 'area')
      .forEach((measurement: any) => {
        newLineItems.push({
          description: `Roof repair area (AR measured: ${measurement.value.toFixed(1)} ${measurement.unit})`,
          quantity: Math.ceil(measurement.value),
          unit: 'sqft',
          unit_price: 15.0,
          category: 'materials'
        })
      })

    // Add damage markers as repair items
    arData.damage_markers?.forEach((marker: any) => {
      const damageType = marker.damage_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
      newLineItems.push({
        description: `${damageType} repair (${marker.severity} severity)`,
        quantity: 1,
        unit: 'ea',
        unit_price: getSeverityPrice(marker.severity),
        category: 'labor'
      })
    })

    // Add new line items to the current option
    const currentOption = optionFields[optionIndex]
    if (currentOption) {
      // This would need to be implemented with proper form methods
      console.log('Would add line items:', newLineItems)
    }
  }

  const getSeverityPrice = (severity: string): number => {
    switch (severity) {
      case 'minor': return 50
      case 'moderate': return 150
      case 'severe': return 300
      case 'critical': return 500
      default: return 100
    }
  }

  // Calculate total estimate value
  const totalEstimateValue = watchedOptions?.reduce((total, option) => {
    if (!option.line_items?.length) return total
    const { total: optionTotal } = calculateQuoteOptionTotals(
      option.line_items,
      option.tax_rate || 0
    )
    return Math.max(total, optionTotal)
  }, 0) || 0

  const onSubmit = async (data: EstimateFormData) => {
    try {
      setIsSubmitting(true)

      // Prepare the project data (since estimates are projects in this system)
      const projectData = {
        name: data.name,
        description: data.description,
        contact_id: data.contact_id,
        status: 'estimate',
        pipeline_stage: 'qualified',
        estimated_value: totalEstimateValue || data.estimated_value,
        priority: data.priority,
        estimated_close_date: data.estimated_close_date,
        notes: data.notes
      }

      // Create or update the project
      const projectUrl = mode === 'edit' && projectId
        ? `/api/projects/${projectId}`
        : '/api/projects'

      const projectMethod = mode === 'edit' ? 'PATCH' : 'POST'

      const projectResponse = await fetch(projectUrl, {
        method: projectMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectData)
      })

      if (!projectResponse.ok) {
        throw new Error('Failed to save project')
      }

      const projectResult = await projectResponse.json()
      const finalProjectId = projectResult.data?.project?.id || projectId

      // Create quote options
      for (const option of data.quote_options) {
        const { total, subtotal, taxAmount } = calculateQuoteOptionTotals(
          option.line_items,
          option.tax_rate || 0
        )

        const optionData = {
          ...option,
          project_id: finalProjectId,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total
        }

        const optionResponse = await fetch(`/api/estimates/${finalProjectId}/options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(optionData)
        })

        if (!optionResponse.ok) {
          console.error('Failed to create quote option:', option.name)
        }
      }

      // Redirect to the project detail page
      router.push(`/projects/${finalProjectId}`)
      router.refresh()

    } catch (error) {
      console.error('Error saving estimate:', error)
      alert('Failed to save estimate. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Project Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Estimate Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Roof Replacement - 123 Main St"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="contact_id" className="block text-sm font-medium text-muted-foreground mb-1">
                Customer <span className="text-red-500">*</span>
              </label>
              <select
                id="contact_id"
                {...register('contact_id')}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a customer...</option>
                {/* TODO: Load contacts from API */}
              </select>
              {errors.contact_id && (
                <p className="mt-1 text-sm text-red-500">{errors.contact_id.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-1">
                Priority
              </label>
              <select
                id="priority"
                {...register('priority')}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label htmlFor="estimated_close_date" className="block text-sm font-medium text-muted-foreground mb-1">
                Expected Close Date
              </label>
              <input
                type="date"
                id="estimated_close_date"
                {...register('estimated_close_date')}
                className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              {...register('description')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Describe the project scope..."
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-muted-foreground mb-1">
              Internal Notes
            </label>
            <textarea
              id="notes"
              rows={2}
              {...register('notes')}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Internal notes (not visible to customer)..."
            />
          </div>
        </CardContent>
      </Card>

      {/* AR Data Section */}
      {(fromAr || arData) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              AR Assessment Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingArData ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-2 text-muted-foreground">Loading AR data...</span>
              </div>
            ) : arData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {arData.measurements?.length || 0}
                    </div>
                    <div className="text-sm text-blue-600">Measurements</div>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      {arData.damage_markers?.length || 0}
                    </div>
                    <div className="text-sm text-orange-600">Damage Areas</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {arData.measurements
                        ?.filter((m: any) => m.type === 'area')
                        ?.reduce((sum: number, m: any) => sum + m.value, 0)
                        ?.toFixed(0) || 0}
                    </div>
                    <div className="text-sm text-green-600">Total Area (sq ft)</div>
                  </div>
                </div>

                {arData.measurements && arData.measurements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Measurements</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {arData.measurements.map((measurement: any) => (
                        <div key={measurement.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                          <span className="capitalize">{measurement.type}</span>
                          <span className="font-medium">
                            {measurement.value.toFixed(2)} {measurement.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {arData.damage_markers && arData.damage_markers.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Damage Areas</h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {arData.damage_markers.map((marker: any) => (
                        <div key={marker.id} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                          <span className="capitalize">
                            {marker.damage_type?.replace(/_/g, ' ')}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            marker.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            marker.severity === 'severe' ? 'bg-red-100 text-red-700' :
                            marker.severity === 'moderate' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {marker.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => importArMeasurements(0)}
                    className="gap-2"
                  >
                    <Import className="h-4 w-4" />
                    Import to Estimate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/projects/${projectId}/ar-assessment`)}
                    className="gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    Return to AR
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Camera className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No AR assessment data found for this project.</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/projects/${projectId}/ar-assessment`)}
                  className="gap-2 mt-3"
                >
                  <Camera className="h-4 w-4" />
                  Start AR Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote Options */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Quote Options
            </CardTitle>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPresetOption('GOOD')}
                disabled={optionFields.length >= 3}
              >
                Add Good
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPresetOption('BETTER')}
                disabled={optionFields.length >= 3}
              >
                Add Better
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addPresetOption('BEST')}
                disabled={optionFields.length >= 3}
              >
                Add Best
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <QuoteOptions
            control={control as never}
            register={register as never}
            errors={errors as never}
            optionFields={optionFields as never}
            removeOption={removeOption}
          />
          {errors.quote_options && (
            <p className="mt-2 text-sm text-red-500">{errors.quote_options.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {totalEstimateValue > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <span>Highest Option Value:</span>
              <span className="text-primary">{formatCurrency(totalEstimateValue)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4 pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2"
        >
          {isSubmitting
            ? 'Saving...'
            : mode === 'edit'
              ? 'Update Estimate'
              : 'Create Estimate'
          }
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}