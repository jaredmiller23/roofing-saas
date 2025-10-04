'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import type { TerritoryBoundary } from '@/lib/geo/territory'

// Fix for default marker icons in Next.js
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null)
  const drawControlRef = useRef<L.Control.Draw | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [currentBoundary, setCurrentBoundary] = useState<TerritoryBoundary | null>(
    initialBoundary || null
  )

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    // Create map instance
    const map = L.map(mapContainerRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true,
    })

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    // Initialize feature group for drawn items
    const drawnItems = new L.FeatureGroup()
    map.addLayer(drawnItems)
    drawnItemsRef.current = drawnItems

    // Initialize draw control
    const drawControl = new L.Control.Draw({
      position: 'topright',
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2,
          },
        },
        rectangle: {
          shapeOptions: {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2,
          },
        },
        circle: false,
        circlemarker: false,
        marker: false,
        polyline: false,
      },
      edit: {
        featureGroup: drawnItems,
        remove: true,
      },
    })
    map.addControl(drawControl)
    drawControlRef.current = drawControl

    // Handle draw created
    map.on(L.Draw.Event.CREATED, (event: unknown) => {
      const e = event as L.DrawEvents.Created
      const layer = e.layer

      // Clear existing layers
      drawnItems.clearLayers()

      // Add new layer
      drawnItems.addLayer(layer)

      // Convert to GeoJSON and update state
      const geoJson = layer.toGeoJSON()
      const boundary = convertToTerritoryBoundary(geoJson)
      setCurrentBoundary(boundary)
      onBoundaryChange?.(boundary)
    })

    // Handle draw edited
    map.on(L.Draw.Event.EDITED, (event: L.DrawEvents.Edited) => {
      const layers = event.layers
      let boundary: TerritoryBoundary | null = null

      layers.eachLayer((layer: L.Layer) => {
        const geoJson = (layer as L.Polygon | L.Rectangle).toGeoJSON()
        boundary = convertToTerritoryBoundary(geoJson)
      })

      setCurrentBoundary(boundary)
      onBoundaryChange?.(boundary)
    })

    // Handle draw deleted
    map.on(L.Draw.Event.DELETED, () => {
      setCurrentBoundary(null)
      onBoundaryChange?.(null)
    })

    mapRef.current = map
    setMapReady(true)

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Load initial boundary
  useEffect(() => {
    if (!mapReady || !mapRef.current || !drawnItemsRef.current) return
    if (!initialBoundary) return

    try {
      // Clear existing layers
      drawnItemsRef.current.clearLayers()

      // Convert boundary to GeoJSON feature
      const geoJsonFeature = {
        type: 'Feature',
        properties: {},
        geometry: initialBoundary,
      }

      // Create layer from GeoJSON
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const layer = L.geoJSON(geoJsonFeature as any, {
        style: {
          color: '#3b82f6',
          weight: 2,
          fillOpacity: 0.2,
        },
      })

      // Add to drawn items
      layer.eachLayer((l: L.Layer) => {
        drawnItemsRef.current?.addLayer(l)
      })

      // Fit bounds to show the boundary
      const bounds = layer.getBounds()
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] })
      }

      setCurrentBoundary(initialBoundary)
    } catch (error) {
      console.error('Error loading initial boundary:', error)
    }
  }, [mapReady, initialBoundary])

  // Convert Leaflet GeoJSON to our TerritoryBoundary format
  const convertToTerritoryBoundary = (geoJson: GeoJSON.Feature): TerritoryBoundary => {
    const geometry = geoJson.geometry

    if (geometry.type === 'Polygon') {
      return {
        type: 'Polygon',
        coordinates: geometry.coordinates as number[][][],
      }
    } else if (geometry.type === 'MultiPolygon') {
      return {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates as number[][][][],
      }
    }

    // Fallback: treat as Polygon with empty coordinates
    return {
      type: 'Polygon',
      coordinates: ((geometry as Record<string, unknown>).coordinates || []) as number[][][],
    }
  }

  // Clear boundary
  const handleClear = () => {
    if (drawnItemsRef.current) {
      drawnItemsRef.current.clearLayers()
    }
    setCurrentBoundary(null)
    onBoundaryChange?.(null)
  }

  // Get boundary point count
  const getBoundaryPointCount = (): number => {
    if (!currentBoundary) return 0

    if (currentBoundary.type === 'Polygon') {
      return currentBoundary.coordinates[0]?.length || 0
    } else {
      return currentBoundary.coordinates[0]?.[0]?.length || 0
    }
  }

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="rounded-lg overflow-hidden border border-gray-300 z-0"
      />

      {/* Instructions overlay */}
      {mapReady && !currentBoundary && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000] max-w-xs">
          <h4 className="font-semibold text-sm text-gray-900 mb-2">Draw Territory Boundary</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Use the rectangle or polygon tool (top right)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Click on the map to create boundary points</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-semibold">•</span>
              <span>Double-click or close the shape to finish</span>
            </li>
          </ul>
        </div>
      )}

      {/* Boundary info */}
      {mapReady && currentBoundary && (
        <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-900">
                {currentBoundary.type} drawn
              </p>
              <p className="text-xs text-gray-600">{getBoundaryPointCount()} points</p>
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

      {/* Loading indicator */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">Loading map editor...</p>
          </div>
        </div>
      )}
    </div>
  )
}
