'use client'

import { useRouter } from '@/lib/i18n/navigation'
import { useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useMemo, useRef, useState } from 'react'
import type { ActiveFilter } from '@/lib/filters/types'
import { FilterBar } from '@/components/filters/FilterBar'
import { ContactsSearch } from './contacts-search'
import { ContactsTable } from './contacts-table'

/**
 * Client component that integrates configurable filters with contacts
 * Coordinates FilterBar, ContactsSearch, and ContactsTable
 */
export function ContactsWithFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [_filterError, setFilterError] = useState<string | null>(null)

  // Track previous filter count to avoid no-op pushes
  const prevFilterCountRef = useRef(0)

  // Convert search params to object for child components
  // Memoize to prevent unstable object reference from triggering child re-fetches
  const params = useMemo(() => {
    const p: { [key: string]: string | string[] | undefined } = {}
    searchParams.forEach((value, key) => {
      p[key] = value
    })
    return p
  }, [searchParams])

  // Handle filter changes from FilterBar
  const handleFiltersChange = useCallback(
    (filters: ActiveFilter[]) => {
      // Skip no-op pushes: if filters were empty and still are, don't navigate
      if (filters.length === 0 && prevFilterCountRef.current === 0) {
        return
      }
      prevFilterCountRef.current = filters.length

      const newParams = new URLSearchParams(searchParams)

      // Clear existing filter params (but keep search, page, sort)
      const preserveKeys = ['search', 'page', 'sort_by', 'sort_order']
      Array.from(newParams.keys()).forEach(key => {
        if (!preserveKeys.includes(key)) {
          newParams.delete(key)
        }
      })

      // Add new filter params
      filters.forEach(filter => {
        // Convert filter to query param format
        const paramKey = filter.field_name
        const paramValue = formatFilterValue(filter)

        if (paramValue !== null) {
          newParams.set(paramKey, paramValue)
        }
      })

      // Reset to page 1 when filters change
      newParams.set('page', '1')

      // Use pathname (which includes locale prefix) for correct routing
      router.push(`${pathname}?${newParams.toString()}`)
    },
    [router, pathname, searchParams]
  )

  // Handle filter errors from FilterBar
  const handleFilterError = useCallback((error: string | null) => {
    setFilterError(error)
  }, [])

  return (
    <div className="space-y-6">
      {/* Configurable Filters */}
      <FilterBar
        entity_type="contacts"
        onFiltersChange={handleFiltersChange}
        onError={handleFilterError}
      />

      {/* Legacy Search (will be deprecated once filters are fully configured) */}
      <ContactsSearch params={params} />

      {/* Table */}
      <ContactsTable params={params} />
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
