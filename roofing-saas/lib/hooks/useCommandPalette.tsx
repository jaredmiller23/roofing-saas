"use client"

import React, { useCallback, useEffect, useState, useMemo, createContext, useContext, ReactNode } from 'react'
import { apiFetch } from '@/lib/api/client'

export interface SearchResult {
  id: string
  title: string
  subtitle?: string
  type: 'contact' | 'project' | 'estimate' | 'message'
  href?: string
  icon?: string
}

export interface QuickAction {
  id: string
  title: string
  description: string
  icon: string
  href?: string
  action?: () => void
  keywords: string[]
}

interface CommandPaletteState {
  isOpen: boolean
  query: string
  results: SearchResult[]
  actions: QuickAction[]
  selectedIndex: number
  recentItems: SearchResult[]
  isLoading: boolean
}

interface CommandPaletteActions {
  open: () => void
  close: () => void
  setQuery: (query: string) => void
  setResults: (results: SearchResult[]) => void
  setActions: (actions: QuickAction[]) => void
  setSelectedIndex: (index: number) => void
  addRecentItem: (item: SearchResult) => void
  setLoading: (loading: boolean) => void
  reset: () => void
}

type CommandPaletteContextType = CommandPaletteState & CommandPaletteActions

const CommandPaletteContext = createContext<CommandPaletteContextType | null>(null)

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<CommandPaletteState>({
    isOpen: false,
    query: '',
    results: [],
    actions: getDefaultQuickActions(),
    selectedIndex: 0,
    recentItems: [],
    isLoading: false,
  })

  // Memoize actions to prevent infinite re-render loops
  // These functions use setState with callback form, so they don't need state as dependencies
  const actions: CommandPaletteActions = useMemo(() => ({
    open: () => setState(prev => ({ ...prev, isOpen: true })),
    close: () => setState(prev => ({ ...prev, isOpen: false, query: '', selectedIndex: 0 })),
    setQuery: (query: string) => setState(prev => ({ ...prev, query, selectedIndex: 0 })),
    setResults: (results: SearchResult[]) => setState(prev => ({ ...prev, results })),
    setActions: (actions: QuickAction[]) => setState(prev => ({ ...prev, actions })),
    setSelectedIndex: (selectedIndex: number) => setState(prev => ({ ...prev, selectedIndex })),
    setLoading: (isLoading: boolean) => setState(prev => ({ ...prev, isLoading })),
    addRecentItem: (item: SearchResult) => setState(prev => {
      const filtered = prev.recentItems.filter(i => i.id !== item.id)
      return { ...prev, recentItems: [item, ...filtered].slice(0, 5) }
    }),
    reset: () => setState(prev => ({
      ...prev,
      query: '',
      results: [],
      selectedIndex: 0,
      isLoading: false
    }))
  }), [])

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    ...state,
    ...actions
  }), [state, actions])

  return (
    <CommandPaletteContext.Provider value={contextValue}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

export function useCommandPalette() {
  const context = useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }

  // Search debouncing
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== context.query) {
        context.setQuery(searchQuery)
      }
    }, 150)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Fetch search results
  useEffect(() => {
    const fetchResults = async () => {
      if (!context.query.trim()) {
        context.setResults([])
        context.setActions(getDefaultQuickActions())
        context.setLoading(false)
        return
      }

      context.setLoading(true)

      try {
        const data = await apiFetch<{ results: SearchResult[]; total: number; query: string }>(`/api/search/global?q=${encodeURIComponent(context.query)}`)
        context.setResults(data.results || [])

        // Filter quick actions based on query
        const filteredActions = getDefaultQuickActions().filter(action =>
          action.title.toLowerCase().includes(context.query.toLowerCase()) ||
          action.description.toLowerCase().includes(context.query.toLowerCase()) ||
          action.keywords.some(keyword => keyword.toLowerCase().includes(context.query.toLowerCase()))
        )
        context.setActions(filteredActions)
      } catch (error) {
        console.error('Search error:', error)
        context.setResults([])
        context.setActions([])
      } finally {
        context.setLoading(false)
      }
    }

    if (context.isOpen) {
      fetchResults()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.query, context.isOpen])

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!context.isOpen) return

    const totalItems = context.results.length + context.actions.length

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        context.setSelectedIndex(Math.min(context.selectedIndex + 1, totalItems - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        context.setSelectedIndex(Math.max(context.selectedIndex - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        const selectedItem = context.selectedIndex < context.results.length
          ? context.results[context.selectedIndex]
          : context.actions[context.selectedIndex - context.results.length]

        if (selectedItem) {
          if ('href' in selectedItem && selectedItem.href) {
            // Navigate to result
            window.location.href = selectedItem.href
            context.addRecentItem(selectedItem as SearchResult)
          } else if ('action' in selectedItem && selectedItem.action) {
            // Execute quick action
            selectedItem.action()
          }
          context.close()
        }
        break
      case 'Escape':
        e.preventDefault()
        context.close()
        break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [context.isOpen, context.selectedIndex, context.results, context.actions])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return {
    ...context,
    setSearchQuery
  }
}

function getDefaultQuickActions(): QuickAction[] {
  return [
    {
      id: 'create-contact',
      title: 'Create Contact',
      description: 'Add a new contact to your CRM',
      icon: '👤',
      href: '/contacts/new',
      keywords: ['new', 'add', 'contact', 'person', 'client']
    },
    {
      id: 'create-project',
      title: 'New Project',
      description: 'Start a new project',
      icon: '📁',
      href: '/projects/new',
      keywords: ['new', 'project', 'create', 'start']
    },
    {
      id: 'create-estimate',
      title: 'New Estimate',
      description: 'Create a new estimate',
      icon: '📄',
      href: '/estimates/new',
      keywords: ['new', 'estimate', 'quote', 'proposal']
    },
    {
      id: 'view-calendar',
      title: 'View Calendar',
      description: 'Open your calendar',
      icon: '📅',
      href: '/calendar',
      keywords: ['calendar', 'schedule', 'appointments', 'events']
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Access reports and analytics',
      icon: '📊',
      href: '/reports',
      keywords: ['reports', 'analytics', 'stats', 'data']
    }
  ]
}