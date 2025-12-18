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
  retry: () => void
}

/**
 * Hook for real-time user location tracking using the Geolocation API.
 * Uses getCurrentPosition for initial location, then watchPosition for updates.
 *
 * @param options.enableHighAccuracy - Use GPS for high accuracy (default: true)
 * @param options.maximumAge - Cache position for this many ms (default: 10000)
 * @param options.timeout - Max time to wait for position (default: 10000)
 * @param options.enabled - Whether to auto-start tracking (default: true)
 */
export function useUserLocation(options: UseUserLocationOptions = {}): UseUserLocationReturn {
  const {
    enableHighAccuracy = true,
    maximumAge = 10000,
    timeout = 10000,  // Reduced from 15s to 10s for faster feedback
    enabled = true
  } = options

  const [location, setLocation] = useState<UserLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTracking, setIsTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  const hardTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const hasReceivedLocationRef = useRef(false)

  const handleSuccess = useCallback((position: GeolocationPosition) => {
    console.log('[useUserLocation] Position received:', {
      lat: position.coords.latitude.toFixed(6),
      lng: position.coords.longitude.toFixed(6),
      accuracy: Math.round(position.coords.accuracy) + 'm',
      heading: position.coords.heading
    })

    hasReceivedLocationRef.current = true

    // Clear hard timeout since we got a position
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current)
      hardTimeoutRef.current = null
    }

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
        errorMsg = 'Location permission denied. Please enable in browser settings.'
        console.error('[useUserLocation] Permission denied')
        break
      case err.POSITION_UNAVAILABLE:
        errorMsg = 'Location unavailable. Please check device settings.'
        console.error('[useUserLocation] Position unavailable')
        break
      case err.TIMEOUT:
        errorMsg = 'Location request timed out. Please try again.'
        console.warn('[useUserLocation] Geolocation timeout')
        break
    }
    setError(errorMsg)

    // Clear hard timeout since we got an error
    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current)
      hardTimeoutRef.current = null
    }
  }, [])

  const startTracking = useCallback(() => {
    if (typeof window === 'undefined') return

    if (!('geolocation' in navigator)) {
      console.error('[useUserLocation] Geolocation not supported')
      setError('Geolocation is not supported by this browser')
      return
    }

    if (watchIdRef.current !== null) {
      console.log('[useUserLocation] Already tracking')
      return
    }

    console.log('[useUserLocation] Starting location tracking...')
    setIsTracking(true)
    setError(null)
    hasReceivedLocationRef.current = false

    // Set a hard timeout - if we don't get ANY response in 10s, show error
    hardTimeoutRef.current = setTimeout(() => {
      if (!hasReceivedLocationRef.current) {
        console.warn('[useUserLocation] Hard timeout - no location after 10s')
        setError('Unable to determine location. Check that Location Services are enabled.')
      }
    }, 10000)

    // First, try getCurrentPosition for faster initial response
    console.log('[useUserLocation] Requesting initial position...')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('[useUserLocation] Initial position received')
        handleSuccess(position)

        // Now start watching for updates
        console.log('[useUserLocation] Starting position watch...')
        const watchId = navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          { enableHighAccuracy, maximumAge, timeout }
        )
        watchIdRef.current = watchId
      },
      (err) => {
        console.warn('[useUserLocation] Initial position failed, trying watchPosition:', err.message)
        handleError(err)

        // Still try watchPosition in case it works later
        const watchId = navigator.geolocation.watchPosition(
          handleSuccess,
          handleError,
          { enableHighAccuracy, maximumAge, timeout }
        )
        watchIdRef.current = watchId
      },
      { enableHighAccuracy, maximumAge: 0, timeout: 5000 } // Faster timeout for initial
    )
  }, [enableHighAccuracy, maximumAge, timeout, handleSuccess, handleError])

  const stopTracking = useCallback(() => {
    console.log('[useUserLocation] Stopping tracking')

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }

    if (hardTimeoutRef.current) {
      clearTimeout(hardTimeoutRef.current)
      hardTimeoutRef.current = null
    }

    setIsTracking(false)
  }, [])

  const retry = useCallback(() => {
    console.log('[useUserLocation] Retrying location...')
    stopTracking()
    setError(null)
    setLocation(null)
    // Small delay to ensure cleanup completes
    setTimeout(() => {
      startTracking()
    }, 100)
  }, [stopTracking, startTracking])

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

  return { location, error, isTracking, startTracking, stopTracking, retry }
}
