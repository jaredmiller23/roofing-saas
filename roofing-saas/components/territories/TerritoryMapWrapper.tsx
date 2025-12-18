'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader } from '@googlemaps/js-api-loader'

// Singleton Google Maps Loader to prevent recreation on every render
let googleMapsLoader: Loader | null = null
let loadAttempted = false
let loadSucceeded = false

function getGoogleMapsLoader() {
  if (!googleMapsLoader) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''
    console.log('[TerritoryMapWrapper] Creating loader with API key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'MISSING')

    googleMapsLoader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['drawing', 'geometry']
    })
  }
  return googleMapsLoader
}

// Dynamically import the direct map component with no SSR
const TerritoryMapDirect = dynamic(
  () => import('./TerritoryMapDirect'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-muted rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
)

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
  center?: [number, number]
  zoom?: number
  height?: string
  className?: string
  disableTerritoryInteractions?: boolean
}

export function TerritoryMap(props: TerritoryMapProps) {
  const [isMounted, setIsMounted] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)

    // Check if Google Maps is already loaded
    if (typeof google !== 'undefined' && google.maps) {
      console.log('[TerritoryMapWrapper] Google Maps already loaded')
      loadSucceeded = true
      setIsLoaded(true)
      return
    }

    // If we already tried and failed, show error immediately
    if (loadAttempted && !loadSucceeded) {
      console.log('[TerritoryMapWrapper] Previous load attempt failed')
      setLoadError('Google Maps failed to load. Please refresh the page.')
      return
    }

    // If we already tried and succeeded, check again
    if (loadAttempted && loadSucceeded) {
      if (typeof google !== 'undefined' && google.maps) {
        setIsLoaded(true)
        return
      }
    }

    loadAttempted = true

    // Load Google Maps API using singleton loader with timeout
    const loader = getGoogleMapsLoader()

    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Google Maps load timeout after 15 seconds')), 15000)
    })

    // Race between loader and timeout
    Promise.race([loader.load(), timeoutPromise])
      .then(() => {
        console.log('[TerritoryMapWrapper] Google Maps API loaded successfully')
        loadSucceeded = true
        setIsLoaded(true)
      })
      .catch((error) => {
        console.error('[TerritoryMapWrapper] Error loading Google Maps API:', error)
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        setLoadError(`Failed to load Google Maps: ${errorMessage}`)
      })
  }, [])

  if (loadError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-destructive/10 rounded-lg border border-destructive ${props.className || ''}`}
        style={{ height: props.height || '500px' }}
      >
        <p className="text-destructive font-medium">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-md text-sm hover:bg-destructive/90"
        >
          Reload Page
        </button>
      </div>
    )
  }

  if (!isMounted || !isLoaded) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-muted rounded-lg ${props.className || ''}`}
        style={{ height: props.height || '500px' }}
      >
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
        <p className="text-muted-foreground text-sm">Loading map...</p>
      </div>
    )
  }

  return <TerritoryMapDirect {...props} />
}