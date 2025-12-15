"use client"

import React from 'react'
import { SearchResult } from '@/lib/hooks/useCommandPalette'
import { cn } from '@/lib/utils'
import {
  User,
  FolderOpen,
  FileText,
  MessageSquare
} from 'lucide-react'

interface SearchResultsProps {
  results: SearchResult[]
  selectedIndex: number
  startIndex: number
}

export function SearchResults({ results, selectedIndex, startIndex }: SearchResultsProps) {
  const getTypeIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return <User className="w-4 h-4" />
      case 'project':
        return <FolderOpen className="w-4 h-4" />
      case 'estimate':
        return <FileText className="w-4 h-4" />
      case 'message':
        return <MessageSquare className="w-4 h-4" />
      default:
        return <FileText className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return 'text-blue-500'
      case 'project':
        return 'text-green-500'
      case 'estimate':
        return 'text-purple-500'
      case 'message':
        return 'text-orange-500'
      default:
        return 'text-muted-foreground'
    }
  }

  const getTypeLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'contact':
        return 'Contact'
      case 'project':
        return 'Project'
      case 'estimate':
        return 'Estimate'
      case 'message':
        return 'Message'
      default:
        return 'Item'
    }
  }

  // Group results by type
  const groupedResults = results.reduce((groups, result, index) => {
    const type = result.type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push({ ...result, originalIndex: index })
    return groups
  }, {} as Record<string, (SearchResult & { originalIndex: number })[]>)

  const typeOrder: SearchResult['type'][] = ['contact', 'project', 'estimate', 'message']

  return (
    <div className="space-y-1">
      {typeOrder.map(type => {
        const typeResults = groupedResults[type]
        if (!typeResults || typeResults.length === 0) return null

        return (
          <div key={type}>
            {/* Type Header */}
            <div className="px-2 py-1 text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-2">
              <span className={getTypeColor(type)}>
                {getTypeIcon(type)}
              </span>
              {getTypeLabel(type)}s ({typeResults.length})
            </div>

            {/* Results */}
            <div className="space-y-0.5">
              {typeResults.map((result) => {
                const isSelected = startIndex + result.originalIndex === selectedIndex
                return (
                  <div
                    key={result.id}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 rounded-md text-sm cursor-pointer transition-colors",
                      isSelected
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn("flex-shrink-0", getTypeColor(result.type))}>
                      {getTypeIcon(result.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div className="text-xs text-muted-foreground truncate">
                          {result.subtitle}
                        </div>
                      )}
                    </div>

                    {/* Type Badge */}
                    <div className={cn(
                      "text-xs px-2 py-0.5 rounded-full bg-muted",
                      isSelected && "bg-background/20"
                    )}>
                      {getTypeLabel(result.type)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}