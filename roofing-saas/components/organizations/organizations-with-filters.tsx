'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OrganizationsTable } from './organizations-table'
import { getOrganizationTypeOptions } from '@/lib/types/organization'
import { Search, Filter, X } from 'lucide-react'

export function OrganizationsWithFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current filter values from URL
  const currentSearch = searchParams.get('search') || ''
  const currentType = searchParams.get('type') || ''
  const currentIndustry = searchParams.get('industry') || ''

  // Local state for form inputs
  const [search, setSearch] = useState(currentSearch)
  const [type, setType] = useState(currentType)
  const [industry, setIndustry] = useState(currentIndustry)

  // Convert searchParams to params object for table
  const params = Object.fromEntries(searchParams.entries())

  const updateFilters = (newFilters: Record<string, string>) => {
    const url = new URLSearchParams()

    // Add all current params
    searchParams.forEach((value, key) => {
      url.set(key, value)
    })

    // Update with new filters
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        url.set(key, value)
      } else {
        url.delete(key)
      }
    })

    // Reset page when filters change
    url.delete('page')

    router.push(`/organizations?${url.toString()}`)
  }

  const handleSearch = () => {
    updateFilters({
      search: search.trim(),
      type,
      industry: industry.trim(),
    })
  }

  const clearFilters = () => {
    setSearch('')
    setType('')
    setIndustry('')
    router.push('/organizations')
  }

  const hasActiveFilters = currentSearch || currentType || currentIndustry

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="bg-card border rounded-lg p-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="w-full pl-9 pr-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Organization Type Filter */}
          <div className="w-48">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              {getOrganizationTypeOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Industry Filter */}
          <div className="w-48">
            <input
              type="text"
              placeholder="Industry"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-input text-muted-foreground rounded-md hover:bg-accent flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Active filters:</span>
            {currentSearch && (
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                Search: {currentSearch}
              </span>
            )}
            {currentType && (
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                Type: {getOrganizationTypeOptions().find(opt => opt.value === currentType)?.label}
              </span>
            )}
            {currentIndustry && (
              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                Industry: {currentIndustry}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Organizations Table */}
      <OrganizationsTable params={params} />
    </div>
  )
}