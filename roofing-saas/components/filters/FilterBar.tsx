'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Save, X, RefreshCw } from 'lucide-react'
import type {
  FilterConfig,
  SavedFilter,
  ActiveFilter,
  EntityType,
} from '@/lib/filters/types'
import { FilterPill } from './FilterPill'
import { FilterBuilder } from './FilterBuilder'
import { SavedFilterPicker } from './SavedFilterPicker'
import { SaveFilterDialog } from './SaveFilterDialog'

interface FilterBarProps {
  entity_type: EntityType
  onFiltersChange: (filters: ActiveFilter[]) => void
  onError?: (error: string | null) => void
}

export function FilterBar({ entity_type, onFiltersChange, onError }: FilterBarProps) {
  const [configs, setConfigs] = useState<FilterConfig[]>([])
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([])
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [selectedConfig, setSelectedConfig] = useState<FilterConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Stable ref for callback to avoid re-triggering effects when parent re-renders
  const onFiltersChangeRef = useRef(onFiltersChange)
  onFiltersChangeRef.current = onFiltersChange

  const fetchConfigs = useCallback(async () => {
    setError(null)
    try {
      const response = await fetch(`/api/filters/configs?entity_type=${entity_type}`)

      if (!response.ok) {
        throw new Error('Failed to load filter configuration')
      }

      const data = await response.json()
      setConfigs(data.data?.configs || [])
      onError?.(null) // Clear any previous errors
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load filter configuration'
      console.error('Error fetching filter configs:', err)
      setError(errorMessage)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [entity_type, onError])

  const fetchSavedFilters = useCallback(async () => {
    try {
      const response = await fetch(`/api/filters/saved?entity_type=${entity_type}`)
      const data = await response.json()
      setSavedFilters(data.data?.filters || [])
    } catch (error) {
      console.error('Error fetching saved filters:', error)
    }
  }, [entity_type])

  // Fetch filter configs and saved filters
  useEffect(() => {
    fetchConfigs()
    fetchSavedFilters()
  }, [fetchConfigs, fetchSavedFilters])

  // Notify parent when active filters change
  useEffect(() => {
    onFiltersChangeRef.current(activeFilters)
  }, [activeFilters])

  const handleAddFilter = (config: FilterConfig) => {
    setSelectedConfig(config)
    setIsBuilderOpen(true)
  }

  const handleFilterBuilt = (filter: ActiveFilter) => {
    // Check if filter already exists for this field
    const existingIndex = activeFilters.findIndex(f => f.field_name === filter.field_name)

    if (existingIndex >= 0) {
      // Replace existing filter
      const newFilters = [...activeFilters]
      newFilters[existingIndex] = filter
      setActiveFilters(newFilters)
    } else {
      // Add new filter
      setActiveFilters([...activeFilters, filter])
    }

    setIsBuilderOpen(false)
    setSelectedConfig(null)
  }

  const handleRemoveFilter = (field_name: string) => {
    setActiveFilters(activeFilters.filter(f => f.field_name !== field_name))
  }

  const handleClearAll = () => {
    setActiveFilters([])
  }

  const handleLoadSavedFilter = async (filter_id: string) => {
    const savedFilter = savedFilters.find(f => f.id === filter_id)
    if (!savedFilter) return

    // Convert saved filter criteria to active filters
    const newActiveFilters: ActiveFilter[] = []

    for (const [field_name, criterion] of Object.entries(savedFilter.filter_criteria)) {
      const config = configs.find(c => c.field_name === field_name)
      if (config) {
        newActiveFilters.push({
          field_name,
          field_label: config.field_label,
          field_type: config.field_type,
          operator: criterion.operator,
          value: criterion.value,
        })
      }
    }

    setActiveFilters(newActiveFilters)

    // Update usage count
    try {
      await fetch(`/api/filters/saved/${filter_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usage_count: savedFilter.usage_count + 1,
          last_used_at: new Date().toISOString(),
        }),
      })
    } catch (error) {
      console.error('Error updating filter usage:', error)
    }
  }

  const handleSaveFilter = async (name: string, description?: string) => {
    if (activeFilters.length === 0) return

    // Convert active filters to filter criteria
    const filter_criteria: Record<string, { operator: string; value: unknown }> = {}
    activeFilters.forEach(filter => {
      filter_criteria[filter.field_name] = {
        operator: filter.operator,
        value: filter.value,
      }
    })

    try {
      const response = await fetch('/api/filters/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entity_type,
          name,
          description,
          filter_criteria,
          is_shared: false,
          is_default: false,
        }),
      })

      if (response.ok) {
        await fetchSavedFilters() // Refresh list
        setIsSaveDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to save filter')
      }
    } catch (error) {
      console.error('Error saving filter:', error)
      alert('Failed to save filter')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
        <span className="text-sm text-muted-foreground">Loading filters...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="text-red-600 text-sm">{error}</div>
        </div>
        <Button
          onClick={fetchConfigs}
          variant="outline"
          size="sm"
          className="gap-2 text-red-600 border-red-200 hover:bg-red-50"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Top Bar: Add Filter + Saved Filters + Save Current */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SavedFilterPicker
            entity_type={entity_type}
            filters={savedFilters}
            onSelect={handleLoadSavedFilter}
          />

          <div className="relative group">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBuilderOpen(true)}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Filter
            </Button>

            {/* Quick filter dropdown */}
            {configs.filter(c => c.is_quick_filter).length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-card rounded-lg shadow-lg border border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                <div className="p-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-2 px-2">Quick Filters</div>
                  {configs.filter(c => c.is_quick_filter).map(config => (
                    <button
                      key={config.id}
                      onClick={() => handleAddFilter(config)}
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 rounded-md transition-colors"
                    >
                      {config.field_label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeFilters.length > 0 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSaveDialogOpen(true)}
                className="gap-2 text-primary hover:text-primary/90"
              >
                <Save className="h-4 w-4" />
                Save Preset
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="gap-2 text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Active Filters Pills */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <FilterPill
              key={filter.field_name}
              filter={filter}
              onRemove={() => handleRemoveFilter(filter.field_name)}
            />
          ))}
        </div>
      )}

      {/* Filter Builder Modal */}
      {isBuilderOpen && (
        <FilterBuilder
          configs={configs}
          selectedConfig={selectedConfig}
          onBuild={handleFilterBuilt}
          onCancel={() => {
            setIsBuilderOpen(false)
            setSelectedConfig(null)
          }}
        />
      )}

      {/* Save Filter Dialog */}
      {isSaveDialogOpen && (
        <SaveFilterDialog
          onSave={handleSaveFilter}
          onCancel={() => setIsSaveDialogOpen(false)}
        />
      )}
    </div>
  )
}
