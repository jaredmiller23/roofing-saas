'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, User, Briefcase, MapPin, FileText, Phone, Loader2 } from 'lucide-react'

interface SearchResult {
  id: string
  type: 'contact' | 'project' | 'job' | 'territory' | 'file' | 'call_log'
  title: string
  subtitle?: string
  description?: string
  url: string
}

interface GroupedResults {
  [key: string]: SearchResult[]
}

const ENTITY_CONFIG = {
  contact: {
    label: 'Contacts',
    icon: User,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  project: {
    label: 'Projects',
    icon: Briefcase,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
  job: {
    label: 'Jobs',
    icon: MapPin,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  territory: {
    label: 'Territories',
    icon: MapPin,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  file: {
    label: 'Files',
    icon: FileText,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30',
  },
  call_log: {
    label: 'Call Logs',
    icon: Phone,
    color: 'text-secondary',
    bgColor: 'bg-secondary/10',
  },
}

export function GlobalSearch() {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
        setResults([])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Debounced search
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (query) {
      setLoading(true)
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query)
      }, 300)
    } else {
      setResults([])
      setLoading(false)
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [query, performSearch])

  // Group results by type
  const groupedResults: GroupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as GroupedResults)

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      navigateToResult(results[selectedIndex])
    }
  }

  const navigateToResult = (result: SearchResult) => {
    router.push(result.url)
    setIsOpen(false)
    setQuery('')
    setResults([])
    setSelectedIndex(0)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />

      {/* Modal */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4">
        <div className="bg-card rounded-lg shadow-2xl border border-border overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <Search className="h-5 w-5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search contacts, projects, jobs..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 outline-none text-foreground placeholder-gray-400"
            />
            {loading && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setResults([])
                }}
                className="text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/30 border border-border rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {results.length === 0 && query && !loading && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm">No results found for &ldquo;{query}&rdquo;</p>
              </div>
            )}

            {results.length === 0 && !query && (
              <div className="p-8 text-center text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-sm mb-1">Quick search across all your data</p>
                <p className="text-xs text-muted-foreground">
                  Try searching for contacts, projects, jobs, or territories
                </p>
              </div>
            )}

            {Object.entries(groupedResults).map(([type, typeResults]) => {
              const config = ENTITY_CONFIG[type as keyof typeof ENTITY_CONFIG]
              if (!config) return null

              const Icon = config.icon

              return (
                <div key={type} className="py-2">
                  <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/30">
                    {config.label} ({typeResults.length})
                  </div>
                  {typeResults.map((result) => {
                    const globalIndex = results.indexOf(result)
                    const isSelected = globalIndex === selectedIndex

                    return (
                      <button
                        key={result.id}
                        onClick={() => navigateToResult(result)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-accent transition-colors text-left ${
                          isSelected ? 'bg-primary/10 border-l-2 border-primary' : ''
                        }`}
                      >
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground truncate">
                            {result.title}
                          </div>
                          {result.subtitle && (
                            <div className="text-sm text-muted-foreground truncate">
                              {result.subtitle}
                            </div>
                          )}
                          {result.description && (
                            <div className="text-xs text-muted-foreground truncate mt-1">
                              {result.description}
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-xs">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-xs">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-xs">Enter</kbd>
                Select
              </span>
            </div>
            <span>
              <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-xs">⌘K</kbd>
              {' '}to open
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
