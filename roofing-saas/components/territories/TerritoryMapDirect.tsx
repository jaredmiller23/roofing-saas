'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface TerritoryBoundary {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] | number[][][][]
}

interface Territory {
  id: string
  name: string
  description?: string
  boundary_data?: TerritoryBoundary
  assigned_to?: string
}

interface TerritoryMapDirectProps {
  territories?: Territory[]
  selectedTerritory?: Territory | null
  onTerritoryClick?: (territory: Territory) => void
  onMapReady?: (map: google.maps.Map) => void
  center?: [number, number] // [lat, lon]
  zoom?: number
  height?: string
  className?: string
  disableTerritoryInteractions?: boolean
}

/**
 * Direct Google Maps implementation - no wrapper library
 * Complete imperative control to prevent recentering issues
 */
export default function TerritoryMapDirect({
  territories = [],
  selectedTerritory,
  onTerritoryClick,
  onMapReady,
  center = [36.5484, -82.5618], // Default to Kingsport, TN
  zoom = 13,
  height = '500px',
  className = '',
  disableTerritoryInteractions = false,
}: TerritoryMapDirectProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<google.maps.Map | null>(null)
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  const currentMapTypeRef = useRef<string>('hybrid')
  const [currentMapType, setCurrentMapType] = useState<string>('hybrid')
  const isInitializedRef = useRef(false)
  const hasFitBoundsRef = useRef(false)

  // Capture initial values to use in effect (map should only initialize once)
  const initialCenterRef = useRef(center)
  const initialZoomRef = useRef(zoom)
  const onMapReadyRef = useRef(onMapReady)

  // Keep onMapReady callback up to date
  useEffect(() => {
    onMapReadyRef.current = onMapReady
  }, [onMapReady])

  // Initialize map ONCE - never touch it again except through imperative API
  useEffect(() => {
    if (!mapContainerRef.current || isInitializedRef.current) return
    if (typeof google === 'undefined') {
      console.error('[TerritoryMapDirect] Google Maps not loaded')
      return
    }

    console.log('[TerritoryMapDirect] Initializing Google Maps')

    const initialCenter = initialCenterRef.current
    const initialZoom = initialZoomRef.current

    // Create map with hybrid view
    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: initialCenter[0], lng: initialCenter[1] },
      zoom: initialZoom,
      mapTypeId: 'hybrid',
      zoomControl: true,
      streetViewControl: true,
      mapTypeControl: false,
      fullscreenControl: true,
    })

    mapRef.current = map
    isInitializedRef.current = true
    onMapReadyRef.current?.(map)

    // Cleanup on unmount
    return () => {
      console.log('[TerritoryMapDirect] Cleaning up')
      polygonsRef.current.forEach(polygon => polygon.setMap(null))
      polygonsRef.current = []
    }
  }, []) // Empty deps intentional - map initializes once with initial values

  // Render territories (update polygons when territories change)
  useEffect(() => {
    if (!mapRef.current || !isInitializedRef.current) return

    console.log('[TerritoryMapDirect] Updating territories:', territories.length)

    // Clear existing polygons
    polygonsRef.current.forEach(polygon => polygon.setMap(null))
    polygonsRef.current = []

    if (disableTerritoryInteractions) return

    // Add new polygons
    territories.forEach(territory => {
      if (!territory.boundary_data) return

      try {
        const paths = convertGeoJSONToGoogleMaps(territory.boundary_data)
        const isSelected = selectedTerritory?.id === territory.id

        paths.forEach((path) => {
          const polygon = new google.maps.Polygon({
            paths: path,
            strokeColor: isSelected ? '#2563eb' : '#3b82f6',
            strokeOpacity: 1,
            strokeWeight: isSelected ? 3 : 2,
            fillColor: isSelected ? '#2563eb' : '#3b82f6',
            fillOpacity: isSelected ? 0.3 : 0.15,
            clickable: true,
            map: mapRef.current,
          })

          // Add click handler
          polygon.addListener('click', () => {
            onTerritoryClick?.(territory)
          })

          // Add hover effect
          polygon.addListener('mouseover', () => {
            polygon.setOptions({
              fillOpacity: 0.4,
              strokeWeight: 3,
            })
          })

          polygon.addListener('mouseout', () => {
            polygon.setOptions({
              fillOpacity: isSelected ? 0.3 : 0.15,
              strokeWeight: isSelected ? 3 : 2,
            })
          })

          polygonsRef.current.push(polygon)
        })
      } catch (error) {
        console.error(`Error rendering territory ${territory.id}:`, error)
      }
    })

    // Fit bounds to show all territories (ONLY on first territory load)
    if (!hasFitBoundsRef.current && territories.length > 0 && territories.some(t => t.boundary_data)) {
      try {
        const bounds = new google.maps.LatLngBounds()
        polygonsRef.current.forEach(polygon => {
          polygon.getPath().forEach(latLng => {
            bounds.extend(latLng)
          })
        })
        if (!bounds.isEmpty()) {
          mapRef.current!.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
          hasFitBoundsRef.current = true
        }
      } catch (error) {
        console.error('Error fitting bounds:', error)
      }
    }
  }, [territories, selectedTerritory, onTerritoryClick, disableTerritoryInteractions])

  // Convert GeoJSON to Google Maps format
  const convertGeoJSONToGoogleMaps = (boundary: TerritoryBoundary): google.maps.LatLng[][] => {
    const paths: google.maps.LatLng[][] = []

    if (boundary.type === 'Polygon') {
      const coords = boundary.coordinates as number[][][]
      coords.forEach(ring => {
        const path = ring.map(coord => new google.maps.LatLng(coord[1], coord[0]))
        paths.push(path)
      })
    } else if (boundary.type === 'MultiPolygon') {
      const coords = boundary.coordinates as number[][][][]
      coords.forEach(polygon => {
        polygon.forEach(ring => {
          const path = ring.map(coord => new google.maps.LatLng(coord[1], coord[0]))
          paths.push(path)
        })
      })
    }

    return paths
  }

  // Switch map type imperatively
  const switchMapType = (type: string) => {
    if (!mapRef.current) return

    console.log('[TerritoryMapDirect] Switching to:', type)
    mapRef.current.setMapTypeId(type)
    currentMapTypeRef.current = type
    setCurrentMapType(type) // Update state to trigger re-render for button variants
  }

  if (typeof google === 'undefined') {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-muted rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div
        ref={mapContainerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg overflow-hidden"
      />

      {/* Map Type Controls */}
      <div className="absolute top-4 right-4 bg-card rounded-lg shadow-lg p-2 z-10 flex gap-1">
        <Button
          onClick={() => switchMapType('roadmap')}
          data-map-type-button
          data-map-type="roadmap"
          variant={currentMapType === 'roadmap' ? 'default' : 'outline'}
          size="sm"
          className="text-xs font-medium"
          title="Road Map"
        >
          Map
        </Button>
        <Button
          onClick={() => switchMapType('satellite')}
          data-map-type-button
          data-map-type="satellite"
          variant={currentMapType === 'satellite' ? 'default' : 'outline'}
          size="sm"
          className="text-xs font-medium"
          title="Satellite View"
        >
          Satellite
        </Button>
        <Button
          onClick={() => switchMapType('hybrid')}
          data-map-type-button
          data-map-type="hybrid"
          variant={currentMapType === 'hybrid' ? 'default' : 'outline'}
          size="sm"
          className="text-xs font-medium"
          title="Hybrid View"
        >
          Hybrid
        </Button>
        <Button
          onClick={() => switchMapType('terrain')}
          data-map-type-button
          data-map-type="terrain"
          variant={currentMapType === 'terrain' ? 'default' : 'outline'}
          size="sm"
          className="text-xs font-medium"
          title="Terrain Map"
        >
          Terrain
        </Button>
      </div>

      {/* Legend */}
      {territories.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-card rounded-lg shadow-lg p-3 z-10 text-xs">
          <h4 className="font-semibold text-foreground mb-2">Territories</h4>
          <div className="space-y-1">
            {territories.slice(0, 5).map(territory => (
              <div
                key={territory.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-accent p-1 rounded"
                onClick={() => onTerritoryClick?.(territory)}
              >
                <div
                  className="w-4 h-4 rounded border-2"
                  style={{
                    borderColor: selectedTerritory?.id === territory.id ? '#2563eb' : '#3b82f6',
                    backgroundColor:
                      selectedTerritory?.id === territory.id
                        ? 'rgba(37, 99, 235, 0.3)'
                        : 'rgba(59, 130, 246, 0.15)',
                  }}
                />
                <span className="text-muted-foreground">{territory.name}</span>
              </div>
            ))}
            {territories.length > 5 && (
              <div className="text-muted-foreground text-xs mt-1">
                +{territories.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
