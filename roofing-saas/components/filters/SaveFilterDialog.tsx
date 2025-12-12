'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface SaveFilterDialogProps {
  onSave: (name: string, description?: string) => Promise<void>
  onCancel: () => void
}

export function SaveFilterDialog({ onSave, onCancel }: SaveFilterDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSaving(true)
    try {
      await onSave(name.trim(), description.trim() || undefined)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onCancel} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-foreground">
              Save Filter Preset
            </h3>
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label htmlFor="filter-name" className="block text-sm font-medium text-muted-foreground mb-1">
                Filter Name <span className="text-red-500">*</span>
              </label>
              <input
                id="filter-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Priority Leads"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="filter-description" className="block text-sm font-medium text-muted-foreground mb-1">
                Description (optional)
              </label>
              <textarea
                id="filter-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this filter for?"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim() || isSaving}>
                {isSaving ? 'Saving...' : 'Save Filter'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
