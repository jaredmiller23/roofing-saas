'use client'

import { useEffect, useRef } from 'react'

interface UserLocationMarkerProps {
  map: google.maps.Map | null
  latitude: number | null
  longitude: number | null
  accuracy?: number | null
  heading?: number | null
}

/**
 * Renders a Google Maps marker showing the user's current location.
 * Displays a blue dot with an optional accuracy circle and directional arrow.
 */
export function UserLocationMarker({
  map,
  latitude,
  longitude,
  accuracy,
  heading
}: UserLocationMarkerProps) {
  const markerRef = useRef<google.maps.Marker | null>(null)
  const accuracyCircleRef = useRef<google.maps.Circle | null>(null)

  useEffect(() => {
    if (!map || latitude === null || longitude === null) {
      // Clean up if no valid position
      markerRef.current?.setMap(null)
      accuracyCircleRef.current?.setMap(null)
      return
    }

    const position = { lat: latitude, lng: longitude }

    // Create or update the user marker (blue dot)
    if (!markerRef.current) {
      markerRef.current = new google.maps.Marker({
        map,
        position,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#22C55E',       // Green (live location)
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        },
        title: 'Your Location',
        zIndex: 1000,
      })
    } else {
      markerRef.current.setPosition(position)
    }

    // Update icon to directional arrow if heading is available
    if (heading !== null && heading !== undefined && markerRef.current) {
      markerRef.current.setIcon({
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 6,
        fillColor: '#22C55E',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 2,
        rotation: heading,
      })
    } else if (markerRef.current) {
      // Reset to circle if no heading
      markerRef.current.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: '#22C55E',
        fillOpacity: 1,
        strokeColor: '#FFFFFF',
        strokeWeight: 3,
      })
    }

    // Create or update accuracy circle
    if (accuracy && accuracy > 0) {
      if (!accuracyCircleRef.current) {
        accuracyCircleRef.current = new google.maps.Circle({
          map,
          center: position,
          radius: accuracy,
          fillColor: '#22C55E',
          fillOpacity: 0.15,
          strokeColor: '#22C55E',
          strokeOpacity: 0.3,
          strokeWeight: 1,
          clickable: false,
        })
      } else {
        accuracyCircleRef.current.setCenter(position)
        accuracyCircleRef.current.setRadius(accuracy)
      }
    } else if (accuracyCircleRef.current) {
      // Remove accuracy circle if no accuracy data
      accuracyCircleRef.current.setMap(null)
      accuracyCircleRef.current = null
    }

    // Cleanup on unmount
    return () => {
      markerRef.current?.setMap(null)
      accuracyCircleRef.current?.setMap(null)
      markerRef.current = null
      accuracyCircleRef.current = null
    }
  }, [map, latitude, longitude, accuracy, heading])

  // This component renders via Google Maps API, no DOM output
  return null
}
