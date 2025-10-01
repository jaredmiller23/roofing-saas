'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TerritoryForm, TerritoryMapEditor } from '@/components/territories'

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
  const [boundaryData, setBoundaryData] = useState<any>(null)

  const handleBoundaryChange = (boundary: any) => {
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
          {/* Left: Map Editor */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Draw Territory Boundary
            </h2>
            <TerritoryMapEditor
              onBoundaryChange={handleBoundaryChange}
              height="600px"
            />
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
