'use client'

import { Control, FieldErrors, UseFormRegister, FieldArrayWithId, useFieldArray } from 'react-hook-form'
import { Plus, Trash2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  LINE_ITEM_CATEGORIES,
  CreateQuoteLineItemInput,
  calculateQuoteOptionTotals,
  formatCurrency
} from '@/lib/types/quote-option'

interface QuoteOption {
  name: string
  description?: string
  is_recommended: boolean
  display_order: number
  tax_rate?: number
  line_items: CreateQuoteLineItemInput[]
}

interface EstimateFormData {
  quote_options: QuoteOption[]
}

interface QuoteOptionsProps {
  control: Control<EstimateFormData>
  register: UseFormRegister<EstimateFormData>
  errors: FieldErrors<EstimateFormData>
  optionFields: FieldArrayWithId<EstimateFormData, 'quote_options', 'id'>[]
  removeOption: (index: number) => void
}

export function QuoteOptions({
  control,
  register,
  errors,
  optionFields,
  removeOption
}: QuoteOptionsProps) {

  return (
    <div className="space-y-4">
      {optionFields.map((optionField, optionIndex) => (
        <QuoteOptionCard
          key={optionField.id}
          optionIndex={optionIndex}
          control={control}
          register={register}
          errors={errors}
          removeOption={removeOption}
          showRemove={optionFields.length > 1}
        />
      ))}
    </div>
  )
}

interface QuoteOptionCardProps {
  optionIndex: number
  control: Control<EstimateFormData>
  register: UseFormRegister<EstimateFormData>
  errors: FieldErrors<EstimateFormData>
  removeOption: (index: number) => void
  showRemove: boolean
}

function QuoteOptionCard({
  optionIndex,
  control,
  register,
  errors,
  removeOption,
  showRemove
}: QuoteOptionCardProps) {
  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem } = useFieldArray({
    control,
    name: `quote_options.${optionIndex}.line_items` as const
  })

  const addLineItem = () => {
    appendLineItem({
      description: '',
      quantity: 1,
      unit: 'sq ft',
      unit_price: 0,
      category: 'materials'
    })
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <input
                type="text"
                {...register(`quote_options.${optionIndex}.name`)}
                className="text-lg font-semibold bg-transparent border-none p-0 focus:outline-none focus:ring-0"
                placeholder="Option name"
              />
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...register(`quote_options.${optionIndex}.is_recommended`)}
                  className="rounded"
                />
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm">Recommended</span>
              </label>
            </div>
            <input
              type="text"
              {...register(`quote_options.${optionIndex}.description`)}
              className="text-sm text-muted-foreground bg-transparent border-none p-0 mt-1 focus:outline-none focus:ring-0"
              placeholder="Option description"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <label className="text-xs text-muted-foreground">Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                {...register(`quote_options.${optionIndex}.tax_rate`, { valueAsNumber: true })}
                className="w-20 px-2 py-1 text-sm border rounded"
                placeholder="0.00"
              />
            </div>
            {showRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeOption(optionIndex)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium">Line Items</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {lineItemFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>No line items yet. Click &quot;Add Item&quot; to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Header Row */}
              <div className="grid grid-cols-12 gap-3 text-xs font-medium text-muted-foreground">
                <div className="col-span-4">Description</div>
                <div className="col-span-2">Category</div>
                <div className="col-span-1">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-2">Price</div>
                <div className="col-span-1">Actions</div>
              </div>

              {/* Line Items */}
              {lineItemFields.map((lineItemField, lineItemIndex) => (
                <LineItemRow
                  key={lineItemField.id}
                  optionIndex={optionIndex}
                  lineItemIndex={lineItemIndex}
                  register={register}
                  errors={errors}
                  removeLineItem={removeLineItem}
                  showRemove={lineItemFields.length > 1}
                />
              ))}
            </div>
          )}
        </div>

        {/* Option Total */}
        <QuoteOptionTotal
          optionIndex={optionIndex}
          control={control}
        />
      </CardContent>
    </Card>
  )
}

interface LineItemRowProps {
  optionIndex: number
  lineItemIndex: number
  register: UseFormRegister<EstimateFormData>
  errors: FieldErrors<EstimateFormData>
  removeLineItem: (index: number) => void
  showRemove: boolean
}

function LineItemRow({
  optionIndex,
  lineItemIndex,
  register,
  errors: _errors,
  removeLineItem,
  showRemove
}: LineItemRowProps) {
  return (
    <div className="grid grid-cols-12 gap-3 items-start">
      <div className="col-span-4">
        <input
          type="text"
          {...register(`quote_options.${optionIndex}.line_items.${lineItemIndex}.description`)}
          className="w-full px-3 py-2 border border-input rounded text-sm"
          placeholder="Item description"
        />
      </div>

      <div className="col-span-2">
        <select
          {...register(`quote_options.${optionIndex}.line_items.${lineItemIndex}.category`)}
          className="w-full px-3 py-2 border border-input rounded text-sm"
        >
          {LINE_ITEM_CATEGORIES.map((category) => (
            <option key={category.value} value={category.value}>
              {category.icon} {category.label}
            </option>
          ))}
        </select>
      </div>

      <div className="col-span-1">
        <input
          type="number"
          step="0.01"
          min="0"
          {...register(`quote_options.${optionIndex}.line_items.${lineItemIndex}.quantity`, {
            valueAsNumber: true
          })}
          className="w-full px-3 py-2 border border-input rounded text-sm"
          placeholder="1"
        />
      </div>

      <div className="col-span-2">
        <input
          type="text"
          {...register(`quote_options.${optionIndex}.line_items.${lineItemIndex}.unit`)}
          className="w-full px-3 py-2 border border-input rounded text-sm"
          placeholder="sq ft"
        />
      </div>

      <div className="col-span-2">
        <input
          type="number"
          step="0.01"
          min="0"
          {...register(`quote_options.${optionIndex}.line_items.${lineItemIndex}.unit_price`, {
            valueAsNumber: true
          })}
          className="w-full px-3 py-2 border border-input rounded text-sm"
          placeholder="0.00"
        />
      </div>

      <div className="col-span-1 flex justify-center">
        {showRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => removeLineItem(lineItemIndex)}
            className="text-red-500 hover:text-red-700 p-1"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

interface QuoteOptionTotalProps {
  optionIndex: number
  control: Control<EstimateFormData>
}

function QuoteOptionTotal({ optionIndex, control }: QuoteOptionTotalProps) {
  const lineItems = control._getWatch(`quote_options.${optionIndex}.line_items`)
  const taxRate = control._getWatch(`quote_options.${optionIndex}.tax_rate`) || 0

  const { subtotal, taxAmount, total } = calculateQuoteOptionTotals(lineItems || [], taxRate)

  return (
    <div className="bg-muted p-4 rounded-lg">
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between">
          <span>Tax ({taxRate}%):</span>
          <span>{formatCurrency(taxAmount)}</span>
        </div>
        <div className="flex justify-between text-lg font-semibold border-t border-border pt-2">
          <span>Total:</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}