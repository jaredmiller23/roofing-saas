'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Loader2, Trash2, Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KnowledgeForm } from './KnowledgeForm'
import { CATEGORY_LABELS } from '@/lib/aria/knowledge-types'
import type { KnowledgeEntry } from '@/lib/aria/knowledge-types'
import { apiFetch } from '@/lib/api/client'

export function KnowledgeTable() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [manufacturerFilter, setManufacturerFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KnowledgeEntry | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryFilter) params.set('category', categoryFilter)
      if (manufacturerFilter) params.set('manufacturer', manufacturerFilter)

      const data = await apiFetch<KnowledgeEntry[]>(`/api/knowledge?${params.toString()}`)
      setEntries(data)
    } catch (err) {
      console.error('Failed to fetch knowledge entries:', err)
    } finally {
      setIsLoading(false)
    }
  }, [categoryFilter, manufacturerFilter])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this knowledge entry?')) return

    setDeletingId(id)
    try {
      await apiFetch<void>(`/api/knowledge?id=${id}`, { method: 'DELETE' })
      setEntries(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      console.error('Failed to delete entry:', err)
    } finally {
      setDeletingId(null)
    }
  }

  const handleFormSuccess = () => {
    setShowForm(false)
    setEditingEntry(null)
    fetchEntries()
  }

  const handleEdit = (entry: KnowledgeEntry) => {
    setEditingEntry(entry)
    setShowForm(true)
  }

  // Filter entries by search term (client-side)
  const filteredEntries = entries.filter(entry => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return (
      entry.title.toLowerCase().includes(term) ||
      entry.content.toLowerCase().includes(term) ||
      entry.tags.some(t => t.toLowerCase().includes(term))
    )
  })

  // Get unique manufacturers for filter
  const manufacturers = [...new Set(entries.map(e => e.manufacturer).filter(Boolean))] as string[]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 items-center w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search entries..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {manufacturers.length > 0 && (
            <select
              value={manufacturerFilter}
              onChange={e => setManufacturerFilter(e.target.value)}
              className="h-9 rounded-md border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">All Manufacturers</option>
              {manufacturers.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          )}
        </div>
        <Button onClick={() => { setEditingEntry(null); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-1" />
          Add Entry
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden relative">
        {isLoading && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {filteredEntries.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            {isLoading ? 'Loading...' : entries.length === 0 ? 'No knowledge entries yet.' : 'No entries match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border">
                <tr>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Title</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">Manufacturer</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Tags</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Global</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-border hover:bg-muted/10 transition-colors">
                    <td className="p-3">
                      <div className="text-sm font-medium text-foreground truncate max-w-[200px]">
                        {entry.title}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="text-xs">
                        {CATEGORY_LABELS[entry.category] || entry.category}
                      </Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className="text-sm text-muted-foreground">
                        {entry.manufacturer || '-'}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="flex gap-1 flex-wrap max-w-[200px]">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {entry.tags.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{entry.tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 hidden sm:table-cell">
                      <span className={`text-xs ${entry.is_global ? 'text-primary' : 'text-muted-foreground'}`}>
                        {entry.is_global ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(entry)}
                          className="p-1.5 rounded hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                          aria-label="Edit entry"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          disabled={deletingId === entry.id}
                          className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400 disabled:opacity-50"
                          aria-label="Delete entry"
                        >
                          {deletingId === entry.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Entry count */}
      {!isLoading && (
        <div className="text-xs text-muted-foreground">
          {filteredEntries.length} of {entries.length} entries
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <KnowledgeForm
          entry={editingEntry}
          onClose={() => { setShowForm(false); setEditingEntry(null) }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  )
}
