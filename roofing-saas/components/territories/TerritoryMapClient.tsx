'use client'

import { useEffect, useRef, useState, useCallback, memo, useMemo } from 'react'
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api'

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

interface TerritoryMapProps {
  territories?: Territory[]
  selectedTerritory?: Territory | null
  onTerritoryClick?: (territory: Territory) => void
  onMapReady?: (map: google.maps.Map) => void
  center?: [number, number] // [lat, lon]
  zoom?: number
  height?: string
  className?: string
  disableTerritoryInteractions?: boolean // Disable clicking/hovering on territories
}

const GOOGLE_MAPS_LIBRARIES: ("drawing" | "geometry" | "places" | "visualization")[] = ['drawing', 'geometry']

function TerritoryMapClient({
  territories = [],
  selectedTerritory,
  onTerritoryClick,
  onMapReady,
  center = [36.5484, -82.5618], // Default to Kingsport, TN
  zoom = 13,
  height = '500px',
  className = '',
  disableTerritoryInteractions = false,
}: TerritoryMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const hasLoadedRef = useRef(false)
  const hasFitBoundsRef = useRef(false) // Track if we've already fit bounds
  const polygonsRef = useRef<google.maps.Polygon[]>([])
  const activeMapTypeRef = useRef<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('hybrid')

  // Load Google Maps
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  // Map load callback
  const onLoad = useCallback((map: google.maps.Map) => {
    console.log('[TerritoryMapClient] Google Maps loaded successfully')

    // Explicitly set map type to hybrid on load (fixes initial map type issue)
    map.setMapTypeId('hybrid')

    setMap(map)
    hasLoadedRef.current = true
    onMapReady?.(map)
  }, [onMapReady])

  // Map unmount callback
  const onUnmount = useCallback(() => {
    console.log('[TerritoryMapClient] Google Maps unmounting')
    // Clean up polygons
    polygonsRef.current.forEach(polygon => polygon.setMap(null))
    polygonsRef.current = []
    setMap(null)
  }, [])

  // Render territory boundaries
  useEffect(() => {
    if (!map || disableTerritoryInteractions) return

    // Clear existing polygons
    polygonsRef.current.forEach(polygon => polygon.setMap(null))
    polygonsRef.current = []

    // Add new polygons
    territories.forEach(territory => {
      if (!territory.boundary_data) return

      try {
        // Convert GeoJSON coordinates to Google Maps LatLng format
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
            map: map,
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

    // Fit bounds to show all territories (ONLY on initial load)
    if (!hasFitBoundsRef.current && territories.length > 0 && territories.some(t => t.boundary_data)) {
      try {
        const bounds = new google.maps.LatLngBounds()
        polygonsRef.current.forEach(polygon => {
          polygon.getPath().forEach(latLng => {
            bounds.extend(latLng)
          })
        })
        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
          hasFitBoundsRef.current = true // Mark as done, never fit bounds again
        }
      } catch (error) {
        console.error('Error fitting bounds:', error)
      }
    }
    // Note: 'map' is intentionally excluded from deps to avoid infinite loop
    // (map state changes would trigger re-render which updates map state again infinitely)
    // The effect correctly runs when territories/selectedTerritory changes, which is what we want
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [territories, selectedTerritory, onTerritoryClick, disableTerritoryInteractions])

  // Convert GeoJSON coordinates to Google Maps format
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

  // Memoize map container style to prevent new object on every render
  // IMPORTANT: These hooks must be called BEFORE any conditional returns (Rules of Hooks)
  const mapContainerStyle = useMemo(() => ({ height, width: '100%' }), [height])

  // Memoize options to prevent new object on every render
  // NOTE: Do NOT set mapTypeId here - it will be set imperatively in onLoad
  const mapOptions = useMemo(() => ({
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: false,
    fullscreenControl: true,
  }), [])

  // Initial center/zoom - only used on first render
  const initialCenter = useMemo(() => ({ lat: center[0], lng: center[1] }), [center])
  const initialZoom = useMemo(() => zoom, [zoom])

  // Change map type (no state update to avoid re-render)
  const switchMapType = (event: React.MouseEvent, type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    // Stop event propagation to prevent parent re-renders
    event.stopPropagation()
    event.preventDefault()

    if (!map) return

    console.log('[TerritoryMapClient] Switching map type to:', type)

    // Set map type imperatively
    map.setMapTypeId(type)
    activeMapTypeRef.current = type

    // Manually update button styles without causing re-render
    const buttons = document.querySelectorAll('[data-map-type-button]')
    buttons.forEach(button => {
      const buttonType = button.getAttribute('data-map-type')
      if (buttonType === type) {
        button.classList.remove('bg-white', 'text-muted-foreground', 'hover:bg-gray-100')
        button.classList.add('bg-blue-600', 'text-white')
      } else {
        button.classList.remove('bg-blue-600', 'text-white')
        button.classList.add('bg-white', 'text-muted-foreground', 'hover:bg-gray-100')
      }
    })
  }

  if (loadError) {
    return (
      <div className={`relative ${className}`} style={{ height }}>
        <div className="flex items-center justify-center h-full bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-800">Error loading Google Maps</p>
        </div>
      </div>
    )
  }

  if (!isLoaded) {
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
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={hasLoadedRef.current ? undefined : initialCenter}
        zoom={hasLoadedRef.current ? undefined : initialZoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
      />

      {/* Map Type Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-10 flex gap-1">
        <button
          onClick={(e) => switchMapType(e, 'roadmap')}
          data-map-type-button
          data-map-type="roadmap"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            activeMapTypeRef.current === 'roadmap'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-muted-foreground hover:bg-gray-100'
          }`}
          title="Road Map"
        >
          Map
        </button>
        <button
          onClick={(e) => switchMapType(e, 'satellite')}
          data-map-type-button
          data-map-type="satellite"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            activeMapTypeRef.current === 'satellite'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-muted-foreground hover:bg-gray-100'
          }`}
          title="Satellite View"
        >
          Satellite
        </button>
        <button
          onClick={(e) => switchMapType(e, 'hybrid')}
          data-map-type-button
          data-map-type="hybrid"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            activeMapTypeRef.current === 'hybrid'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-muted-foreground hover:bg-gray-100'
          }`}
          title="Hybrid View"
        >
          Hybrid
        </button>
        <button
          onClick={(e) => switchMapType(e, 'terrain')}
          data-map-type-button
          data-map-type="terrain"
          className={`px-3 py-2 text-xs font-medium rounded transition-colors ${
            activeMapTypeRef.current === 'terrain'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-muted-foreground hover:bg-gray-100'
          }`}
          title="Terrain Map"
        >
          Terrain
        </button>
      </div>

      {/* Legend */}
      {territories.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10 text-xs">
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

// Custom comparison function for memo to handle array props
const arePropsEqual = (prevProps: TerritoryMapProps, nextProps: TerritoryMapProps) => {
  // Compare territories array by content, not reference
  if (prevProps.territories?.length !== nextProps.territories?.length) {
    return false
  }

  // Check if territory IDs are the same
  const prevIds = prevProps.territories?.map(t => t.id).sort().join(',')
  const nextIds = nextProps.territories?.map(t => t.id).sort().join(',')
  if (prevIds !== nextIds) {
    return false
  }

  // Compare selectedTerritory
  if (prevProps.selectedTerritory?.id !== nextProps.selectedTerritory?.id) {
    return false
  }

  // Compare other props
  if (
    prevProps.height !== nextProps.height ||
    prevProps.zoom !== nextProps.zoom ||
    prevProps.className !== nextProps.className ||
    prevProps.disableTerritoryInteractions !== nextProps.disableTerritoryInteractions
  ) {
    return false
  }

  // Compare center array
  if (prevProps.center?.[0] !== nextProps.center?.[0] || prevProps.center?.[1] !== nextProps.center?.[1]) {
    return false
  }

  // If all comparisons pass, props are equal
  return true
}

// Wrap with memo to prevent unnecessary re-renders when parent state changes
export default memo(TerritoryMapClient, arePropsEqual)
