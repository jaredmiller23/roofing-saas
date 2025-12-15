'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { X, CalendarIcon, Search, Filter } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { AuditLogFilters as AuditFilters, AuditActionType, AuditEntityType } from '@/lib/audit/audit-types'

interface AuditLogFiltersProps {
  filters: AuditFilters
  onFiltersChange: (filters: AuditFilters) => void
}

const ENTITY_TYPES: Array<{ value: AuditEntityType; label: string }> = [
  { value: 'contact', label: 'Contact' },
  { value: 'project', label: 'Project' },
  { value: 'estimate', label: 'Estimate' },
  { value: 'user', label: 'User' },
  { value: 'tenant', label: 'Tenant' },
  { value: 'settings', label: 'Settings' },
  { value: 'document', label: 'Document' },
]

const ACTION_TYPES: Array<{ value: AuditActionType; label: string }> = [
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'delete', label: 'Delete' },
]

const SORT_OPTIONS = [
  { value: 'timestamp', label: 'Timestamp' },
  { value: 'user_name', label: 'User Name' },
  { value: 'action_type', label: 'Action Type' },
  { value: 'entity_type', label: 'Entity Type' },
]

const SORT_ORDERS = [
  { value: 'desc', label: 'Newest First' },
  { value: 'asc', label: 'Oldest First' },
]

const PAGE_SIZES = [
  { value: 25, label: '25 per page' },
  { value: 50, label: '50 per page' },
  { value: 100, label: '100 per page' },
]

export function AuditLogFilters({ filters, onFiltersChange }: AuditLogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<AuditFilters>(filters)
  const [startDate, setStartDate] = useState<Date | undefined>(
    filters.start_date ? new Date(filters.start_date) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    filters.end_date ? new Date(filters.end_date) : undefined
  )

  // Update local state when props change
  useEffect(() => {
    setLocalFilters(filters)
    setStartDate(filters.start_date ? new Date(filters.start_date) : undefined)
    setEndDate(filters.end_date ? new Date(filters.end_date) : undefined)
  }, [filters])

  // Apply filters with debouncing for search
  const applyFilters = (newFilters: AuditFilters) => {
    setLocalFilters(newFilters)
    onFiltersChange(newFilters)
  }

  // Handle input changes
  const handleInputChange = (field: keyof AuditFilters, value: string | undefined) => {
    const updatedFilters = { ...localFilters, [field]: value || undefined }

    // For search, apply with debounce
    if (field === 'search') {
      setLocalFilters(updatedFilters)
      // Debounce search
      const timeoutId = setTimeout(() => {
        applyFilters(updatedFilters)
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      applyFilters(updatedFilters)
    }
  }

  // Handle date changes
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date)
    const dateString = date ? date.toISOString().split('T')[0] : undefined
    applyFilters({ ...localFilters, start_date: dateString })
  }

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date)
    const dateString = date ? date.toISOString().split('T')[0] : undefined
    applyFilters({ ...localFilters, end_date: dateString })
  }

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters: AuditFilters = {
      page: 1,
      limit: 50,
      sort_by: 'timestamp',
      sort_order: 'desc'
    }
    setStartDate(undefined)
    setEndDate(undefined)
    applyFilters(clearedFilters)
  }

  // Count active filters
  const getActiveFilterCount = () => {
    let count = 0
    if (localFilters.search) count++
    if (localFilters.user_id) count++
    if (localFilters.entity_type) count++
    if (localFilters.action_type) count++
    if (localFilters.entity_id) count++
    if (localFilters.start_date) count++
    if (localFilters.end_date) count++
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <div className="space-y-4">
      {/* Primary filters row */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search entries..."
              value={localFilters.search || ''}
              onChange={(e) => handleInputChange('search', e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Entity Type */}
        <div className="space-y-2">
          <Label>Entity Type</Label>
          <Select
            value={localFilters.entity_type || ''}
            onValueChange={(value) => handleInputChange('entity_type', value as AuditEntityType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All entities</SelectItem>
              {ENTITY_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Type */}
        <div className="space-y-2">
          <Label>Action Type</Label>
          <Select
            value={localFilters.action_type || ''}
            onValueChange={(value) => handleInputChange('action_type', value as AuditActionType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {ACTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !startDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {startDate ? format(startDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={startDate}
                onSelect={handleStartDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label>End Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full justify-start text-left font-normal',
                  !endDate && 'text-muted-foreground'
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {endDate ? format(endDate, 'PPP') : 'Pick a date'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={endDate}
                onSelect={handleEndDateChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Secondary filters row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Entity ID */}
        <div className="space-y-2">
          <Label htmlFor="entity_id">Entity ID</Label>
          <Input
            id="entity_id"
            placeholder="Entity ID..."
            value={localFilters.entity_id || ''}
            onChange={(e) => handleInputChange('entity_id', e.target.value)}
          />
        </div>

        {/* Sort By */}
        <div className="space-y-2">
          <Label>Sort By</Label>
          <Select
            value={localFilters.sort_by || 'timestamp'}
            onValueChange={(value) => handleInputChange('sort_by', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort Order */}
        <div className="space-y-2">
          <Label>Sort Order</Label>
          <Select
            value={localFilters.sort_order || 'desc'}
            onValueChange={(value) => handleInputChange('sort_order', value as 'asc' | 'desc')}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_ORDERS.map((order) => (
                <SelectItem key={order.value} value={order.value}>
                  {order.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <Label>Page Size</Label>
          <Select
            value={String(localFilters.limit || 50)}
            onValueChange={(value) => handleInputChange('limit', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZES.map((size) => (
                <SelectItem key={size.value} value={String(size.value)}>
                  {size.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter status and actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} applied
          </span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount}
            </Badge>
          )}
        </div>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {localFilters.search && (
            <Badge variant="outline" className="gap-1">
              Search: {localFilters.search}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleInputChange('search', '')}
              />
            </Badge>
          )}

          {localFilters.entity_type && (
            <Badge variant="outline" className="gap-1">
              Entity: {ENTITY_TYPES.find(t => t.value === localFilters.entity_type)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleInputChange('entity_type', '')}
              />
            </Badge>
          )}

          {localFilters.action_type && (
            <Badge variant="outline" className="gap-1">
              Action: {ACTION_TYPES.find(t => t.value === localFilters.action_type)?.label}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleInputChange('action_type', '')}
              />
            </Badge>
          )}

          {localFilters.entity_id && (
            <Badge variant="outline" className="gap-1">
              Entity ID: {localFilters.entity_id}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleInputChange('entity_id', '')}
              />
            </Badge>
          )}

          {localFilters.start_date && (
            <Badge variant="outline" className="gap-1">
              From: {format(new Date(localFilters.start_date), 'MMM d, yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStartDateChange(undefined)}
              />
            </Badge>
          )}

          {localFilters.end_date && (
            <Badge variant="outline" className="gap-1">
              To: {format(new Date(localFilters.end_date), 'MMM d, yyyy')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleEndDateChange(undefined)}
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}