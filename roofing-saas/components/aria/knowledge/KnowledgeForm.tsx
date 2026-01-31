'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { KNOWLEDGE_CATEGORIES, CATEGORY_LABELS } from '@/lib/aria/knowledge-types'
import type { KnowledgeEntry } from '@/lib/aria/knowledge-types'
import { apiFetch } from '@/lib/api/client'

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  category: z.string().min(1, 'Category is required'),
  subcategory: z.string().optional(),
  manufacturer: z.string().optional(),
  tags: z.string().optional(),
  source_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  is_global: z.boolean(),
})

type FormData = z.infer<typeof formSchema>

interface KnowledgeFormProps {
  entry: KnowledgeEntry | null
  onClose: () => void
  onSuccess: () => void
}

export function KnowledgeForm({ entry, onClose, onSuccess }: KnowledgeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isEditing = !!entry

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: entry?.title || '',
      content: entry?.content || '',
      category: entry?.category || '',
      subcategory: entry?.subcategory || '',
      manufacturer: entry?.manufacturer || '',
      tags: entry?.tags?.join(', ') || '',
      source_url: entry?.source_url || '',
      is_global: entry?.is_global || false,
    },
  })

  const isGlobal = watch('is_global')

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const tags = data.tags
        ? data.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []

      if (isEditing) {
        // PATCH - update
        const contentChanged = data.content !== entry.content
        const titleChanged = data.title !== entry.title

        await apiFetch('/api/knowledge', {
          method: 'PATCH',
          body: {
            id: entry.id,
            title: data.title,
            content: data.content,
            category: data.category,
            subcategory: data.subcategory || null,
            manufacturer: data.manufacturer || null,
            tags,
            source_url: data.source_url || null,
            is_global: data.is_global,
            regenerate_embedding: contentChanged || titleChanged,
          },
        })
      } else {
        // POST - create
        await apiFetch('/api/knowledge', {
          method: 'POST',
          body: {
            title: data.title,
            content: data.content,
            category: data.category,
            subcategory: data.subcategory || null,
            manufacturer: data.manufacturer || null,
            tags,
            source_url: data.source_url || null,
            is_global: data.is_global,
            generate_embedding: true,
          },
        })
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-lg w-full border border-border max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            {isEditing ? 'Edit Knowledge Entry' : 'Add Knowledge Entry'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., GAF Timberline HDZ Installation Guide"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-red-400">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Knowledge content..."
              rows={6}
              {...register('content')}
            />
            {errors.content && (
              <p className="text-xs text-red-400">{errors.content.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                {...register('category')}
                className="w-full h-9 rounded-md border border-border bg-card text-sm text-foreground px-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">Select category</option>
                {KNOWLEDGE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
              {errors.category && (
                <p className="text-xs text-red-400">{errors.category.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                placeholder="Optional subcategory"
                {...register('subcategory')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="manufacturer">Manufacturer</Label>
            <Input
              id="manufacturer"
              placeholder="e.g., GAF, Owens Corning"
              {...register('manufacturer')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              placeholder="e.g., shingles, installation, warranty"
              {...register('tags')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source_url">Source URL</Label>
            <Input
              id="source_url"
              placeholder="https://..."
              {...register('source_url')}
            />
            {errors.source_url && (
              <p className="text-xs text-red-400">{errors.source_url.message}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="is_global"
              checked={isGlobal}
              onCheckedChange={(checked) => setValue('is_global', checked)}
            />
            <Label htmlFor="is_global" className="cursor-pointer">
              Global entry (available to all tenants)
            </Label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
