'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import type { ActiveFilter } from '@/lib/filters/types'
import { FilterBar } from '@/components/filters/FilterBar'
import { LeadsTable } from './leads-table'

/**
 * Client component that integrates configurable filters with leads table
 * Coordinates FilterBar and LeadsTable
 */
export function LeadsWithFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Create a stable string representation of search params
  const searchParamsString = searchParams.toString()

  // Convert search params to object for LeadsTable (memoized to prevent infinite loops)
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
      const newParams = new URLSearchParams(searchParams)

      // Clear existing filter params (but keep page, sort)
      const preserveKeys = ['page', 'sort_by', 'sort_order']
      Array.from(newParams.keys()).forEach(key => {
        if (!preserveKeys.includes(key)) {
          newParams.delete(key)
        }
      })

      // Add new filter params
      filters.forEach(filter => {
        const paramKey = filter.field_name
        const paramValue = formatFilterValue(filter)

        if (paramValue !== null) {
          newParams.set(paramKey, paramValue)
        }
      })

      // Reset to page 1 when filters change
      newParams.set('page', '1')

      router.push(`/projects?${newParams.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="space-y-4">
      {/* Configurable Filters */}
      <FilterBar
        entity_type="contacts"
        onFiltersChange={handleFiltersChange}
      />

      {/* Leads Table */}
      <LeadsTable params={params} />
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
