'use client'

import * as React from 'react'
import { apiFetch } from '@/lib/api/client'
import { Sparkles, Plus, Clock, Star, TrendingUp, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { QueryInput, useQueryInput } from '@/components/bi/QueryInput'
import { QueryResults } from '@/components/bi/QueryResults'
import { QuerySuggestions } from '@/components/bi/QuerySuggestions'
import { QueryHistory } from '@/components/bi/QueryHistory'
import {
  type QueryResult,
  type QuerySuggestion,
  type QueryHistory as QueryHistoryType
} from '@/lib/ai/query-types'

interface InsightsPageClientProps {
  userRole: string
}

export function InsightsPageClient({
  userRole
}: InsightsPageClientProps) {
  const { isOpen, setIsOpen } = useQueryInput()

  // State management
  const [currentQuery, setCurrentQuery] = React.useState('')
  const [currentResult, setCurrentResult] = React.useState<QueryResult | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [suggestions, setSuggestions] = React.useState<QuerySuggestion[]>([])
  const [queryHistory, setQueryHistory] = React.useState<QueryHistoryType[]>([])
  const [recentQueries, setRecentQueries] = React.useState<string[]>([])
  const [favoriteQueries, setFavoriteQueries] = React.useState<string[]>([])
  const [activeTab, setActiveTab] = React.useState('explore')

  // Load initial data functions wrapped in useCallback
  const loadSuggestions = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ suggestions: QuerySuggestion[] }>('/api/insights/suggestions')
      setSuggestions(data.suggestions || [])
    } catch (error) {
      console.error('Failed to load suggestions:', error)
    }
  }, [])

  const loadQueryHistory = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ history: QueryHistoryType[] }>('/api/insights/history')
      setQueryHistory(data.history || [])

      // Extract recent and favorite queries
      const recent = data.history
        ?.filter((h: QueryHistoryType) => h.result.success)
        .slice(0, 5)
        .map((h: QueryHistoryType) => h.query) || []

      const favorites = data.history
        ?.filter((h: QueryHistoryType) => h.isFavorite && h.result.success)
        .slice(0, 5)
        .map((h: QueryHistoryType) => h.query) || []

      setRecentQueries(recent)
      setFavoriteQueries(favorites)
    } catch (error) {
      console.error('Failed to load query history:', error)
    }
  }, [])

  React.useEffect(() => {
    loadSuggestions()
    loadQueryHistory()
  }, [loadSuggestions, loadQueryHistory])

  const handleQuerySubmit = async (query: string) => {
    setCurrentQuery(query)
    setCurrentResult(null)
    setIsLoading(true)
    setActiveTab('results')

    try {
      const data = await apiFetch<{ result: QueryResult }>('/api/insights/query', {
        method: 'POST',
        body: { query }
      })

      setCurrentResult(data.result)

      // Add to recent queries if not already there
      setRecentQueries(prev => {
        const filtered = prev.filter(q => q !== query)
        return [query, ...filtered].slice(0, 5)
      })

      // Reload history to include this new query
      loadQueryHistory()
    } catch (error) {
      console.error('Query execution failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Query failed'
      setCurrentResult({
        success: false,
        data: [],
        columns: [],
        metadata: {
          executionTime: 0,
          rowCount: 0,
          fromCache: false,
          sql: '',
          riskLevel: 'HIGH',
          timestamp: new Date()
        },
        visualization: 'table',
        error: errorMessage
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleFavorite = async (queryId?: string) => {
    if (queryId) {
      // Toggle favorite for history item
      try {
        await apiFetch('/api/insights/favorites', {
          method: 'POST',
          body: { queryId }
        })

        loadQueryHistory() // Reload to reflect changes
      } catch (error) {
        console.error('Failed to toggle favorite:', error)
      }
    } else if (currentQuery) {
      // Add current query to favorites
      setFavoriteQueries(prev => {
        const filtered = prev.filter(q => q !== currentQuery)
        return [currentQuery, ...filtered].slice(0, 5)
      })
    }
  }

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await apiFetch(`/api/insights/history/${queryId}`, {
        method: 'DELETE'
      })

      loadQueryHistory() // Reload to reflect changes
    } catch (error) {
      console.error('Failed to delete query:', error)
    }
  }

  const handleExportCSV = () => {
    if (!currentResult?.success || !currentResult.data.length) return

    const headers = currentResult.columns.map(col => col.name).join(',')
    const rows = currentResult.data.map(row =>
      currentResult.columns.map(col => {
        const value = (row as Record<string, unknown>)[col.name]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      }).join(',')
    ).join('\n')

    const csv = `${headers}\n${rows}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `insights-${Date.now()}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const isFavoriteQuery = favoriteQueries.includes(currentQuery)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Business Intelligence</h1>
                <p className="text-muted-foreground">
                  Ask questions about your data in natural language
                </p>
              </div>
            </div>

            <Button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Ask a Question
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4" />
              New Query
              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                ⌘⇧K
              </span>
            </Button>

            {favoriteQueries.slice(0, 3).map((query, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleQuerySubmit(query)}
                className="flex items-center gap-2 max-w-48"
              >
                <Star className="h-3 w-3 text-yellow-500 fill-current" />
                <span className="truncate">{query}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-96">
            <TabsTrigger value="explore" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Explore
            </TabsTrigger>
            <TabsTrigger value="results" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Results
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Explore Tab */}
          <TabsContent value="explore" className="space-y-6">
            <QuerySuggestions
              suggestions={suggestions}
              onQuerySelect={handleQuerySubmit}
              userRole={userRole}
            />
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {currentQuery ? (
              <div className="relative">
                {isLoading && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-lg">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <QueryResults
                  result={currentResult}
                  query={currentQuery}
                  isLoading={isLoading}
                  isFavorite={isFavoriteQuery}
                  onToggleFavorite={() => handleToggleFavorite()}
                  onExportCSV={handleExportCSV}
                  onViewSQL={() => {
                    if (currentResult?.metadata.sql) {
                      console.log('SQL:', currentResult.metadata.sql)
                      // In a real app, this would open a modal or copy to clipboard
                    }
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Query Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Ask a question to see your results here.
                </p>
                <Button onClick={() => setIsOpen(true)}>
                  Ask Your First Question
                </Button>
              </div>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <QueryHistory
              history={queryHistory}
              onQueryRerun={handleQuerySubmit}
              onToggleFavorite={handleToggleFavorite}
              onDeleteQuery={handleDeleteQuery}
              onViewResult={(queryId) => {
                // In a real app, this would show the specific result
                const historyItem = queryHistory.find(h => h.id === queryId)
                if (historyItem) {
                  setCurrentQuery(historyItem.query)
                  setCurrentResult(historyItem.result)
                  setActiveTab('results')
                }
              }}
              onExportResult={(queryId) => {
                // In a real app, this would export the specific result
                const historyItem = queryHistory.find(h => h.id === queryId)
                if (historyItem?.result.success) {
                  // Export logic here
                }
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Query Input Modal */}
      <QueryInput
        open={isOpen}
        onOpenChange={setIsOpen}
        onQuerySubmit={handleQuerySubmit}
        suggestions={suggestions}
        recentQueries={recentQueries}
        favoriteQueries={favoriteQueries}
        isLoading={isLoading}
      />
    </div>
  )
}