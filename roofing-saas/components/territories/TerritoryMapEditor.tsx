'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import { GoogleMap, DrawingManager, useJsApiLoader } from '@react-google-maps/api'
import type { TerritoryBoundary } from '@/lib/geo/territory'

const GOOGLE_MAPS_LIBRARIES: ('drawing' | 'geometry')[] = ['drawing', 'geometry']

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '100%',
  borderRadius: '0.5rem',
}

const MAP_OPTIONS = {
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: false,
  mapTypeId: 'roadmap' as google.maps.MapTypeId,
  zoomControl: true,
}

interface TerritoryMapEditorProps {
  initialBoundary?: TerritoryBoundary | null
  onBoundaryChange?: (boundary: TerritoryBoundary | null) => void
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
}

export function TerritoryMapEditor({
  initialBoundary,
  onBoundaryChange,
  center = [36.5484, -82.5618], // Kingsport, TN
  zoom = 13,
  height = '500px',
  className = '',
}: TerritoryMapEditorProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-territory',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [currentOverlay, setCurrentOverlay] = useState<google.maps.Polygon | google.maps.Rectangle | null>(null)
  const [currentBoundary, setCurrentBoundary] = useState<TerritoryBoundary | null>(initialBoundary || null)
  const overlayRef = useRef<google.maps.Polygon | google.maps.Rectangle | null>(null)

  // Map callbacks
  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  // Load initial boundary
  useEffect(() => {
    if (!map || !initialBoundary || !isLoaded) return

    try {
      // Clear existing overlay
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }

      // Create polygon from initial boundary
      if (initialBoundary.type === 'Polygon') {
        const coordinates = initialBoundary.coordinates[0]
        const path = coordinates.map(([lng, lat]) => ({ lat, lng }))

        const polygon = new google.maps.Polygon({
          paths: path,
          fillColor: '#3b82f6',
          fillOpacity: 0.2,
          strokeColor: '#3b82f6',
          strokeWeight: 2,
          editable: true,
          draggable: true,
        })

        polygon.setMap(map)
        overlayRef.current = polygon
        setCurrentOverlay(polygon)

        // Fit bounds to polygon
        const bounds = new google.maps.LatLngBounds()
        path.forEach(point => bounds.extend(point))
        map.fitBounds(bounds)
      }
    } catch (error) {
      console.error('Error loading initial boundary:', error)
    }
  }, [map, initialBoundary, isLoaded])

  // Drawing callback
  const onOverlayComplete = useCallback(
    (event: google.maps.drawing.OverlayCompleteEvent) => {
      // Clear previous overlay
      if (overlayRef.current) {
        overlayRef.current.setMap(null)
      }

      const overlay = event.overlay
      overlayRef.current = overlay as google.maps.Polygon | google.maps.Rectangle
      setCurrentOverlay(overlay as google.maps.Polygon | google.maps.Rectangle)

      // Extract coordinates
      let coordinates: number[][][] = []

      if (event.type === google.maps.drawing.OverlayType.POLYGON) {
        const polygon = overlay as google.maps.Polygon
        const path = polygon.getPath()
        const coords: number[][] = []
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i)
          coords.push([point.lng(), point.lat()])
        }
        // Close the polygon by adding first point at the end
        coords.push(coords[0])
        coordinates = [coords]
      } else if (event.type === google.maps.drawing.OverlayType.RECTANGLE) {
        const rectangle = overlay as google.maps.Rectangle
        const bounds = rectangle.getBounds()
        if (bounds) {
          const ne = bounds.getNorthEast()
          const sw = bounds.getSouthWest()
          coordinates = [[
            [sw.lng(), ne.lat()], // NW
            [ne.lng(), ne.lat()], // NE
            [ne.lng(), sw.lat()], // SE
            [sw.lng(), sw.lat()], // SW
            [sw.lng(), ne.lat()], // Close polygon
          ]]
        }
      }

      const boundary: TerritoryBoundary = {
        type: 'Polygon',
        coordinates,
      }

      setCurrentBoundary(boundary)
      onBoundaryChange?.(boundary)
    },
    [onBoundaryChange]
  )

  // Clear boundary
  const handleClear = () => {
    if (overlayRef.current) {
      overlayRef.current.setMap(null)
      overlayRef.current = null
    }
    setCurrentOverlay(null)
    setCurrentBoundary(null)
    onBoundaryChange?.(null)
  }

  // Get boundary point count
  const getBoundaryPointCount = (): number => {
    if (!currentBoundary) return 0
    return currentBoundary.coordinates[0]?.length || 0
  }

  // Drawing manager options
  const getDrawingManagerOptions = useCallback((): google.maps.drawing.DrawingManagerOptions => ({
    drawingMode: null,
    drawingControl: true,
    drawingControlOptions: {
      position: google.maps.ControlPosition.TOP_CENTER,
      drawingModes: [
        google.maps.drawing.OverlayType.POLYGON,
        google.maps.drawing.OverlayType.RECTANGLE,
      ],
    },
    polygonOptions: {
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      strokeColor: '#3b82f6',
      strokeWeight: 2,
      editable: true,
      draggable: true,
    },
    rectangleOptions: {
      fillColor: '#3b82f6',
      fillOpacity: 0.2,
      strokeColor: '#3b82f6',
      strokeWeight: 2,
      editable: true,
      draggable: true,
    },
  }), [])

  if (loadError) {
    return (
      <div className="flex items-center justify-center bg-red-50 rounded-lg p-4" style={{ height }}>
        <p className="text-red-600">Error loading map: {loadError.message}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center bg-gray-100 rounded-lg" style={{ height }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading map editor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} style={{ height }}>
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={{ lat: center[0], lng: center[1] }}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={MAP_OPTIONS}
      >
        {isLoaded && !currentOverlay && (
          <DrawingManager
            options={getDrawingManagerOptions()}
            onOverlayComplete={onOverlayComplete}
          />
        )}
      </GoogleMap>

      {/* Instructions overlay */}
      {isLoaded && !currentBoundary && (
        <div className="absolute top-4 left-4 bg-card rounded-lg shadow-lg p-3 z-[1000] max-w-xs">
          <h4 className="font-semibold text-sm text-foreground mb-2">Draw Territory Boundary</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Use the rectangle or polygon tool (top center)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Click on the map to create boundary points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Double-click to finish drawing</span>
            </li>
          </ul>
        </div>
      )}

      {/* Boundary info */}
      {isLoaded && currentBoundary && (
        <div className="absolute bottom-4 left-4 bg-card rounded-lg shadow-lg p-3 z-[1000]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-foreground">
                {currentBoundary.type} drawn
              </p>
              <p className="text-xs text-muted-foreground">{getBoundaryPointCount()} points</p>
            </div>
            <button
              onClick={handleClear}
              className="px-3 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
