'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Loader } from '@googlemaps/js-api-loader'

// Dynamically import the direct map component with no SSR
const TerritoryMapDirect = dynamic(
  () => import('./TerritoryMapDirect'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-[500px] bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
  onMapReady?: (map: any) => void
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

    // Load Google Maps API
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
      version: 'weekly',
      libraries: ['drawing', 'geometry']
    })

    loader.load()
      .then(() => {
        console.log('[TerritoryMapWrapper] Google Maps API loaded')
        setIsLoaded(true)
      })
      .catch((error) => {
        console.error('[TerritoryMapWrapper] Error loading Google Maps API:', error)
        setLoadError('Failed to load Google Maps')
      })
  }, [])

  if (!isMounted || !isLoaded) {
    return (
      <div className={`flex items-center justify-center ${props.height ? `h-[${props.height}]` : 'h-[500px]'} bg-gray-100 rounded-lg ${props.className || ''}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className={`flex items-center justify-center ${props.height ? `h-[${props.height}]` : 'h-[500px]'} bg-red-50 rounded-lg border border-red-200 ${props.className || ''}`}>
        <p className="text-red-800">{loadError}</p>
      </div>
    )
  }

  return <TerritoryMapDirect {...props} />
}