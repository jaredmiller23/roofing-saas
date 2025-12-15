'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Calculator, FileText } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { QuoteOptions } from './QuoteOptions'
import {
  CreateEstimateInput,
  CreateQuoteOptionInput,
  CreateQuoteLineItemInput,
  LINE_ITEM_CATEGORIES,
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
    display_order: z.number().min(0),
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
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
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
            control={control}
            register={register}
            errors={errors}
            optionFields={optionFields}
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