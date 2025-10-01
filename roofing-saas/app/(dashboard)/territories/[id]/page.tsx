'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { TerritoryMap } from '@/components/territories'

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
 * Territory detail page
 *
 * Features:
 * - View territory on interactive map
 * - Display territory metadata
 * - Edit and delete actions
 * - Navigate back to list
 */
export default function TerritoryDetailPage() {
  const router = useRouter()
  const params = useParams()
  const territoryId = params.id as string

  const [territory, setTerritory] = useState<Territory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  // Fetch territory data
  useEffect(() => {
    const fetchTerritory = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/territories/${territoryId}`)

        if (!response.ok) {
          throw new Error('Failed to load territory')
        }

        const data = await response.json()
        setTerritory(data)
      } catch (err: any) {
        setError(err.message || 'Failed to load territory')
      } finally {
        setLoading(false)
      }
    }

    if (territoryId) {
      fetchTerritory()
    }
  }, [territoryId])

  // Delete territory
  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/territories/${territoryId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete territory')
      }

      router.push('/territories')
    } catch (err: any) {
      setError(err.message || 'Failed to delete territory')
      setDeleteConfirm(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !territory) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || 'Territory not found'}</p>
          </div>
          <Link
            href="/territories"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Territories
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{territory.name}</h1>
            {territory.description && (
              <p className="text-gray-600 mt-1">{territory.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/territories"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              ← Back to Territories
            </Link>
          </div>
        </div>

        {/* Territory Details Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Details</h2>

          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600">Name</dt>
              <dd className="text-base text-gray-900 mt-1">{territory.name}</dd>
            </div>

            {territory.assigned_to && (
              <div>
                <dt className="text-sm font-medium text-gray-600">Assigned To</dt>
                <dd className="text-base text-gray-900 mt-1">{territory.assigned_to}</dd>
              </div>
            )}

            {territory.description && (
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-600">Description</dt>
                <dd className="text-base text-gray-900 mt-1">{territory.description}</dd>
              </div>
            )}

            {territory.boundary_data && (
              <div>
                <dt className="text-sm font-medium text-gray-600">Boundary Type</dt>
                <dd className="text-base text-gray-900 mt-1">{territory.boundary_data.type}</dd>
              </div>
            )}

            <div>
              <dt className="text-sm font-medium text-gray-600">Created</dt>
              <dd className="text-base text-gray-900 mt-1">
                {new Date(territory.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
            <Link
              href={`/territories/${territory.id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Edit Territory
            </Link>

            {deleteConfirm ? (
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium"
              >
                Delete Territory
              </button>
            )}
          </div>
        </div>

        {/* Map Visualization */}
        {territory.boundary_data && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Territory Map</h2>
            <TerritoryMap
              territories={[territory]}
              selectedTerritoryId={territory.id}
              height="600px"
            />
          </div>
        )}
      </div>
    </div>
  )
}
