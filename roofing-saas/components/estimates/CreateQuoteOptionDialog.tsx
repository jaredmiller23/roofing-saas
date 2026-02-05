'use client'

import { useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Loader2, Calculator, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { QuoteOptions } from './QuoteOptions'
import { QUOTE_OPTION_PRESETS } from '@/lib/types/quote-option'
import type { CreateQuoteLineItemInput } from '@/lib/types/quote-option'

interface QuoteOptionFormData {
  name: string
  description?: string
  is_recommended: boolean
  display_order: number
  tax_rate?: number
  line_items: CreateQuoteLineItemInput[]
}

interface EstimateFormData {
  quote_options: QuoteOptionFormData[]
}

interface CreateQuoteOptionDialogProps {
  projectId: string
  onSuccess: () => void
  children?: React.ReactNode
}

export function CreateQuoteOptionDialog({
  projectId,
  onSuccess,
  children,
}: CreateQuoteOptionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<EstimateFormData>({
    defaultValues: {
      quote_options: [
        {
          name: QUOTE_OPTION_PRESETS.GOOD.name,
          description: QUOTE_OPTION_PRESETS.GOOD.description,
          is_recommended: false,
          display_order: 0,
          tax_rate: 0,
          line_items: [
            {
              description: '',
              quantity: 1,
              unit: 'sq ft',
              unit_price: 0,
              category: 'materials',
            },
          ],
        },
      ],
    },
  })

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: 'quote_options',
  })

  const handleAddOption = () => {
    const presets = [QUOTE_OPTION_PRESETS.GOOD, QUOTE_OPTION_PRESETS.BETTER, QUOTE_OPTION_PRESETS.BEST]
    const preset = presets[optionFields.length] || { name: `Option ${optionFields.length + 1}`, description: '' }
    appendOption({
      name: preset.name,
      description: preset.description,
      is_recommended: false,
      display_order: optionFields.length,
      tax_rate: 0,
      line_items: [
        {
          description: '',
          quantity: 1,
          unit: 'sq ft',
          unit_price: 0,
          category: 'materials',
        },
      ],
    })
  }

  const handleSubmit = async (formData: EstimateFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Create each quote option via the API
      for (const option of formData.quote_options) {
        // Filter out empty line items
        const validLineItems = option.line_items.filter(
          (item) => item.description.trim() !== '' && item.unit_price > 0
        )

        if (validLineItems.length === 0) {
          setError(`Option "${option.name}" must have at least one line item with a description and price.`)
          setIsSubmitting(false)
          return
        }

        const res = await fetch(`/api/estimates/${projectId}/options`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: option.name,
            description: option.description,
            is_recommended: option.is_recommended,
            line_items: validLineItems,
          }),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error?.message || `Failed to create option "${option.name}"`)
        }
      }

      setOpen(false)
      form.reset()
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create quote options')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Create Quote Options
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Create Quote Options
          </DialogTitle>
          <DialogDescription>
            Create Good/Better/Best pricing options for this estimate. Each option can have different line items and pricing.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <QuoteOptions
            control={form.control}
            register={form.register}
            errors={form.formState.errors}
            optionFields={optionFields}
            removeOption={removeOption}
          />

          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleAddOption}
              disabled={optionFields.length >= 5}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Another Option
              {optionFields.length >= 5 && ' (Max 5)'}
            </Button>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 mr-2" />
                  Create {optionFields.length} Option{optionFields.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
