'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Search, Filter, X, TrendingUp, Clock, AlertCircle, DollarSign } from 'lucide-react'

interface ContactsSearchProps {
  params: { [key: string]: string | string[] | undefined }
}

export function ContactsSearch({ params }: ContactsSearchProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(
    (params.search as string) || ''
  )
  const [stage, setStage] = useState(
    (params.stage as string) || ''
  )
  const [type, setType] = useState(
    (params.type as string) || ''
  )
  const [priority, setPriority] = useState(
    (params.priority as string) || ''
  )

  const handleSearch = () => {
    const newParams = new URLSearchParams(searchParams)

    if (search) {
      newParams.set('search', search)
    } else {
      newParams.delete('search')
    }

    if (stage) {
      newParams.set('stage', stage)
    } else {
      newParams.delete('stage')
    }

    if (type) {
      newParams.set('type', type)
    } else {
      newParams.delete('type')
    }

    if (priority) {
      newParams.set('priority', priority)
    } else {
      newParams.delete('priority')
    }

    // Reset to page 1 on new search
    newParams.set('page', '1')

    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`)
    })
  }

  const handleClear = () => {
    setSearch('')
    setStage('')
    setType('')
    setPriority('')

    startTransition(() => {
      router.push(pathname)
    })
  }

  const handleQuickFilter = (filterType: string, filterValue: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set(filterType, filterValue)
    newParams.set('page', '1')

    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`)
    })

    // Update local state
    if (filterType === 'stage') setStage(filterValue)
    if (filterType === 'type') setType(filterValue)
    if (filterType === 'priority') setPriority(filterValue)
  }

  const removeFilter = (filterType: string) => {
    const newParams = new URLSearchParams(searchParams)
    newParams.delete(filterType)
    newParams.set('page', '1')

    startTransition(() => {
      router.push(`${pathname}?${newParams.toString()}`)
    })

    // Update local state
    if (filterType === 'stage') setStage('')
    if (filterType === 'type') setType('')
    if (filterType === 'priority') setPriority('')
    if (filterType === 'search') setSearch('')
  }

  const hasActiveFilters = search || stage || type || priority
  const activeFilterCount = [search, stage, type, priority].filter(Boolean).length

  return (
    <div className="space-y-4">
      {/* Quick Filter Chips */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-50 rounded-lg p-4 border border-primary/20">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-muted-foreground">Quick Filters</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleQuickFilter('priority', 'urgent')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full text-sm font-medium transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            Urgent
          </button>
          <button
            onClick={() => handleQuickFilter('priority', 'high')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-full text-sm font-medium transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            High Priority
          </button>
          <button
            onClick={() => handleQuickFilter('stage', 'new')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full text-sm font-medium transition-colors"
          >
            <Clock className="h-3.5 w-3.5" />
            New Leads
          </button>
          <button
            onClick={() => handleQuickFilter('stage', 'negotiation')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-full text-sm font-medium transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Active Deals
          </button>
          <button
            onClick={() => handleQuickFilter('stage', 'won')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-full text-sm font-medium transition-colors"
          >
            <DollarSign className="h-3.5 w-3.5" />
            Customers
          </button>
          <button
            onClick={() => handleQuickFilter('type', 'lead')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 hover:bg-secondary/20 text-secondary rounded-full text-sm font-medium transition-colors"
          >
            Leads Only
          </button>
        </div>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Active Filters ({activeFilterCount}):</span>
          {search && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
              <Search className="h-3 w-3" />
              Search: {search}
              <button onClick={() => removeFilter('search')} className="ml-1 hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {stage && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm capitalize">
              Stage: {stage}
              <button onClick={() => removeFilter('stage')} className="ml-1 hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {type && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm capitalize">
              Type: {type}
              <button onClick={() => removeFilter('type')} className="ml-1 hover:text-primary">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {priority && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/10 text-red-500 rounded-full text-sm capitalize">
              Priority: {priority}
              <button onClick={() => removeFilter('priority')} className="ml-1 hover:text-red-400">
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <button
            onClick={handleClear}
            className="text-sm text-primary hover:text-primary/80 font-medium underline"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Advanced Search */}
      <div className="bg-card rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label htmlFor="search" className="block text-sm font-medium text-muted-foreground mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                id="search"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Name, email, or phone..."
                className="w-full pl-10 pr-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Stage Filter */}
          <div>
            <label htmlFor="stage" className="block text-sm font-medium text-muted-foreground mb-1">
              Stage
            </label>
            <select
              id="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Stages</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-muted-foreground mb-1">
              Type
            </label>
            <select
              id="type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Types</option>
              <option value="lead">Lead</option>
              <option value="prospect">Prospect</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-muted-foreground mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSearch}
            disabled={isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 font-medium"
          >
            <Search className="h-4 w-4" />
            {isPending ? 'Searching...' : 'Apply Filters'}
          </button>
          <button
            onClick={handleClear}
            disabled={isPending}
            className="px-4 py-2 border border-input text-muted-foreground rounded-md hover:bg-accent disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  )
}
