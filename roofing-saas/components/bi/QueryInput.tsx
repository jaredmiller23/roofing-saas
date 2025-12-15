'use client'

import * as React from 'react'
import { Search, Sparkles, Clock, Star, TrendingUp } from 'lucide-react'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { type QuerySuggestion } from '@/lib/ai/query-types'

interface QueryInputProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onQuerySubmit: (query: string) => void
  suggestions?: QuerySuggestion[]
  recentQueries?: string[]
  favoriteQueries?: string[]
  isLoading?: boolean
  placeholder?: string
}

export function QueryInput({
  open,
  onOpenChange,
  onQuerySubmit,
  suggestions = [],
  recentQueries = [],
  favoriteQueries = [],
  isLoading = false,
  placeholder = 'Ask a question about your data...'
}: QueryInputProps) {
  const [query, setQuery] = React.useState('')

  const handleSubmit = React.useCallback((queryText: string) => {
    if (queryText.trim()) {
      onQuerySubmit(queryText.trim())
      setQuery('')
      onOpenChange(false)
    }
  }, [onQuerySubmit, onOpenChange])

  const handleKeyDown = React.useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && query.trim()) {
      event.preventDefault()
      handleSubmit(query)
    }
  }, [query, handleSubmit])

  const groupedSuggestions = React.useMemo(() => {
    const groups: Record<string, QuerySuggestion[]> = {}
    suggestions.forEach(suggestion => {
      if (!groups[suggestion.category]) {
        groups[suggestion.category] = []
      }
      groups[suggestion.category].push(suggestion)
    })
    return groups
  }, [suggestions])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
        <Sparkles className="mr-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
        <CommandInput
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
        {isLoading && (
          <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        )}
      </div>

      <CommandList>
        <CommandEmpty>
          <div className="py-6 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {query ? 'No suggestions found. Try asking in a different way.' : 'Start typing to see suggestions...'}
            </p>
            {query && (
              <button
                onClick={() => handleSubmit(query)}
                className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
              >
                Ask: "{query}"
              </button>
            )}
          </div>
        </CommandEmpty>

        {/* Favorite Queries */}
        {favoriteQueries.length > 0 && (
          <>
            <CommandGroup heading="Favorites">
              {favoriteQueries.slice(0, 3).map((favorite, index) => (
                <CommandItem
                  key={index}
                  value={favorite}
                  onSelect={() => handleSubmit(favorite)}
                  className="flex items-center gap-2"
                >
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="flex-1 truncate">{favorite}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Recent Queries */}
        {recentQueries.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recentQueries.slice(0, 3).map((recent, index) => (
                <CommandItem
                  key={index}
                  value={recent}
                  onSelect={() => handleSubmit(recent)}
                  className="flex items-center gap-2"
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 truncate">{recent}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {/* Query Suggestions by Category */}
        {Object.entries(groupedSuggestions).map(([category, categorySuggestions]) => (
          <React.Fragment key={category}>
            <CommandGroup heading={category}>
              {categorySuggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  value={suggestion.query}
                  onSelect={() => handleSubmit(suggestion.query)}
                  className="flex items-start gap-2 py-2"
                >
                  {suggestion.icon ? (
                    <div className="mt-0.5">
                      {suggestion.icon === 'trending' && <TrendingUp className="h-4 w-4 text-green-500" />}
                      {suggestion.icon === 'search' && <Search className="h-4 w-4 text-primary" />}
                      {suggestion.icon === 'sparkles' && <Sparkles className="h-4 w-4 text-primary" />}
                    </div>
                  ) : (
                    <div className="mt-0.5 h-4 w-4 rounded-full bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{suggestion.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{suggestion.description}</div>
                  </div>
                  {suggestion.estimatedTime && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      ~{suggestion.estimatedTime}s
                    </div>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </React.Fragment>
        ))}

        {/* Custom Query Option */}
        {query && (
          <CommandGroup heading="Custom Query">
            <CommandItem
              value={query}
              onSelect={() => handleSubmit(query)}
              className="flex items-center gap-2 py-2"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <div className="font-medium text-sm">Ask: "{query}"</div>
                <div className="text-xs text-muted-foreground">Custom natural language query</div>
              </div>
            </CommandItem>
          </CommandGroup>
        )}
      </CommandList>

      {/* Footer with keyboard shortcut hint */}
      <div className="border-t px-3 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Press Enter to submit your question</span>
          <span>ESC to close</span>
        </div>
      </div>
    </CommandDialog>
  )
}

// Hook for managing query input state
export function useQueryInput() {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    isOpen,
    setIsOpen,
    openQueryInput: () => setIsOpen(true),
    closeQueryInput: () => setIsOpen(false)
  }
}