'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TerritoryList } from '@/components/territories/TerritoryList'
import { TerritoryMap } from '@/components/territories/TerritoryMapWrapper'
import { HousePinDropper } from '@/components/territories/HousePinDropper'
import { UserLocationMarker } from '@/components/territories/UserLocationMarker'
import { FieldActivityKPIs } from '@/components/territories/FieldActivityKPIs'
import { useUserLocation } from '@/hooks/useUserLocation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, MapPin, Map, BarChart3, MapPinned, Crosshair } from 'lucide-react'

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
 * Unified Field Activity & Territory Management page
 *
 * Features:
 * - Territory list with map visualization
 * - Door knock activity tracking
 * - Split view on desktop: List | Map + Activity
 * - Tabs on mobile: Territories | Map | Activity
 * - Pin dropping on territory maps
 * - Quick knock logging
 */
export default function KnocksPage() {
  const router = useRouter()

  // Territory state
  const [selectedTerritory, setSelectedTerritory] = useState<Territory | null>(null)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [pinDropEnabled, setPinDropEnabled] = useState(false)

  // Knocks state
  const [knocks, setKnocks] = useState<Knock[]>([])
  const [knocksLoading, setKnocksLoading] = useState(false)
  const [knocksError, setKnocksError] = useState<string | null>(null)

  // View state - map is default
  const [activeView, setActiveView] = useState<'map' | 'kpis' | 'territories'>('map')

  // User location tracking - only enabled when map view is active
  const {
    location: userLocation,
    error: locationError,
    errorInstructions: locationErrorInstructions,
    isTracking,
    retry: retryLocation
  } = useUserLocation({
    enabled: activeView === 'map'
  })

  // Track if we've already centered on user location (only do it once per session)
  const hasCenteredOnUserRef = useRef(false)

  // Auto-center map on user's location when it first becomes available
  useEffect(() => {
    if (map && userLocation && !hasCenteredOnUserRef.current && !selectedTerritory) {
      map.setCenter({
        lat: userLocation.latitude,
        lng: userLocation.longitude
      })
      map.setZoom(16) // Street-level zoom for field work
      hasCenteredOnUserRef.current = true
    }
  }, [map, userLocation, selectedTerritory])

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
    // Switch to map view when territory is selected
    setActiveView('map')
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : knocksError ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4">
            {knocksError}
          </div>
        ) : knocks.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No activity yet</p>
            <p className="text-sm text-muted-foreground mt-1">
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
                className="border border rounded-lg p-4 hover:bg-background transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {formatDisposition(knock.disposition)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(knock.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {knock.address && (
                      <p className="text-sm text-muted-foreground">{knock.address}</p>
                    )}

                    {knock.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{knock.notes}</p>
                    )}

                    {knock.contact_created && knock.contact_id && (
                      <Link
                        href={`/contacts/${knock.contact_id}`}
                        className="text-xs text-primary hover:text-primary/90 mt-1 inline-block"
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
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {selectedTerritory ? selectedTerritory.name : 'Pin Drop Map'}
          </h2>
          {!selectedTerritory && (
            <p className="text-sm text-muted-foreground">
              Drop pins anywhere • Select a territory below to focus the view
            </p>
          )}
        </div>

        <Button
          onClick={() => setPinDropEnabled(!pinDropEnabled)}
          variant={pinDropEnabled ? 'default' : 'outline'}
          size="sm"
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {pinDropEnabled ? 'Stop Dropping' : 'Drop Pins'}
        </Button>
      </div>

      <div className="relative rounded-lg overflow-hidden border border-border">
        <TerritoryMap
          territories={territoriesArray}
          selectedTerritory={selectedTerritory}
          height="calc(100vh - 320px)"
          onMapReady={setMap}
          disableTerritoryInteractions={pinDropEnabled}
        />

        <HousePinDropper
          map={map}
          territoryId={selectedTerritory?.id}
          enabled={pinDropEnabled}
          onPinCreated={(pin) => {
            console.log('Pin created:', pin)
            // Refresh knocks list
            fetchKnocks(selectedTerritory?.id)
          }}
        />

        {/* Location status indicator */}
        <div className="absolute top-3 left-3 bg-card rounded-lg shadow-lg px-3 py-2 z-10 border border-border min-w-max">
          {isTracking && userLocation ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              <span className="text-green-600">Live Location</span>
              <button
                onClick={() => {
                  map?.setCenter({ lat: userLocation.latitude, lng: userLocation.longitude })
                  map?.setZoom(16)
                }}
                className="p-1 hover:bg-muted rounded"
                title="Center on my location"
              >
                <Crosshair className="h-4 w-4 text-green-600" />
              </button>
            </div>
          ) : locationError ? (
            <div className="flex flex-col gap-2 text-sm text-orange-600 max-w-[320px]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full" />
                <span className="font-medium">{locationError}</span>
                <button
                  onClick={retryLocation}
                  className="px-2 py-0.5 text-xs bg-orange-100 hover:bg-orange-200 rounded shrink-0"
                  title="Retry location"
                >
                  Retry
                </button>
              </div>
              {locationErrorInstructions && locationErrorInstructions.length > 0 && (
                <div className="text-xs text-orange-800 bg-orange-50 rounded p-2 border border-orange-200">
                  <div className="font-medium mb-1">How to fix this:</div>
                  <ol className="list-decimal list-inside space-y-1">
                    {locationErrorInstructions.map((instruction, index) => (
                      <li key={index}>{instruction}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : isTracking ? (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
              Locating...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-muted-foreground rounded-full" />
              Location unavailable
            </div>
          )}
        </div>

        {/* Orphaned pin indicator */}
        {pinDropEnabled && !selectedTerritory && (
          <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Pins will be unassigned (no territory)
          </div>
        )}
      </div>
    </div>
    // Note: 'map' is intentionally excluded from deps to avoid infinite loop
    // (map updates via onMapReady callback would trigger re-render infinitely)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [selectedTerritory, territoriesArray, pinDropEnabled, fetchKnocks, isTracking, locationError, retryLocation])

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Field Activity</h1>
              <p className="text-muted-foreground mt-1">
                Track door-knocking activities and manage territories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher Dropdown */}
            <Select value={activeView} onValueChange={(v) => setActiveView(v as 'map' | 'kpis' | 'territories')}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="map">
                  <div className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Map
                  </div>
                </SelectItem>
                <SelectItem value="kpis">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    KPIs
                  </div>
                </SelectItem>
                <SelectItem value="territories">
                  <div className="flex items-center gap-2">
                    <MapPinned className="h-4 w-4" />
                    Territories
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Link href="/knocks/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Log Knock</span>
              </Button>
            </Link>
            <Link href="/territories/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Territory</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* View Content */}
        {activeView === 'map' && (
          <div className="space-y-6">
            {/* Map View */}
            {mapViewJSX}

            {/* User location marker - rendered outside useMemo to get fresh map reference */}
            <UserLocationMarker
              map={map}
              latitude={userLocation?.latitude ?? null}
              longitude={userLocation?.longitude ?? null}
              accuracy={userLocation?.accuracy}
              heading={userLocation?.heading}
            />

            {/* Territory Selector - Compact below map */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Select Territory</CardTitle>
                    <CardDescription>Choose a territory to view on the map</CardDescription>
                  </div>
                  {selectedTerritory && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTerritory(null)}
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <TerritoryList
                  autoLoad={true}
                  onTerritorySelect={handleTerritorySelect}
                  onTerritoryEdit={(territoryId) => {
                    router.push(`/knocks/${territoryId}/edit`)
                  }}
                  compact={true}
                  selectedTerritoryId={selectedTerritory?.id}
                />
              </CardContent>
            </Card>

            {/* Recent Activity */}
            {activityFeedJSX}
          </div>
        )}

        {activeView === 'kpis' && (
          <FieldActivityKPIs knockStats={knockStats} />
        )}

        {activeView === 'territories' && (
          <TerritoryList
            autoLoad={true}
            onTerritorySelect={handleTerritorySelect}
            onTerritoryEdit={(territoryId) => {
              router.push(`/knocks/${territoryId}/edit`)
            }}
            onTerritoryDelete={(territoryId) => {
              // Refresh will happen automatically via TerritoryList
              if (selectedTerritory?.id === territoryId) {
                setSelectedTerritory(null)
              }
            }}
          />
        )}
      </div>
    </div>
  )
}