'use client'

import * as React from 'react'
import {
  Clock,
  Star,
  StarOff,
  Trash2,
  Play,
  Download,
  Eye,
  Search,
  MoreHorizontal,
  TrendingUp,
  Database,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { type QueryHistory, type VisualizationType } from '@/lib/ai/query-types'

interface QueryHistoryProps {
  history: QueryHistory[]
  onQueryRerun: (query: string) => void
  onToggleFavorite: (queryId: string) => void
  onDeleteQuery: (queryId: string) => void
  onViewResult: (queryId: string) => void
  onExportResult: (queryId: string) => void
  isLoading?: boolean
}

type FilterType = 'all' | 'favorites' | 'successful' | 'failed'
type SortType = 'newest' | 'oldest' | 'fastest' | 'slowest' | 'alphabetical'

export function QueryHistory({
  history,
  onQueryRerun,
  onToggleFavorite,
  onDeleteQuery,
  onViewResult,
  onExportResult,
  isLoading = false
}: QueryHistoryProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [filter, setFilter] = React.useState<FilterType>('all')
  const [sort, setSort] = React.useState<SortType>('newest')
  const [selectedTimeRange, setSelectedTimeRange] = React.useState<string>('all')

  // Filter and sort history
  const filteredAndSortedHistory = React.useMemo(() => {
    let filtered = history.filter(query => {
      // Text search
      if (searchTerm && !query.query.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Filter by type
      switch (filter) {
        case 'favorites':
          return query.isFavorite
        case 'successful':
          return query.result.success
        case 'failed':
          return !query.result.success
        default:
          return true
      }
    })

    // Time range filter
    if (selectedTimeRange !== 'all') {
      const now = new Date()
      const timeRanges = {
        'today': 1,
        'week': 7,
        'month': 30
      }
      const days = timeRanges[selectedTimeRange as keyof typeof timeRanges]
      if (days) {
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        filtered = filtered.filter(query => new Date(query.timestamp) >= cutoff)
      }
    }

    // Sort
    return filtered.sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        case 'fastest':
          return a.executionTime - b.executionTime
        case 'slowest':
          return b.executionTime - a.executionTime
        case 'alphabetical':
          return a.query.localeCompare(b.query)
        case 'newest':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      }
    })
  }, [history, searchTerm, filter, sort, selectedTimeRange])

  const stats = React.useMemo(() => {
    const totalQueries = history.length
    const successfulQueries = history.filter(q => q.result.success).length
    const favoriteQueries = history.filter(q => q.isFavorite).length
    const avgExecutionTime = history.length > 0
      ? Math.round(history.reduce((sum, q) => sum + q.executionTime, 0) / history.length)
      : 0

    return {
      total: totalQueries,
      successful: successfulQueries,
      successRate: totalQueries > 0 ? Math.round((successfulQueries / totalQueries) * 100) : 0,
      favorites: favoriteQueries,
      avgExecutionTime
    }
  }, [history])

  if (isLoading) {
    return <QueryHistorySkeleton />
  }

  if (history.length === 0) {
    return <EmptyQueryHistory />
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Query History</h2>
            <p className="text-sm text-muted-foreground">
              Track and rerun your previous data queries
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Database className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total Queries</span>
            </div>
            <span className="text-2xl font-bold">{stats.total}</span>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Success Rate</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.successRate}%</span>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Favorites</span>
            </div>
            <span className="text-2xl font-bold">{stats.favorites}</span>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Avg Time</span>
            </div>
            <span className="text-2xl font-bold">{stats.avgExecutionTime}ms</span>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">This Week</span>
            </div>
            <span className="text-2xl font-bold">
              {history.filter(q => {
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                return new Date(q.timestamp) >= weekAgo
              }).length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search queries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Select value={filter} onValueChange={(value) => setFilter(value as FilterType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Queries</SelectItem>
              <SelectItem value="favorites">Favorites</SelectItem>
              <SelectItem value="successful">Successful</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(value) => setSort(value as SortType)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="fastest">Fastest First</SelectItem>
              <SelectItem value="slowest">Slowest First</SelectItem>
              <SelectItem value="alphabetical">A to Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Query List */}
      {filteredAndSortedHistory.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="mx-auto h-8 w-8 mb-3 opacity-50" />
          <p>No queries match your current filters.</p>
          <p className="text-sm">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedHistory.map((queryItem) => (
            <QueryHistoryItem
              key={queryItem.id}
              query={queryItem}
              onRerun={() => onQueryRerun(queryItem.query)}
              onToggleFavorite={() => onToggleFavorite(queryItem.id)}
              onDelete={() => onDeleteQuery(queryItem.id)}
              onViewResult={() => onViewResult(queryItem.id)}
              onExport={() => onExportResult(queryItem.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function QueryHistoryItem({
  query,
  onRerun,
  onToggleFavorite,
  onDelete,
  onViewResult,
  onExport
}: {
  query: QueryHistory
  onRerun: () => void
  onToggleFavorite: () => void
  onDelete: () => void
  onViewResult: () => void
  onExport: () => void
}) {
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const getVisualizationIcon = (viz: VisualizationType) => {
    switch (viz) {
      case 'bar':
      case 'line':
      case 'area':
        return <TrendingUp className="h-3 w-3" />
      case 'table':
        return <Database className="h-3 w-3" />
      case 'number':
        return <span className="text-xs font-bold">#</span>
      default:
        return <Database className="h-3 w-3" />
    }
  }

  return (
    <div className="bg-card border rounded-lg p-4 hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3">
        {/* Status Indicator */}
        <div className="mt-1">
          {query.result.success ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-destructive" />
          )}
        </div>

        {/* Query Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{query.query}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTimestamp(query.timestamp)}
                </span>
                <span className="flex items-center gap-1">
                  <span>⚡</span>
                  {query.executionTime}ms
                </span>
                {query.result.success && (
                  <span className="flex items-center gap-1">
                    {getVisualizationIcon(query.result.visualization)}
                    {query.result.visualization}
                  </span>
                )}
                {query.result.success && (
                  <span className="flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {query.result.data?.length || 0} rows
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              {query.isFavorite && (
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
              )}
              <Badge
                variant={query.result.success ? 'default' : 'destructive'}
                className="text-xs"
              >
                {query.result.success ? 'Success' : 'Failed'}
              </Badge>
            </div>
          </div>

          {/* Error Message */}
          {!query.result.success && query.result.error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded p-2 mb-2">
              {query.result.error}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRerun}
            className="h-8 w-8 p-0"
          >
            <Play className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleFavorite}
            className="h-8 w-8 p-0"
          >
            {query.isFavorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-current" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {query.result.success && (
                <>
                  <DropdownMenuItem onClick={onViewResult}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Results
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onExport}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

function QueryHistorySkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-8 bg-muted rounded w-48 mb-2" />
        <div className="h-4 bg-muted rounded w-96 mb-6" />

        <div className="grid grid-cols-5 gap-4 mb-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border p-4">
              <div className="h-4 bg-muted rounded w-20 mb-2" />
              <div className="h-6 bg-muted rounded w-12" />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 h-10 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>

      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-4">
            <div className="flex gap-3">
              <div className="h-4 w-4 bg-muted rounded mt-1" />
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="flex gap-4">
                  <div className="h-3 bg-muted rounded w-16" />
                  <div className="h-3 bg-muted rounded w-12" />
                  <div className="h-3 bg-muted rounded w-14" />
                </div>
              </div>
              <div className="flex gap-1">
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded" />
                <div className="h-8 w-8 bg-muted rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmptyQueryHistory() {
  return (
    <div className="text-center py-12">
      <Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">No Query History</h3>
      <p className="text-muted-foreground mb-4">
        Start asking questions about your data to build your query history.
      </p>
      <p className="text-sm text-muted-foreground">
        Your successful queries will be saved here for easy reuse and reference.
      </p>
    </div>
  )
}