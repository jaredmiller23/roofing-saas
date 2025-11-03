'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TerritoryForm } from '@/components/territories/TerritoryForm'
// TerritoryMapEditor temporarily disabled during Google Maps migration
// import { TerritoryMapEditor } from '@/components/territories/TerritoryMapEditor'
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
    router.push('/territories')
  }

  const handleCancel = () => {
    router.push('/territories')
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Create Territory</h1>
            <p className="text-gray-600 mt-1">
              Draw territory boundaries and add details
            </p>
          </div>

          <Link
            href="/territories"
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Territories
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Map Editor - Temporarily Disabled */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Draw Territory Boundary
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center" style={{ height: '600px' }}>
              <div className="flex flex-col items-center justify-center h-full">
                <svg className="w-16 h-16 text-yellow-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Territory Drawing Temporarily Disabled
                </h3>
                <p className="text-gray-600 max-w-md">
                  The territory boundary editor is being migrated to Google Maps Drawing Manager.
                  For now, territories can be created via the API or you can skip the boundary and add it later.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Territory Form */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
