'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronDown, Star, Users, User } from 'lucide-react'
import type { SavedFilter, EntityType } from '@/lib/filters/types'

interface SavedFilterPickerProps {
  entity_type: EntityType
  filters: SavedFilter[]
  onSelect: (filter_id: string) => void
}

export function SavedFilterPicker({ filters, onSelect }: SavedFilterPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (filters.length === 0) {
    return (
      <div className="text-sm text-muted-foreground italic px-3 py-2">
        No saved filters yet
      </div>
    )
  }

  // Group filters
  const defaultFilters = filters.filter(f => f.is_default)
  const sharedFilters = filters.filter(f => !f.is_default && f.is_shared)
  const personalFilters = filters.filter(f => !f.is_default && !f.is_shared)

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
      >
        <Star className="h-4 w-4" />
        Saved Filters
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full mt-1 w-72 bg-card rounded-lg shadow-lg border border-border z-20 max-h-96 overflow-y-auto">
            <div className="p-2">
              {/* Default Filters */}
              {defaultFilters.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">
                    Default
                  </div>
                  {defaultFilters.map(filter => (
                    <FilterOption
                      key={filter.id}
                      filter={filter}
                      icon={<Star className="h-4 w-4 text-yellow-500" />}
                      onSelect={() => {
                        onSelect(filter.id)
                        setIsOpen(false)
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Shared Filters */}
              {sharedFilters.length > 0 && (
                <div className="mb-2">
                  <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">
                    Shared with Team
                  </div>
                  {sharedFilters.map(filter => (
                    <FilterOption
                      key={filter.id}
                      filter={filter}
                      icon={<Users className="h-4 w-4 text-primary" />}
                      onSelect={() => {
                        onSelect(filter.id)
                        setIsOpen(false)
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Personal Filters */}
              {personalFilters.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">
                    My Filters
                  </div>
                  {personalFilters.map(filter => (
                    <FilterOption
                      key={filter.id}
                      filter={filter}
                      icon={<User className="h-4 w-4 text-muted-foreground" />}
                      onSelect={() => {
                        onSelect(filter.id)
                        setIsOpen(false)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface FilterOptionProps {
  filter: SavedFilter
  icon: React.ReactNode
  onSelect: () => void
}

function FilterOption({ filter, icon, onSelect }: FilterOptionProps) {
  return (
    <button
      onClick={onSelect}
      className="w-full flex items-start gap-3 px-3 py-2 text-left hover:bg-muted rounded-md transition-colors group"
    >
      <div className="mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {filter.name}
        </div>
        {filter.description && (
          <div className="text-xs text-muted-foreground truncate mt-0.5">
            {filter.description}
          </div>
        )}
        <div className="text-xs text-muted-foreground mt-1">
          {Object.keys(filter.filter_criteria).length} filter{Object.keys(filter.filter_criteria).length !== 1 ? 's' : ''}
          {filter.usage_count > 0 && ` • Used ${filter.usage_count} times`}
        </div>
      </div>
    </button>
  )
}
