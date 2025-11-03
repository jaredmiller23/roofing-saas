'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Marker } from '@react-google-maps/api'
import { PinPopup } from './PinPopup'
import { toast } from 'sonner'

// Pin marker colors by disposition
const PIN_COLORS = {
  interested: '#10b981', // Green
  not_home: '#f59e0b', // Orange
  not_interested: '#ef4444', // Red
  appointment: '#3b82f6', // Blue
  callback: '#8b5cf6', // Purple
  do_not_contact: '#6b7280', // Gray
  already_customer: '#14b8a6', // Teal
  pending: '#94a3b8', // Light gray (before disposition set)
}

interface PinData {
  id?: string
  latitude: number
  longitude: number
  address?: string
  address_street?: string
  address_city?: string
  address_state?: string
  address_zip?: string
  disposition?: string
  notes?: string
  pin_type?: string
  user_name?: string
  created_at?: string
  contact_id?: string
}

interface HousePinDropperProps {
  map: google.maps.Map | null
  territoryId?: string
  onPinCreated?: (pin: PinData) => void
  enabled?: boolean
}

export function HousePinDropper({
  map,
  territoryId,
  onPinCreated,
  enabled = true,
}: HousePinDropperProps) {
  const [tempPin, setTempPin] = useState<PinData | null>(null)
  const [isLoadingAddress, setIsLoadingAddress] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [existingPins, setExistingPins] = useState<PinData[]>([])
  const [selectedPin, setSelectedPin] = useState<PinData | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map())
  const mapClickListenerRef = useRef<google.maps.MapsEventListener | null>(null)

  // Load existing pins for the territory
  useEffect(() => {
    if (!territoryId || !map) {
      return
    }

    const fetchPins = async () => {
      try {
        const response = await fetch(`/api/pins?territory_id=${territoryId}`)
        const data = await response.json()

        if (response.ok && data.success) {
          setExistingPins(data.data || [])
        }
      } catch (error) {
        console.error('Error fetching pins:', error)
      }
    }

    fetchPins()
  }, [territoryId, map])

  // Display existing pins on the map
  useEffect(() => {
    if (!map || !existingPins.length) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current.clear()

    // Add markers for each existing pin
    existingPins.forEach(pin => {
      const color = pin.disposition
        ? PIN_COLORS[pin.disposition as keyof typeof PIN_COLORS] || PIN_COLORS.pending
        : PIN_COLORS.pending

      const marker = new google.maps.Marker({
        position: { lat: pin.latitude, lng: pin.longitude },
        map: map,
        icon: {
          path: 'M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12zm0 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z',
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 2,
          scale: 1.5,
          anchor: new google.maps.Point(12, 24),
        },
        title: pin.address_street || 'Pin Location',
      })

      // Add click handler to edit the pin
      marker.addListener('click', () => {
        setSelectedPin(pin)
        setIsEditMode(true)
        setShowPopup(true)
      })

      // Store reference to marker
      if (pin.id) {
        markersRef.current.set(pin.id, marker)
      }
    })

    return () => {
      // Cleanup markers on unmount
      markersRef.current.forEach(marker => marker.setMap(null))
      markersRef.current.clear()
    }
  }, [map, existingPins])

  // Handle map click to drop pin
  useEffect(() => {
    if (!map || !enabled) {
      // Remove existing listener if disabled
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current)
        mapClickListenerRef.current = null
      }
      return
    }

    // Add click listener
    const listener = map.addListener('click', async (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return

      const lat = e.latLng.lat()
      const lng = e.latLng.lng()

      setIsLoadingAddress(true)
      setShowPopup(false)

      // Reverse geocode the clicked location
      const geocoder = new google.maps.Geocoder()
      try {
        const result = await geocoder.geocode({ location: { lat, lng } })

        if (result.results && result.results[0]) {
          const addressComponents = result.results[0].address_components
          const formattedAddress = result.results[0].formatted_address

          // Extract address parts
          let street = ''
          let city = ''
          let state = ''
          let zip = ''

          addressComponents.forEach(component => {
            if (component.types.includes('street_number')) {
              street = component.long_name + ' '
            }
            if (component.types.includes('route')) {
              street += component.long_name
            }
            if (component.types.includes('locality')) {
              city = component.long_name
            }
            if (component.types.includes('administrative_area_level_1')) {
              state = component.short_name
            }
            if (component.types.includes('postal_code')) {
              zip = component.long_name
            }
          })

          const newPin: PinData = {
            latitude: lat,
            longitude: lng,
            address: formattedAddress,
            address_street: street,
            address_city: city,
            address_state: state,
            address_zip: zip,
            pin_type: 'lead_pin',
          }

          setTempPin(newPin)
          setIsEditMode(false)
          setShowPopup(true)
        }
      } catch (error) {
        console.error('Geocoding error:', error)
        toast.error('Failed to get address for this location')
      } finally {
        setIsLoadingAddress(false)
      }
    })

    mapClickListenerRef.current = listener

    return () => {
      if (mapClickListenerRef.current) {
        google.maps.event.removeListener(mapClickListenerRef.current)
        mapClickListenerRef.current = null
      }
    }
  }, [map, enabled])

  // Handle pin save (create or update)
  const handleSavePin = async (pinData: PinData & { create_contact?: boolean; contact_data?: unknown }) => {
    const isUpdate = isEditMode && selectedPin?.id

    try {
      const url = isUpdate ? `/api/pins/${selectedPin.id}` : '/api/pins'
      const method = isUpdate ? 'PUT' : 'POST'

      const payload = {
        ...pinData,
        territory_id: territoryId,
        pin_type: 'lead_pin',
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          toast.error(`Pin already exists within 25m (dropped by ${result.duplicate?.user_name || 'another user'})`)
        } else {
          toast.error(result.error || 'Failed to save pin')
        }
        return
      }

      // Success!
      toast.success(
        isUpdate
          ? 'Pin updated successfully!'
          : pinData.create_contact
          ? 'Pin and lead created successfully!'
          : 'Pin created successfully!'
      )

      // For updates, refresh the marker
      if (isUpdate && selectedPin?.id && map) {
        const existingMarker = markersRef.current.get(selectedPin.id)
        if (existingMarker) {
          const color = pinData.disposition
            ? PIN_COLORS[pinData.disposition as keyof typeof PIN_COLORS] || PIN_COLORS.pending
            : PIN_COLORS.pending

          existingMarker.setIcon({
            path: 'M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12zm0 16c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z',
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#fff',
            strokeWeight: 2,
            scale: 1.5,
            anchor: new google.maps.Point(12, 24),
          })
        }

        // Update in existing pins list
        setExistingPins(prev =>
          prev.map(p => (p.id === selectedPin.id ? { ...p, ...pinData } : p))
        )
      } else if (!isUpdate && result.data) {
        // For new pins, add to existing pins list
        setExistingPins(prev => [...prev, result.data])
      }

      // Hide popup
      setShowPopup(false)
      setTempPin(null)
      setSelectedPin(null)

      // Notify parent
      onPinCreated?.(result.data)
    } catch (error) {
      console.error('Error saving pin:', error)
      toast.error('Failed to save pin')
    }
  }

  // Handle pin deletion
  const handleDeletePin = async () => {
    if (!selectedPin?.id) return

    try {
      const response = await fetch(`/api/pins?id=${selectedPin.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete pin')
      }

      toast.success('Pin deleted successfully')

      // Remove marker from map
      const marker = markersRef.current.get(selectedPin.id)
      if (marker) {
        marker.setMap(null)
        markersRef.current.delete(selectedPin.id)
      }

      // Remove from existing pins list
      setExistingPins(prev => prev.filter(p => p.id !== selectedPin.id))

      // Close popup
      setShowPopup(false)
      setSelectedPin(null)
    } catch (error) {
      console.error('Error deleting pin:', error)
      toast.error('Failed to delete pin')
    }
  }

  // Handle cancel
  const handleCancel = () => {
    // Reset state
    setTempPin(null)
    setSelectedPin(null)
    setIsEditMode(false)
    setShowPopup(false)
  }

  // Show loading toast while geocoding
  useEffect(() => {
    if (isLoadingAddress) {
      const toastId = toast.loading('Getting address...')
      return () => {
        toast.dismiss(toastId)
      }
    }
  }, [isLoadingAddress])

  return (
    <>
      {/* Pin Popup Modal */}
      {showPopup && (tempPin || selectedPin) && (
        <PinPopup
          pin={isEditMode ? selectedPin! : tempPin!}
          isEditMode={isEditMode}
          onSave={handleSavePin}
          onCancel={handleCancel}
          onDelete={isEditMode ? handleDeletePin : undefined}
        />
      )}
    </>
  )
}
