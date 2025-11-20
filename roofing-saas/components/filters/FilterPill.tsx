'use client'

import { X } from 'lucide-react'
import type { ActiveFilter } from '@/lib/filters/types'

interface FilterPillProps {
  filter: ActiveFilter
  onRemove: () => void
}

export function FilterPill({ filter, onRemove }: FilterPillProps) {
  // Format value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return 'empty'
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object') {
      // Handle date ranges, etc.
      return JSON.stringify(value)
    }
    return String(value)
  }

  // Format operator for display
  const formatOperator = (op: string): string => {
    const operators: Record<string, string> = {
      equals: '=',
      not_equals: '≠',
      contains: 'contains',
      not_contains: 'does not contain',
      starts_with: 'starts with',
      ends_with: 'ends with',
      greater_than: '>',
      less_than: '<',
      greater_than_or_equal: '≥',
      less_than_or_equal: '≤',
      in: 'in',
      not_in: 'not in',
      between: 'between',
      is_null: 'is empty',
      is_not_null: 'is not empty',
    }
    return operators[op] || op
  }

  const displayValue = filter.display_value || formatValue(filter.value)
  const operator = formatOperator(filter.operator)

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-sm">
      <span className="font-medium text-blue-900">{filter.field_label}</span>
      <span className="text-blue-600">{operator}</span>
      <span className="text-blue-900">{displayValue}</span>
      <button
        onClick={onRemove}
        className="ml-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full p-0.5 transition-colors"
        aria-label="Remove filter"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
