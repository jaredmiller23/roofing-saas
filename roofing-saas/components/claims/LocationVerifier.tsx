'use client'

import { useState, useCallback } from 'react'
import { calculateDistance } from '@/lib/claims/inspection-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface LocationVerifierProps {
  propertyLatitude?: number
  propertyLongitude?: number
  maxDistanceMeters?: number
  onVerified: (coords: { latitude: number; longitude: number; distance: number }) => void
  onSkip?: () => void
}

type VerificationStatus = 'idle' | 'checking' | 'verified' | 'too_far' | 'error'

/**
 * LocationVerifier - GPS verification for inspection
 *
 * Ensures the user is physically at the property location
 * before allowing inspection to proceed.
 */
export function LocationVerifier({
  propertyLatitude,
  propertyLongitude,
  maxDistanceMeters = 100, // Default 100m radius
  onVerified,
  onSkip,
}: LocationVerifierProps) {
  const [status, setStatus] = useState<VerificationStatus>('idle')
  const [currentCoords, setCurrentCoords] = useState<{
    latitude: number
    longitude: number
    accuracy: number
  } | null>(null)
  const [distance, setDistance] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const verifyLocation = useCallback(async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser')
      setStatus('error')
      return
    }

    setStatus('checking')
    setError(null)

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        })
      })

      const { latitude, longitude, accuracy } = position.coords
      setCurrentCoords({ latitude, longitude, accuracy })

      // If we have property coordinates, check distance
      if (propertyLatitude !== undefined && propertyLongitude !== undefined) {
        const dist = calculateDistance(latitude, longitude, propertyLatitude, propertyLongitude)
        setDistance(dist)

        if (dist <= maxDistanceMeters) {
          setStatus('verified')
          onVerified({ latitude, longitude, distance: dist })
        } else {
          setStatus('too_far')
        }
      } else {
        // No property coordinates - accept any location
        setStatus('verified')
        onVerified({ latitude, longitude, distance: 0 })
      }
    } catch (err) {
      const geoError = err as GeolocationPositionError
      let errorMsg = 'Failed to get location'

      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          errorMsg = 'Location permission denied. Please enable location access.'
          break
        case geoError.POSITION_UNAVAILABLE:
          errorMsg = 'Location unavailable. Please try again.'
          break
        case geoError.TIMEOUT:
          errorMsg = 'Location request timed out. Please try again.'
          break
      }

      setError(errorMsg)
      setStatus('error')
    }
  }, [propertyLatitude, propertyLongitude, maxDistanceMeters, onVerified])

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`
    }
    return `${(meters / 1000).toFixed(1)}km`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Verify Location</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Status display */}
          {status === 'idle' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <p className="text-muted-foreground mb-4">
                Verify you&apos;re at the property before starting the inspection.
              </p>
            </div>
          )}

          {status === 'checking' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 animate-pulse bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <p className="text-muted-foreground">Getting your location...</p>
            </div>
          )}

          {status === 'verified' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-green-700 font-medium">Location Verified</p>
              {distance !== null && distance > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;re {formatDistance(distance)} from the property
                </p>
              )}
            </div>
          )}

          {status === 'too_far' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-orange-700 font-medium">Too Far From Property</p>
              {distance !== null && (
                <p className="text-sm text-muted-foreground mt-1">
                  You&apos;re {formatDistance(distance)} away (max: {formatDistance(maxDistanceMeters)})
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Please move closer to the property and try again.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="text-red-700 font-medium">Location Error</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          )}

          {/* GPS accuracy indicator */}
          {currentCoords && currentCoords.accuracy > 50 && (
            <Alert variant="warning">
              <AlertDescription>
                GPS accuracy: {Math.round(currentCoords.accuracy)}m. Move to an open area for better accuracy.
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {(status === 'idle' || status === 'too_far' || status === 'error') && (
              <button
                onClick={verifyLocation}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
              >
                {status === 'idle' ? 'Verify My Location' : 'Try Again'}
              </button>
            )}

            {onSkip && status !== 'verified' && (
              <button
                onClick={onSkip}
                className="w-full py-3 border border-border text-muted-foreground rounded-lg hover:bg-accent"
              >
                Skip Location Verification
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
