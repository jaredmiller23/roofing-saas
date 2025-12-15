"use client"

import React, { useRef, useEffect } from 'react'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useCommandPalette } from '@/lib/hooks/useCommandPalette'
import { SearchResults } from './SearchResults'
import { QuickActions } from './QuickActions'
import { Search, Loader2 } from 'lucide-react'

export function CommandPalette() {
  const {
    isOpen,
    close,
    query,
    setSearchQuery,
    results,
    actions,
    selectedIndex,
    recentItems,
    isLoading,
    reset
  } = useCommandPalette()

  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Reset state when closing
  useEffect(() => {
    if (!isOpen) {
      reset()
    }
  }, [isOpen, reset])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const hasResults = results.length > 0
  const hasActions = actions.length > 0
  const hasRecentItems = !query && recentItems.length > 0
  const showEmptyState = !isLoading && !hasResults && !hasActions && !hasRecentItems && query.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent
        className="max-w-2xl p-0 gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b">
          <Search className="w-4 h-4 text-muted-foreground mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anything or type a command..."
            value={query}
            onChange={handleInputChange}
            className="flex-1 bg-transparent border-0 outline-none text-sm placeholder:text-muted-foreground"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          {isLoading && (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin ml-2" />
          )}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {/* Recent Items (shown when no query) */}
          {hasRecentItems && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                Recent
              </div>
              <SearchResults
                results={recentItems}
                selectedIndex={selectedIndex}
                startIndex={0}
              />
            </div>
          )}

          {/* Quick Actions */}
          {hasActions && (
            <div className="p-2">
              {(hasResults || hasRecentItems) && (
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Actions
                </div>
              )}
              <QuickActions
                actions={actions}
                selectedIndex={selectedIndex}
                startIndex={hasRecentItems ? recentItems.length : (hasResults ? results.length : 0)}
              />
            </div>
          )}

          {/* Search Results */}
          {hasResults && (
            <div className="p-2">
              {(hasActions || hasRecentItems) && (
                <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide">
                  Results
                </div>
              )}
              <SearchResults
                results={results}
                selectedIndex={selectedIndex}
                startIndex={hasRecentItems ? recentItems.length + actions.length : actions.length}
              />
            </div>
          )}

          {/* Empty State */}
          {showEmptyState && (
            <div className="p-8 text-center">
              <div className="text-muted-foreground text-sm">
                No results found for &quot;{query}&quot;
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                Try searching for contacts, projects, or estimates
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && query && !hasResults && !hasActions && (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
              <div className="text-muted-foreground text-sm mt-2">
                Searching...
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                ↑↓
              </kbd>
              <span>Navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                ↵
              </kbd>
              <span>Select</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              Esc
            </kbd>
            <span>Close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}