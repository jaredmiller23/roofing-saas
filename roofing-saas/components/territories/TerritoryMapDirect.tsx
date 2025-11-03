'use client'

import { useEffect, useRef } from 'react'

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
  const isInitializedRef = useRef(false)

  // Initialize map ONCE - never touch it again except through imperative API
  useEffect(() => {
    if (!mapContainerRef.current || isInitializedRef.current) return
    if (typeof google === 'undefined') {
      console.error('[TerritoryMapDirect] Google Maps not loaded')
      return
    }

    console.log('[TerritoryMapDirect] Initializing Google Maps')

    // Create map with hybrid view
    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: center[0], lng: center[1] },
      zoom: zoom,
      mapTypeId: 'hybrid',
      zoomControl: true,
      streetViewControl: true,
      mapTypeControl: false,
      fullscreenControl: true,
    })

    mapRef.current = map
    isInitializedRef.current = true
    onMapReady?.(map)

    // Cleanup on unmount
    return () => {
      console.log('[TerritoryMapDirect] Cleaning up')
      polygonsRef.current.forEach(polygon => polygon.setMap(null))
      polygonsRef.current = []
    }
  }, []) // Empty deps - run once only

  // Render territories (update polygons when territories change)
  useEffect(() => {
    if (!mapRef.current || !isInitializedRef.current) return

    console.log('[TerritoryMapDirect] Updating territories:', territories.length)

    // Clear existing polygons
    polygonsRef.current.forEach(polygon => polygon.setMap(null))
    polygonsRef.current = []

    if (disableTerritoryInteractions) return

    let hasFitBounds = false

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
    if (!hasFitBounds && territories.length > 0 && territories.some(t => t.boundary_data)) {
      try {
        const bounds = new google.maps.LatLngBounds()
        polygonsRef.current.forEach(polygon => {
          polygon.getPath().forEach(latLng => {
            bounds.extend(latLng)
          })
        })
        if (!bounds.isEmpty()) {
          mapRef.current!.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
          hasFitBounds = true
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

  // Switch map type imperatively - NO STATE UPDATES
  const switchMapType = (type: string) => {
    if (!mapRef.current) return

    console.log('[TerritoryMapDirect] Switching to:', type)
    mapRef.current.setMapTypeId(type)
    currentMapTypeRef.current = type

    // Update button styles manually
    const buttons = document.querySelectorAll('[data-map-type-button]')
    buttons.forEach(button => {
      const buttonType = button.getAttribute('data-map-type')
      if (buttonType === type) {
        button.classList.remove('bg-white', 'text-gray-700', 'hover:bg-gray-100')
        button.classList.add('bg-blue-600', 'text-white')
      } else {
        button.classList.remove('bg-blue-600', 'text-white')
        button.classList.add('bg-white', 'text-gray-700', 'hover:bg-gray-100')
      }
    })
  }

  if (typeof google === 'undefined') {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-10 flex gap-1">
        <button
          onClick={() => switchMapType('roadmap')}
          data-map-type-button
          data-map-type="roadmap"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            currentMapTypeRef.current === 'roadmap'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Road Map"
        >
          Map
        </button>
        <button
          onClick={() => switchMapType('satellite')}
          data-map-type-button
          data-map-type="satellite"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            currentMapTypeRef.current === 'satellite'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Satellite View"
        >
          Satellite
        </button>
        <button
          onClick={() => switchMapType('hybrid')}
          data-map-type-button
          data-map-type="hybrid"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            currentMapTypeRef.current === 'hybrid'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Hybrid View"
        >
          Hybrid
        </button>
        <button
          onClick={() => switchMapType('terrain')}
          data-map-type-button
          data-map-type="terrain"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            currentMapTypeRef.current === 'terrain'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
          title="Terrain Map"
        >
          Terrain
        </button>
      </div>

      {/* Legend */}
      {territories.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10 text-xs">
          <h4 className="font-semibold text-gray-900 mb-2">Territories</h4>
          <div className="space-y-1">
            {territories.slice(0, 5).map(territory => (
              <div
                key={territory.id}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
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
                <span className="text-gray-700">{territory.name}</span>
              </div>
            ))}
            {territories.length > 5 && (
              <div className="text-gray-500 text-xs mt-1">
                +{territories.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
