'use client'

import { useState } from 'react'
import { useRouter, Link } from '@/lib/i18n/navigation'
import { TerritoryForm } from '@/components/territories/TerritoryForm'
import { TerritoryMapEditor } from '@/components/territories/TerritoryMapEditor'
import type { TerritoryBoundary } from '@/lib/geo/territory'

/**
 * Create new territory page
 *
 * Features:
 * - Draw territory boundary on map
 * - Fill out territory details (name, description, assigned_to)
 * - Save territory to database
 * - Redirect to territories list on success
 */
export default function NewTerritoryPage() {
  const router = useRouter()
  const [boundaryData, setBoundaryData] = useState<TerritoryBoundary | null>(null)

  const handleBoundaryChange = (boundary: TerritoryBoundary | null) => {
    setBoundaryData(boundary)
  }

  const handleSuccess = () => {
    router.push('/knocks')
  }

  const handleCancel = () => {
    router.push('/knocks')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Territory</h1>
            <p className="text-muted-foreground mt-1">
              Draw territory boundaries and add details
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
              Draw Territory Boundary
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
              mode="create"
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
