'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import type { FilterConfig, ActiveFilter, FilterOperator } from '@/lib/filters/types'

interface FilterBuilderProps {
  configs: FilterConfig[]
  selectedConfig?: FilterConfig | null
  onBuild: (filter: ActiveFilter) => void
  onCancel: () => void
}

export function FilterBuilder({ configs, selectedConfig, onBuild, onCancel }: FilterBuilderProps) {
  const [config, setConfig] = useState<FilterConfig | null>(selectedConfig || null)
  const [operator, setOperator] = useState<FilterOperator>('equals')
  const [value, setValue] = useState<unknown>('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!config || !value) return

    const filter: ActiveFilter = {
      field_name: config.field_name,
      field_label: config.field_label,
      field_type: config.field_type,
      operator,
      value,
    }

    onBuild(filter)
  }

  // Get available operators for the current field type
  const getOperatorsForFieldType = (fieldType: string): FilterOperator[] => {
    switch (fieldType) {
      case 'text':
        return ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_null', 'is_not_null']
      case 'number':
      case 'number_range':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between', 'is_null', 'is_not_null']
      case 'date':
      case 'date_range':
        return ['equals', 'not_equals', 'greater_than', 'less_than', 'between', 'is_null', 'is_not_null']
      case 'boolean':
        return ['equals']
      case 'select':
        return ['equals', 'not_equals', 'is_null', 'is_not_null']
      case 'multi_select':
        return ['in', 'not_in', 'is_null', 'is_not_null']
      default:
        return ['equals', 'not_equals']
    }
  }

  const renderValueInput = () => {
    if (!config) return null

    // Operators that don't need a value
    if (operator === 'is_null' || operator === 'is_not_null') {
      return <div className="text-sm text-gray-500 italic">No value needed</div>
    }

    switch (config.field_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        )

      case 'number':
      case 'number_range':
        if (operator === 'between') {
          const [min, max] = (value as number[]) || [0, 0]
          return (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                value={min}
                onChange={(e) => setValue([Number(e.target.value), max])}
                placeholder="Min"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                value={max}
                onChange={(e) => setValue([min, Number(e.target.value)])}
                placeholder="Max"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )
        }
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => setValue(Number(e.target.value))}
            placeholder="Enter number..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        )

      case 'date':
      case 'date_range':
        if (operator === 'between') {
          const [start, end] = (value as string[]) || ['', '']
          return (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={start}
                onChange={(e) => setValue([e.target.value, end])}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={end}
                onChange={(e) => setValue([start, e.target.value])}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          )
        }
        return (
          <input
            type="date"
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        )

      case 'boolean':
        return (
          <select
            value={String(value)}
            onChange={(e) => setValue(e.target.value === 'true')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        )

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select...</option>
            {config.filter_options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'multi_select':
        return (
          <select
            multiple
            value={value as string[]}
            onChange={(e) => setValue(Array.from(e.target.selectedOptions, option => option.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
            required
          >
            {config.filter_options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      default:
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter value..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        )
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {selectedConfig ? 'Edit Filter' : 'Add Filter'}
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Field Selection */}
            {!selectedConfig && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field
                </label>
                <select
                  value={config?.id || ''}
                  onChange={(e) => {
                    const selected = configs.find(c => c.id === e.target.value)
                    setConfig(selected || null)
                    if (selected) {
                      setOperator(selected.filter_operator)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a field...</option>
                  {configs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.field_label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {config && (
              <>
                {/* Operator Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as FilterOperator)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {getOperatorsForFieldType(config.field_type).map((op) => (
                      <option key={op} value={op}>
                        {op.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Value Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value
                  </label>
                  {renderValueInput()}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={!config}>
                Apply Filter
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
