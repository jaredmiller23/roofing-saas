'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TerritoryList } from '@/components/territories/TerritoryList'
import { TerritoryMap } from '@/components/territories/TerritoryMapWrapper'
import { HousePinDropper } from '@/components/territories/HousePinDropper'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, MapPin, List, Activity } from 'lucide-react'

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

interface Knock {
  id: string
  created_at: string
  latitude: number
  longitude: number
  address: string | null
  disposition: string | null
  notes: string | null
  contact_id: string | null
  territory_id: string | null
  user_id: string | null
  contact_created: boolean
}

/**
 * Unified Territories & Activity page
 *
 * Features:
 * - Territory list with map visualization
 * - Door knock activity tracking
 * - Split view on desktop: List | Map + Activity
 * - Tabs on mobile: Territories | Map | Activity
 * - Pin dropping on territory maps
 * - Quick knock logging
 */
export default function TerritoriesPage() {
  const router = useRouter()

  // Territory state
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [pinDropEnabled, setPinDropEnabled] = useState(false)

  // Knocks state
  const [knocks, setKnocks] = useState<Knock[]>([])
  const [knocksLoading, setKnocksLoading] = useState(false)
  const [knocksError, setKnocksError] = useState<string | null>(null)

  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'territories' | 'map' | 'activity'>('territories')

  // Fetch knocks for selected territory (or all knocks if no territory selected)
  const fetchKnocks = useCallback(async (territoryId?: string) => {
    setKnocksLoading(true)
    setKnocksError(null)

    try {
      const params = new URLSearchParams()
      if (territoryId) {
        params.append('territory_id', territoryId)
      }
      params.append('limit', '100')

      const response = await fetch(`/api/pins?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to load activity')
      }

      const result = await response.json()
      setKnocks(result.pins || [])
    } catch (err) {
      console.error('Knocks fetch error:', err)
      setKnocksError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setKnocksLoading(false)
    }
  }, [])

  // Load knocks when selected territory changes
  useEffect(() => {
    fetchKnocks(selectedTerritory?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTerritory?.id])

  // Handle territory selection
  const handleTerritorySelect = (territory: Territory) => {
    setSelectedTerritory(territory)
    // On mobile, automatically switch to map tab when territory is selected
    if (window.innerWidth < 768) {
      setMobileTab('map')
    }
  }

  // Memoize territories array for map
  const territoriesArray = useMemo(() => {
    return selectedTerritory ? [selectedTerritory] : []
  }, [selectedTerritory])

  // Calculate knock stats
  const knockStats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthAgo = new Date(today)
    monthAgo.setDate(monthAgo.getDate() - 30)

    return {
      total: knocks.length,
      today: knocks.filter(k => new Date(k.created_at) >= today).length,
      week: knocks.filter(k => new Date(k.created_at) >= weekAgo).length,
      month: knocks.filter(k => new Date(k.created_at) >= monthAgo).length,
    }
  }, [knocks])

  // Format knock disposition for display
  const formatDisposition = (disposition: string | null) => {
    if (!disposition) return 'No disposition'
    return disposition
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Stats cards component - rendered directly to avoid hydration issues
  const StatsCards = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Knocks</CardDescription>
          <CardTitle className="text-3xl">{knockStats.total}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Today</CardDescription>
          <CardTitle className="text-3xl">{knockStats.today}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>This Week</CardDescription>
          <CardTitle className="text-3xl">{knockStats.week}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>This Month</CardDescription>
          <CardTitle className="text-3xl">{knockStats.month}</CardTitle>
        </CardHeader>
      </Card>
    </div>
  )

  // Memoize the rendered JSX to prevent recreating components on every render
  const activityFeedJSX = useMemo(() => (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          {selectedTerritory
            ? `Door knocks in ${selectedTerritory.name}`
            : 'All door-knocking activities'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {knocksLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : knocksError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
            {knocksError}
          </div>
        ) : knocks.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500">No activity yet</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedTerritory
                ? 'Drop pins on the map to track door knocks'
                : 'Select a territory to start tracking'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {knocks.map((knock) => (
              <div
                key={knock.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {formatDisposition(knock.disposition)}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(knock.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {knock.address && (
                      <p className="text-sm text-gray-600">{knock.address}</p>
                    )}

                    {knock.notes && (
                      <p className="text-sm text-gray-500 mt-1">{knock.notes}</p>
                    )}

                    {knock.contact_created && knock.contact_id && (
                      <Link
                        href={`/contacts/${knock.contact_id}`}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                      >
                        View Contact →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  ), [knocks, knocksLoading, knocksError, selectedTerritory])

  const mapViewJSX = useMemo(() => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedTerritory ? selectedTerritory.name : 'Territory Map'}
        </h2>

        {selectedTerritory && (
          <Button
            onClick={() => setPinDropEnabled(!pinDropEnabled)}
            variant={pinDropEnabled ? 'default' : 'outline'}
            size="sm"
            className="gap-2"
          >
            <MapPin className="h-4 w-4" />
            {pinDropEnabled ? 'Stop Dropping' : 'Drop Pins'}
          </Button>
        )}
      </div>

      {selectedTerritory && selectedTerritory.boundary_data ? (
        <div className="relative rounded-lg overflow-hidden border border-gray-200">
          <TerritoryMap
            territories={territoriesArray}
            selectedTerritory={selectedTerritory}
            height="500px"
            onMapReady={setMap}
            disableTerritoryInteractions={pinDropEnabled}
          />

          <HousePinDropper
            map={map}
            territoryId={selectedTerritory.id}
            enabled={pinDropEnabled}
            onPinCreated={(pin) => {
              console.log('Pin created:', pin)
              // Refresh knocks list
              fetchKnocks(selectedTerritory.id)
            }}
          />
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-600 font-medium">No territory selected</p>
          <p className="text-sm text-gray-500 mt-1">
            Select a territory from the list to view its map
          </p>
        </div>
      )}
    </div>
  ), [selectedTerritory, territoriesArray, pinDropEnabled, fetchKnocks])

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Territories & Activity</h1>
            <p className="text-gray-600 mt-1">
              Manage territories and track door-knocking activities
            </p>
          </div>

          <div className="flex gap-2">
            <Link href="/knocks/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Log Knock
              </Button>
            </Link>
            <Link href="/territories/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Create Territory
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <StatsCards />

        {/* Desktop: Split View */}
        <div className="hidden md:grid md:grid-cols-3 gap-6">
          {/* Left: Territory List (1/3 width) */}
          <div className="col-span-1">
            <TerritoryList
              autoLoad={true}
              onTerritorySelect={handleTerritorySelect}
              onTerritoryEdit={(territoryId) => {
                router.push(`/territories/${territoryId}/edit`)
              }}
            />
          </div>

          {/* Right: Map + Activity (2/3 width) */}
          <div className="col-span-2 space-y-6">
            {mapViewJSX}
            {activityFeedJSX}
          </div>
        </div>

        {/* Mobile: Tabs */}
        <div className="md:hidden">
          <Tabs value={mobileTab} onValueChange={(v) => setMobileTab(v as 'territories' | 'map' | 'activity')}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="territories" className="gap-2">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">Territories</span>
              </TabsTrigger>
              <TabsTrigger value="map" className="gap-2">
                <MapPin className="h-4 w-4" />
                <span className="hidden sm:inline">Map</span>
              </TabsTrigger>
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="h-4 w-4" />
                <span className="hidden sm:inline">Activity</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="territories" className="mt-6">
              <TerritoryList
                autoLoad={true}
                onTerritorySelect={handleTerritorySelect}
                onTerritoryEdit={(territoryId) => {
                  router.push(`/territories/${territoryId}/edit`)
                }}
              />
            </TabsContent>

            <TabsContent value="map" className="mt-6">
              {mapViewJSX}
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              {activityFeedJSX}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
