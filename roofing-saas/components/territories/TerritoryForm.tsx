'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { TerritoryBoundary } from '@/lib/geo/territory'

interface Territory {
  id: string
  tenant_id: string
  name: string
  description?: string
  boundary_data?: TerritoryBoundary
  assigned_to?: string
  created_at: string
  updated_at: string
}

interface TerritoryFormProps {
  territory?: Territory
  mode?: 'create' | 'edit'
  onSuccess?: (territory: Territory) => void
  onCancel?: () => void
  boundaryData?: TerritoryBoundary | null
}

export function TerritoryForm({
  territory,
  mode = 'create',
  onSuccess,
  onCancel,
  boundaryData,
}: TerritoryFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: territory?.name || '',
    description: territory?.description || '',
    assigned_to: territory?.assigned_to || '',
    boundary_data: boundaryData || territory?.boundary_data || null,
  })

  // Update boundary data if provided via props
  useEffect(() => {
    if (boundaryData) {
      setFormData(prev => ({
        ...prev,
        boundary_data: boundaryData,
      }))
    }
  }, [boundaryData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validate name
      if (!formData.name.trim()) {
        throw new Error('Name is required')
      }

      // Prepare data
      const data = {
        name: formData.name.trim(),
        description: formData.description?.trim() || undefined,
        assigned_to: formData.assigned_to || undefined,
        boundary_data: formData.boundary_data || undefined,
      }

      const url = mode === 'edit' && territory ? `/api/territories/${territory.id}` : '/api/territories'
      const method = mode === 'edit' ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save territory')
      }

      const result = await response.json()

      // Notify parent or redirect
      if (onSuccess) {
        onSuccess(result.territory)
      } else {
        router.push('/territories')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  // Count boundary points (for display)
  const getBoundaryPointCount = () => {
    if (!formData.boundary_data) return 0

    if (formData.boundary_data.type === 'Polygon') {
      const coords = formData.boundary_data.coordinates as number[][][]
      return coords[0]?.length || 0
    } else {
      const coords = formData.boundary_data.coordinates as number[][][][]
      return coords[0]?.[0]?.length || 0
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'edit' ? 'Edit Territory' : 'Create Territory'}</CardTitle>
        <CardDescription>
          {mode === 'edit'
            ? 'Update territory information and boundaries'
            : 'Create a new territory for field operations'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-1">
                Territory Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Downtown Nashville"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-muted-foreground mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Describe this territory, key landmarks, or notes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="assigned_to" className="block text-sm font-medium text-muted-foreground mb-1">
                Assigned To (User ID)
              </label>
              <input
                type="text"
                id="assigned_to"
                name="assigned_to"
                value={formData.assigned_to}
                onChange={handleChange}
                placeholder="UUID of assigned user (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank for unassigned. User must belong to your organization.
              </p>
            </div>
          </div>

          {/* Boundary Information */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-foreground mb-3">Boundary Data</h3>

            {formData.boundary_data ? (
              <div className="bg-gray-50 border border rounded-md p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {formData.boundary_data.type}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {getBoundaryPointCount()} points defined
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, boundary_data: null })}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border rounded-md p-4 text-center">
                <svg
                  className="mx-auto h-8 w-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <p className="text-sm text-muted-foreground mt-2">No boundary defined</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Use the map tool to draw territory boundaries
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? 'Saving...'
                : mode === 'edit'
                  ? 'Update Territory'
                  : 'Create Territory'}
            </button>
            <button
              type="button"
              onClick={() => {
                if (onCancel) {
                  onCancel()
                } else {
                  router.back()
                }
              }}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 text-muted-foreground rounded-md hover:bg-accent disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
