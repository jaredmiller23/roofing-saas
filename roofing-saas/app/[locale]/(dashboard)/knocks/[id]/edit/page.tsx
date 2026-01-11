'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TerritoryForm } from '@/components/territories/TerritoryForm'
import { TerritoryMapEditor } from '@/components/territories/TerritoryMapEditor'
import type { TerritoryBoundary } from '@/lib/geo/territory'
import { Skeleton } from '@/components/ui/skeleton'

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

interface EditTerritoryPageProps {
  params: Promise<{ id: string }>
}

/**
 * Edit territory page
 *
 * Features:
 * - Load existing territory data
 * - Edit territory boundary on map
 * - Update territory details (name, description, assigned_to)
 * - Save changes to database
 * - Redirect to knocks page on success
 */
export default function EditTerritoryPage({ params }: EditTerritoryPageProps) {
  const router = useRouter()
  const [territory, setTerritory] = useState<Territory | null>(null)
  const [boundaryData, setBoundaryData] = useState<TerritoryBoundary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch territory data on mount
  useEffect(() => {
    async function fetchTerritory() {
      try {
        const { id } = await params
        const response = await fetch(`/api/territories/${id}`)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error?.message || 'Failed to load territory')
        }

        const result = await response.json()
        const territoryData = result.data?.territory

        if (!territoryData) {
          throw new Error('Territory not found')
        }

        setTerritory(territoryData)
        if (territoryData.boundary_data) {
          setBoundaryData(territoryData.boundary_data)
        }
      } catch (err) {
        console.error('Territory fetch error:', err)
        setError(err instanceof Error ? err.message : 'Failed to load territory')
      } finally {
        setLoading(false)
      }
    }

    fetchTerritory()
  }, [params])

  const handleBoundaryChange = (boundary: TerritoryBoundary | null) => {
    setBoundaryData(boundary)
  }

  const handleSuccess = () => {
    router.push('/knocks')
  }

  const handleCancel = () => {
    router.push('/knocks')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
            <Skeleton className="h-5 w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-[600px] w-full rounded-lg" />
            </div>
            <div>
              <Skeleton className="h-6 w-36 mb-4" />
              <Skeleton className="h-96 w-full rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !territory) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Territory</h2>
            <p className="mb-4">{error || 'Territory not found'}</p>
            <Link
              href="/knocks"
              className="text-primary hover:underline font-medium"
            >
              ← Back to Field Activity
            </Link>
          </div>
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
            <h1 className="text-3xl font-bold text-foreground">Edit Territory</h1>
            <p className="text-muted-foreground mt-1">
              Update boundaries and details for {territory.name}
            </p>
          </div>

          <Link
            href="/knocks"
            className="text-muted-foreground hover:text-foreground font-medium"
          >
            ← Back to Field Activity
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Map Editor */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Edit Territory Boundary
            </h2>
            <TerritoryMapEditor
              initialBoundary={boundaryData}
              onBoundaryChange={handleBoundaryChange}
              height="600px"
            />
          </div>

          {/* Right: Territory Form */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Territory Details
            </h2>
            <TerritoryForm
              territory={territory}
              mode="edit"
              boundaryData={boundaryData}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
