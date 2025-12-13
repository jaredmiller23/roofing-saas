'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Territory {
  id: string
  tenant_id: string
  name: string
  description?: string
  boundary_data?: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: number[][][] | number[][][][]
  }
  assigned_to?: string
  created_at: string
  updated_at: string
}

interface TerritoryListProps {
  assignedTo?: string
  onTerritorySelect?: (territory: Territory) => void
  onTerritoryEdit?: (territoryId: string) => void
  onTerritoryDelete?: (territoryId: string) => void
  autoLoad?: boolean
  /** Compact mode: horizontal grid, no card wrapper, minimal details */
  compact?: boolean
  /** Currently selected territory ID (for highlighting in compact mode) */
  selectedTerritoryId?: string
}

export function TerritoryList({
  assignedTo,
  onTerritorySelect,
  onTerritoryEdit,
  onTerritoryDelete,
  autoLoad = true,
  compact = false,
  selectedTerritoryId,
}: TerritoryListProps) {
  const [territories, setTerritories] = useState<Territory[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Fetch territories
  const fetchTerritories = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (assignedTo) params.append('assigned_to', assignedTo)
      params.append('limit', '100')

      const response = await fetch(`/api/territories?${params.toString()}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to load territories')
      }

      const result = await response.json()
      // API wraps response in {success, data} format
      const territories = result.data?.territories || result.territories || []
      setTerritories(territories)
    } catch (err) {
      console.error('Territory fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load territories')
    } finally {
      setLoading(false)
    }
  }, [assignedTo])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      fetchTerritories()
    }
  }, [autoLoad, fetchTerritories])

  // Handle territory deletion
  const handleDelete = useCallback(
    async (territoryId: string) => {
      try {
        const response = await fetch(`/api/territories/${territoryId}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to delete territory')
        }

        // Remove from local state
        setTerritories(prev => prev.filter(t => t.id !== territoryId))
        setDeleteConfirm(null)

        // Notify parent
        onTerritoryDelete?.(territoryId)
      } catch (err) {
        console.error('Territory delete error:', err)
        alert(err instanceof Error ? err.message : 'Failed to delete territory')
      }
    },
    [onTerritoryDelete]
  )

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  // Get boundary type
  const getBoundaryType = (territory: Territory) => {
    if (!territory.boundary_data) return 'No boundary'
    return territory.boundary_data.type
  }

  // Count boundary points (simplified)
  const countBoundaryPoints = (territory: Territory) => {
    if (!territory.boundary_data) return 0

    if (territory.boundary_data.type === 'Polygon') {
      const coords = territory.boundary_data.coordinates as number[][][]
      return coords[0]?.length || 0
    } else {
      const coords = territory.boundary_data.coordinates as number[][][][]
      return coords[0]?.[0]?.length || 0
    }
  }

  // Compact mode: horizontal grid of territory buttons
  if (compact) {
    if (loading && territories.length === 0) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      )
    }

    if (error) {
      return (
        <div className="text-sm text-red-600 py-4">{error}</div>
      )
    }

    if (territories.length === 0) {
      return (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No territories yet. Create one to start tracking.
        </div>
      )
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {territories.map(territory => (
          <button
            key={territory.id}
            onClick={() => onTerritorySelect?.(territory)}
            className={`
              p-4 rounded-lg border text-left transition-all
              ${selectedTerritoryId === territory.id
                ? 'border-primary bg-primary/10 ring-2 ring-primary ring-offset-2'
                : 'border-border hover:border-primary hover:bg-accent'
              }
            `}
          >
            <h3 className="font-medium text-foreground truncate">{territory.name}</h3>
            {territory.description && (
              <p className="text-xs text-muted-foreground truncate mt-1">{territory.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {territory.boundary_data ? (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  {countBoundaryPoints(territory)} pts
                </span>
              ) : (
                <span className="text-orange-600">No boundary</span>
              )}
            </div>
            {onTerritoryEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTerritoryEdit(territory.id)
                }}
                className="mt-2 text-xs text-primary hover:underline"
              >
                Edit
              </button>
            )}
          </button>
        ))}
      </div>
    )
  }

  // Full mode: Card with detailed list
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Territories ({territories.length})</CardTitle>
            <CardDescription>
              {assignedTo ? 'Territories assigned to user' : 'All territories'}
            </CardDescription>
          </div>
          <button
            onClick={fetchTerritories}
            disabled={loading}
            className="px-3 py-1 text-sm border border-border text-muted-foreground rounded-md hover:bg-accent disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-4">
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && territories.length === 0 && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* Empty state */}
        {!loading && territories.length === 0 && !error && (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
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
            <p className="mt-2 text-sm text-muted-foreground">No territories yet</p>
          </div>
        )}

        {/* Territory list */}
        {territories.length > 0 && (
          <div className="space-y-3">
            {territories.map(territory => (
              <div
                key={territory.id}
                className="border border rounded-lg p-4 hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between">
                  {/* Territory info */}
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => onTerritorySelect?.(territory)}
                  >
                    <h3 className="font-semibold text-foreground">{territory.name}</h3>

                    {territory.description && (
                      <p className="text-sm text-muted-foreground mt-1">{territory.description}</p>
                    )}

                    <div className="flex flex-wrap gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
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
                        {getBoundaryType(territory)}
                      </span>

                      {territory.boundary_data && (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          {countBoundaryPoints(territory)} points
                        </span>
                      )}

                      <span className="flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Created {formatDate(territory.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 ml-4">
                    {onTerritoryEdit && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          onTerritoryEdit(territory.id)
                        }}
                        className="p-2 text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="Edit"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    )}

                    {onTerritoryDelete && (
                      <>
                        {deleteConfirm === territory.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleDelete(territory.id)
                              }}
                              className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                setDeleteConfirm(null)
                              }}
                              className="px-2 py-1 bg-muted text-white text-xs rounded hover:bg-muted/80"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setDeleteConfirm(territory.id)
                            }}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
