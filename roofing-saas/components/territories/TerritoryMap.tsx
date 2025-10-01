'use client'

import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default marker icons in Next.js
// Leaflet's default marker icons don't work out of the box with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

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
  center?: [number, number] // [lat, lon]
  zoom?: number
  height?: string
  className?: string
}

export function TerritoryMap({
  territories = [],
  selectedTerritory,
  onTerritoryClick,
  center = [36.5484, -82.5618], // Default to Kingsport, TN
  zoom = 13,
  height = '500px',
  className = '',
}: TerritoryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const territoryLayersRef = useRef<Map<string, L.GeoJSON>>(new Map())
  const [mapReady, setMapReady] = useState(false)

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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map
    setMapReady(true)

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, []) // Only run once on mount

  // Update map center when prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView(center, zoom)
    }
  }, [center, zoom])

  // Render territories on map
  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    const map = mapRef.current

    // Remove existing territory layers
    territoryLayersRef.current.forEach(layer => {
      map.removeLayer(layer)
    })
    territoryLayersRef.current.clear()

    // Add territory boundaries
    territories.forEach(territory => {
      if (!territory.boundary_data) return

      try {
        // Convert our GeoJSON format to Leaflet-compatible format
        const geoJsonData = {
          type: 'Feature',
          properties: {
            id: territory.id,
            name: territory.name,
            description: territory.description,
          },
          geometry: territory.boundary_data,
        }

        // Determine if this territory is selected
        const isSelected = selectedTerritory?.id === territory.id

        // Create GeoJSON layer
        const layer = L.geoJSON(geoJsonData as any, {
          style: {
            color: isSelected ? '#2563eb' : '#3b82f6',
            weight: isSelected ? 3 : 2,
            opacity: 1,
            fillOpacity: isSelected ? 0.3 : 0.15,
          },
          onEachFeature: (feature, layer) => {
            // Add click handler
            layer.on('click', () => {
              onTerritoryClick?.(territory)
            })

            // Add popup with territory info
            const popupContent = `
              <div class="p-2">
                <h3 class="font-semibold text-sm">${territory.name}</h3>
                ${territory.description ? `<p class="text-xs text-gray-600 mt-1">${territory.description}</p>` : ''}
              </div>
            `
            layer.bindPopup(popupContent)

            // Add hover effect
            layer.on('mouseover', () => {
              layer.setStyle({
                fillOpacity: 0.4,
                weight: 3,
              })
            })

            layer.on('mouseout', () => {
              layer.setStyle({
                fillOpacity: isSelected ? 0.3 : 0.15,
                weight: isSelected ? 3 : 2,
              })
            })
          },
        }).addTo(map)

        territoryLayersRef.current.set(territory.id, layer)
      } catch (error) {
        console.error(`Error rendering territory ${territory.id}:`, error)
      }
    })

    // Fit map to show all territories if any exist
    if (territories.length > 0 && territories.some(t => t.boundary_data)) {
      try {
        const bounds = L.latLngBounds([])
        territoryLayersRef.current.forEach(layer => {
          bounds.extend(layer.getBounds())
        })
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50] })
        }
      } catch (error) {
        console.error('Error fitting bounds:', error)
      }
    }
  }, [territories, selectedTerritory, mapReady, onTerritoryClick])

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapContainerRef}
        style={{ height }}
        className="rounded-lg overflow-hidden border border-gray-300 z-0"
      />

      {/* Legend */}
      {territories.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000] text-xs">
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

      {/* Loading indicator */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}
    </div>
  )
}
