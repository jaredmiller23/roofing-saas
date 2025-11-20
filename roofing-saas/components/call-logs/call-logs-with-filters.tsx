'use client'

import { useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { ActiveFilter } from '@/lib/filters/types'
import { FilterBar } from '@/components/filters/FilterBar'
import { CallLogsTable } from './call-logs-table'

/**
 * Client component that integrates configurable filters with call logs table
 * Coordinates FilterBar and CallLogsTable
 */
export function CallLogsWithFilters() {
  const searchParams = useSearchParams()

  // Create a stable string representation of search params
  const searchParamsString = searchParams.toString()

  // Convert search params to object for CallLogsTable (memoized to prevent infinite loops)
  const params = useMemo(() => {
    const paramsObj: { [key: string]: string | string[] | undefined } = {}
    const currentParams = new URLSearchParams(searchParamsString)
    currentParams.forEach((value, key) => {
      paramsObj[key] = value
    })
    return paramsObj
  }, [searchParamsString])

  // Handle filter changes from FilterBar
  const handleFiltersChange = useCallback(
    (filters: ActiveFilter[]) => {
      // Read searchParams fresh inside the callback to avoid dependency issues
      const currentParams = new URLSearchParams(searchParamsString)

      // Clear existing filter params (but keep page, sort)
      const preserveKeys = ['page', 'sort_by', 'sort_order']
      Array.from(currentParams.keys()).forEach(key => {
        if (!preserveKeys.includes(key)) {
          currentParams.delete(key)
        }
      })

      // Add new filter params
      filters.forEach(filter => {
        const paramKey = filter.field_name
        const paramValue = formatFilterValue(filter)

        if (paramValue !== null) {
          currentParams.set(paramKey, paramValue)
        }
      })

      // Reset to page 1 when filters change
      currentParams.set('page', '1')

      // Use native History API to avoid server component re-execution
      // This prevents the infinite rendering loop caused by router.push
      window.history.pushState(null, '', `/call-logs?${currentParams.toString()}`)
    },
    [searchParamsString]  // Use stable string dependency instead of searchParams object
  )

  return (
    <div className="space-y-6">
      {/* Configurable Filters */}
      <FilterBar
        entity_type="call_logs"
        onFiltersChange={handleFiltersChange}
      />

      {/* Call Logs Table */}
      <CallLogsTable params={params} />
    </div>
  )
}

/**
 * Format filter value for URL query param
 */
function formatFilterValue(filter: ActiveFilter): string | null {
  const { operator, value } = filter

  // Null checks
  if (operator === 'is_null' || operator === 'is_not_null') {
    return operator
  }

  // Handle array values (multi-select, in, not_in)
  if (Array.isArray(value)) {
    if (operator === 'between') {
      return `${value[0]},${value[1]}`
    }
    return value.join(',')
  }

  // Handle boolean
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false'
  }

  // Handle string/number
  if (value !== null && value !== undefined) {
    return String(value)
  }

  return null
}
