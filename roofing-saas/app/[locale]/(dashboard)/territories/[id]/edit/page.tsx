'use client'

import { useState, useEffect } from 'react'
import { useRouter, Link } from '@/lib/i18n/navigation'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, AlertCircle } from 'lucide-react'

interface Territory {
  id: string
  name: string
  description?: string
  assigned_to?: string
  boundary_data?: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
  created_at: string
}

/**
 * Territory edit page
 *
 * Allows editing territory name, description, and assigned user.
 * Boundary data editing requires the map UI (available on detail page).
 */
export default function TerritoryEditPage() {
  const router = useRouter()
  const params = useParams()
  const territoryId = params.id as string

  const [territory, setTerritory] = useState<Territory | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  // Fetch territory data
  useEffect(() => {
    const fetchTerritory = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/territories/${territoryId}`)

        if (!response.ok) {
          throw new Error('Failed to load territory')
        }

        const result = await response.json()
        const territoryData = result.data?.territory || result.territory || result.data || result
        setTerritory(territoryData)

        // Populate form fields
        setName(territoryData.name || '')
        setDescription(territoryData.description || '')
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load territory')
      } finally {
        setLoading(false)
      }
    }

    if (territoryId) {
      fetchTerritory()
    }
  }, [territoryId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/territories/${territoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description: description || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to update territory')
      }

      // Navigate back to territory detail page
      router.push(`/territories/${territoryId}`)
      router.refresh()
    } catch (err) {
      console.error('Error updating territory:', err)
      setError(err instanceof Error ? err.message : 'Failed to update territory')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    )
  }

  if (!territory) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">{error || 'Territory not found'}</p>
          </div>
          <Link
            href="/knocks"
            className="inline-block mt-4 text-primary hover:text-primary/80"
          >
            Back to Field Activity
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Edit Territory</h1>
          <p className="text-muted-foreground mt-1">
            Update the details for {territory.name}
          </p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Territory Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter territory name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this territory"
                rows={4}
              />
            </div>

            {territory.boundary_data && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> To edit the territory boundary, use the map editor on the{' '}
                  <Link href={`/territories/${territoryId}`} className="text-primary hover:underline">
                    territory detail page
                  </Link>.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/territories/${territoryId}`)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
