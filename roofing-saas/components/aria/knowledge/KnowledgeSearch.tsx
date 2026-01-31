'use client'

import { useState } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CATEGORY_LABELS, KNOWLEDGE_CATEGORIES } from '@/lib/aria/knowledge-types'
import type { KnowledgeSearchResult } from '@/lib/aria/knowledge-types'
import { apiFetch } from '@/lib/api/client'

export function KnowledgeSearch() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [threshold, setThreshold] = useState(0.7)
  const [results, setResults] = useState<KnowledgeSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    setIsSearching(true)
    setHasSearched(true)

    try {
      const data = await apiFetch<{ results: KnowledgeSearchResult[]; tokens_used: number }>('/api/knowledge/search', {
        method: 'POST',
        body: {
          query: query.trim(),
          category: category || undefined,
          threshold,
          limit: 10,
        },
      })
      setResults(data.results || [])
      setTokensUsed(data.tokens_used || null)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  const getSimilarityColor = (score: number): string => {
    if (score >= 0.85) return 'text-green-400'
    if (score >= 0.7) return 'text-primary'
    if (score >= 0.5) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <div className="bg-card rounded-lg border border-border p-4 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Enter a search query to test..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
          </Button>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Category:</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="h-8 rounded-md border border-border bg-card text-sm text-foreground px-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All</option>
              {KNOWLEDGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Threshold:</label>
            <input
              type="range"
              min="0.5"
              max="0.9"
              step="0.05"
              value={threshold}
              onChange={e => setThreshold(parseFloat(e.target.value))}
              className="w-24 accent-primary"
            />
            <span className="text-sm text-foreground font-mono w-10">{threshold.toFixed(2)}</span>
          </div>

          {tokensUsed !== null && (
            <div className="text-xs text-muted-foreground">
              Embedding tokens: {tokensUsed}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </h3>

          {results.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-6 text-center text-sm text-muted-foreground">
              No results above the similarity threshold ({threshold}).
              Try lowering the threshold or using different keywords.
            </div>
          ) : (
            results.map((result) => (
              <div
                key={result.id}
                className="bg-card rounded-lg border border-border p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-foreground">{result.title}</h4>
                  <span className={`text-sm font-mono font-bold ${getSimilarityColor(result.similarity)}`}>
                    {(result.similarity * 100).toFixed(1)}%
                  </span>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-3">
                  {result.content}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {CATEGORY_LABELS[result.category] || result.category}
                  </Badge>
                  {result.manufacturer && (
                    <Badge variant="outline" className="text-xs">
                      {result.manufacturer}
                    </Badge>
                  )}
                  {result.tags?.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
