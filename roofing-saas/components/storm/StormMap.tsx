/* eslint-disable */
/**
 * Storm Map Component
 *
 * Interactive map showing storm events and affected customers
 */

'use client'

import { useCallback, useState } from 'react'
import { GoogleMap, Marker, Circle, InfoWindow, useJsApiLoader } from '@react-google-maps/api'
import type { StormEvent, AffectedCustomer } from '@/lib/storm/storm-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CloudLightning, Home } from 'lucide-react'

const GOOGLE_MAPS_LIBRARIES: ('drawing' | 'geometry' | 'places')[] = ['drawing', 'geometry']

const MAP_CONTAINER_STYLE = {
  width: '100%',
  height: '600px',
  borderRadius: '0.5rem',
}

const MAP_OPTIONS = {
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  mapTypeId: 'roadmap' as google.maps.MapTypeId,
}

interface StormMapProps {
  stormEvents: StormEvent[]
  affectedCustomers?: AffectedCustomer[]
  center?: { lat: number; lng: number }
  zoom?: number
}

export function StormMap({
  stormEvents,
  affectedCustomers = [],
  center,
  zoom = 10,
}: StormMapProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: GOOGLE_MAPS_LIBRARIES,
  })

  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [selectedStorm, setSelectedStorm] = useState<StormEvent | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<AffectedCustomer | null>(null)

  const defaultCenter = center || {
    lat: stormEvents[0]?.latitude || 36.5484,
    lng: stormEvents[0]?.longitude || -82.5618,
  }

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance)
  }, [])

  const onUnmount = useCallback(() => {
    setMap(null)
  }, [])

  if (loadError) {
    return (
      <Card className="p-6">
        <p className="text-destructive">Failed to load map. Please check your API key.</p>
      </Card>
    )
  }

  if (!isLoaded) {
    return (
      <Card className="flex items-center justify-center h-[600px]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </Card>
    )
  }

  return (
    <Card className="p-0 overflow-hidden">
      <GoogleMap
        mapContainerStyle={MAP_CONTAINER_STYLE}
        center={defaultCenter}
        zoom={zoom}
        options={MAP_OPTIONS}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {/* Storm Event Markers */}
        {stormEvents.map((storm) => {
          if (!storm.latitude || !storm.longitude) return null

          return (
            <div key={storm.id}>
              {/* Storm Center Marker */}
              <Marker
                position={{ lat: storm.latitude, lng: storm.longitude }}
                icon={{
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 10,
                  fillColor: getStormColor(storm.severity),
                  fillOpacity: 0.8,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                }}
                onClick={() => {
                  setSelectedStorm(storm)
                  setSelectedCustomer(null)
                }}
              />

              {/* Affected Radius Circle */}
              <Circle
                center={{ lat: storm.latitude, lng: storm.longitude }}
                radius={storm.affectedRadius * 1609.34} // miles to meters
                options={{
                  fillColor: getStormColor(storm.severity),
                  fillOpacity: 0.1,
                  strokeColor: getStormColor(storm.severity),
                  strokeOpacity: 0.3,
                  strokeWeight: 2,
                }}
              />
            </div>
          )
        })}

        {/* Affected Customer Markers */}
        {affectedCustomers.map((customer) => {
          if (!customer.contact.latitude || !customer.contact.longitude) return null

          return (
            <Marker
              key={customer.contact.id}
              position={{
                lat: customer.contact.latitude,
                lng: customer.contact.longitude,
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: 6,
                fillColor: getPriorityColor(customer.priority),
                fillOpacity: 0.9,
                strokeColor: '#ffffff',
                strokeWeight: 1,
              }}
              onClick={() => {
                setSelectedCustomer(customer)
                setSelectedStorm(null)
              }}
            />
          )
        })}

        {/* Storm Info Window */}
        {selectedStorm && selectedStorm.latitude && selectedStorm.longitude && (
          <InfoWindow
            position={{ lat: selectedStorm.latitude, lng: selectedStorm.longitude }}
            onCloseClick={() => setSelectedStorm(null)}
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <CloudLightning className="w-4 h-4" />
                <h3 className="font-semibold">
                  {selectedStorm.event_type.replace('_', ' ').toUpperCase()}
                </h3>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="font-medium">Severity:</span> {selectedStorm.severity}
                </div>
                <div>
                  <span className="font-medium">Status:</span> {selectedStorm.status}
                </div>
                {selectedStorm.magnitude && (
                  <div>
                    <span className="font-medium">Magnitude:</span> {selectedStorm.magnitude}
                  </div>
                )}
                <div>
                  <span className="font-medium">Radius:</span> {selectedStorm.affectedRadius} mi
                </div>
                {selectedStorm.city && (
                  <div>
                    <span className="font-medium">Location:</span> {selectedStorm.city}, {selectedStorm.state}
                  </div>
                )}
              </div>
            </div>
          </InfoWindow>
        )}

        {/* Customer Info Window */}
        {selectedCustomer && selectedCustomer.contact.latitude && selectedCustomer.contact.longitude && (
          <InfoWindow
            position={{
              lat: selectedCustomer.contact.latitude,
              lng: selectedCustomer.contact.longitude,
            }}
            onCloseClick={() => setSelectedCustomer(null)}
          >
            <div className="p-2 min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <Home className="w-4 h-4" />
                <h3 className="font-semibold">
                  {selectedCustomer.contact.first_name} {selectedCustomer.contact.last_name}
                </h3>
              </div>
              <div className="space-y-1 text-sm">
                {selectedCustomer.contact.address_street && (
                  <div className="text-muted-foreground">
                    {selectedCustomer.contact.address_street}
                  </div>
                )}
                <div>
                  <span className="font-medium">Priority:</span>{' '}
                  <Badge variant="outline" className="text-xs">
                    {selectedCustomer.priority}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Distance:</span> {selectedCustomer.distance.toFixed(1)} mi
                </div>
                <div>
                  <span className="font-medium">Damage Probability:</span>{' '}
                  {selectedCustomer.damagePrediction.probability}%
                </div>
                <div>
                  <span className="font-medium">Est. Damage:</span> $
                  {selectedCustomer.damagePrediction.estimatedDamage.toLocaleString()}
                </div>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </Card>
  )
}

/**
 * Get color for storm severity
 */
function getStormColor(severity: string): string {
  const colors: Record<string, string> = {
    minor: '#3b82f6', // blue
    moderate: '#f59e0b', // orange
    severe: '#ef4444', // red
    extreme: '#7c2d12', // dark red
  }
  return colors[severity] || colors.moderate
}

/**
 * Get color for customer priority
 */
function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: '#3b82f6', // blue
    medium: '#f59e0b', // orange
    high: '#ef4444', // red
    urgent: '#991b1b', // dark red
  }
  return colors[priority] || colors.medium
}
