'use client'

/**
 * MobileSearchBar Component
 *
 * A simplified search bar component optimized for mobile top bar usage.
 * Features:
 * - Expandable search input
 * - Search icon trigger
 * - Clean mobile-first design
 * - Integrates with global search functionality
 */

import { useState, useRef, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface MobileSearchBarProps {
  /** CSS class name for custom styling */
  className?: string
  /** Placeholder text for the search input */
  placeholder?: string
  /** Whether the search input is currently expanded */
  isExpanded?: boolean
  /** Current search query value */
  value?: string
  /** Callback when search query changes */
  onQueryChange?: (query: string) => void
  /** Callback when search is submitted */
  onSearch?: (query: string) => void
  /** Callback when search is cleared */
  onClear?: () => void
  /** Callback when search input is expanded/collapsed */
  onToggleExpanded?: (expanded: boolean) => void
}

export function MobileSearchBar({
  className,
  placeholder = "Search...",
  isExpanded: controlledExpanded,
  value: controlledValue,
  onQueryChange,
  onSearch,
  onClear,
  onToggleExpanded,
}: MobileSearchBarProps) {
  // Internal state for uncontrolled usage
  const [internalExpanded, setInternalExpanded] = useState(false)
  const [internalValue, setInternalValue] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // Determine if we're in controlled or uncontrolled mode
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded
  const value = controlledValue !== undefined ? controlledValue : internalValue

  // Handle expanding the search input
  const handleToggleExpanded = (expanded: boolean) => {
    if (onToggleExpanded) {
      onToggleExpanded(expanded)
    } else {
      setInternalExpanded(expanded)
    }
  }

  // Handle search query changes
  const handleQueryChange = (query: string) => {
    if (onQueryChange) {
      onQueryChange(query)
    } else {
      setInternalValue(query)
    }
  }

  // Handle search submission
  const handleSearch = () => {
    if (onSearch) {
      onSearch(value)
    }
  }

  // Handle clearing search
  const handleClear = () => {
    handleQueryChange('')
    if (onClear) {
      onClear()
    }
    handleToggleExpanded(false)
  }

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isExpanded])

  // Handle haptic feedback for mobile interactions
  const handleHapticFeedback = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10) // Short, subtle vibration
    }
  }

  return (
    <div className={cn("flex items-center", className)}>
      {isExpanded ? (
        // Expanded search input
        <div className="flex items-center gap-2 bg-background/95 backdrop-blur-sm border border-border/40 rounded-lg px-3 py-2 min-w-[240px] transition-all duration-200">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearch()
              } else if (e.key === 'Escape') {
                handleClear()
              }
            }}
            className="flex-1 outline-none bg-transparent text-foreground placeholder-muted-foreground text-sm"
          />
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                handleHapticFeedback()
                handleQueryChange('')
              }}
              className="h-6 w-6 p-0 hover:bg-accent/50"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              handleHapticFeedback()
              handleClear()
            }}
            className="h-6 w-6 p-0 hover:bg-accent/50"
            aria-label="Close search"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        // Collapsed search icon
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            handleHapticFeedback()
            handleToggleExpanded(true)
          }}
          className={cn(
            "transition-all duration-200",
            "hover:bg-accent/50 focus-visible:bg-accent/50",
            "hover:scale-105 active:scale-95"
          )}
          aria-label="Open search"
        >
          <Search className="h-6 w-6" />
        </Button>
      )}
    </div>
  )
}