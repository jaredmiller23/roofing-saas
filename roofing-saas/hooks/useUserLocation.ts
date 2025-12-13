'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

interface UserLocation {
  latitude: number
  longitude: number
  accuracy: number
  heading: number | null
  speed: number | null
  timestamp: number
}

interface UseUserLocationOptions {
  enableHighAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  enabled?: boolean
}

interface UseUserLocationReturn {
  location: UserLocation | null
  error: string | null
  isTracking: boolean
  startTracking: () => void
  stopTracking: () => void
}

/**
 * Hook for real-time user location tracking using the Geolocation API.
 * Uses watchPosition for continuous updates.
 *
 * @param options.enableHighAccuracy - Use GPS for high accuracy (default: true)
 * @param options.maximumAge - Cache position for this many ms (default: 10000)
 * @param options.timeout - Max time to wait for position (default: 15000)
 * @param options.enabled - Whether to auto-start tracking (default: true)
 */
export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 10000,      // Cache position for 10 seconds to reduce battery drain
    timeout = 15000,
    enabled = true
  } = options

  const [location, setLocation] = useState<UserLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    setLocation({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    })
    setError(null)
  }, [])

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMsg = 'Failed to get location'
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMsg = 'Location permission denied'
        break
      case err.POSITION_UNAVAILABLE:
        errorMsg = 'Location unavailable'
        break
      case err.TIMEOUT:
        errorMsg = 'Location request timed out'
        break
    }
    setError(errorMsg)
  }, [])

  const startTracking = useCallback(() => {
    if (typeof window === 'undefined') return

    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported')
      return
    }

    if (watchIdRef.current !== null) return // Already tracking

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      { enableHighAccuracy, maximumAge, timeout }
    )

    watchIdRef.current = watchId
    setIsTracking(true)
  }, [enableHighAccuracy, maximumAge, timeout, handleSuccess, handleError])

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
      setIsTracking(false)
    }
  }, [])

  // Auto-start tracking when enabled changes
  useEffect(() => {
    if (enabled) {
      startTracking()
    } else {
      stopTracking()
    }

    return () => {
      stopTracking()
    }
  }, [enabled, startTracking, stopTracking])

  return { location, error, isTracking, startTracking, stopTracking }
}
