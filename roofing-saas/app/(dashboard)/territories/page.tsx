'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TerritoryList } from '@/components/territories/TerritoryList'

/**
 * Territories list page
 *
 * Features:
 * - View all territories for current tenant
 * - Create new territories
 * - Edit and delete territories
 * - View territory boundaries on map
 */
export default function TerritoriesPage() {
  const router = useRouter()

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Territories</h1>
            <p className="text-gray-600 mt-1">
              Manage sales territories and assignments
            </p>
          </div>

          <Link
            href="/territories/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Create Territory
          </Link>
        </div>

        {/* Territory List */}
        <div className="mt-6">
          <TerritoryList
            autoLoad={true}
            onTerritorySelect={(territory) => {
              router.push(`/territories/${territory.id}`)
            }}
            onTerritoryEdit={(territoryId) => {
              router.push(`/territories/${territoryId}/edit`)
            }}
          />
        </div>
      </div>
    </div>
  )
}
