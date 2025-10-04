/**
 * Google Maps Geocoding Service
 * Convert addresses to coordinates and vice versa
 */

import { logger } from '@/lib/logger'

export interface GeocodeResult {
  latitude: number
  longitude: number
  formatted_address: string
  address_components: {
    street_number?: string
    route?: string
    locality?: string
    administrative_area_level_1?: string
    country?: string
    postal_code?: string
  }
  place_id?: string
}

export interface ReverseGeocodeResult {
  formatted_address: string
  street_address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  place_id?: string
}

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.warn('Google Maps API key not configured')
    return null
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      logger.warn('Geocoding failed', { address, status: data.status })
      return null
    }

    const result = data.results[0]
    const location = result.geometry.location

    // Extract address components
    const components: GeocodeResult['address_components'] = {}
    result.address_components?.forEach((component: any) => {
      if (component.types.includes('street_number')) {
        components.street_number = component.long_name
      }
      if (component.types.includes('route')) {
        components.route = component.long_name
      }
      if (component.types.includes('locality')) {
        components.locality = component.long_name
      }
      if (component.types.includes('administrative_area_level_1')) {
        components.administrative_area_level_1 = component.short_name
      }
      if (component.types.includes('country')) {
        components.country = component.short_name
      }
      if (component.types.includes('postal_code')) {
        components.postal_code = component.long_name
      }
    })

    return {
      latitude: location.lat,
      longitude: location.lng,
      formatted_address: result.formatted_address,
      address_components: components,
      place_id: result.place_id,
    }
  } catch (error) {
    logger.error('Geocoding error', { error, address })
    return null
  }
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    logger.warn('Google Maps API key not configured')
    return null
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`

    const response = await fetch(url)
    const data = await response.json()

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      logger.warn('Reverse geocoding failed', { latitude, longitude, status: data.status })
      return null
    }

    const result = data.results[0]

    // Extract address components
    let street_address: string | undefined
    let city: string | undefined
    let state: string | undefined
    let country: string | undefined
    let postal_code: string | undefined

    result.address_components?.forEach((component: any) => {
      if (component.types.includes('street_number') || component.types.includes('route')) {
        street_address = street_address
          ? `${street_address} ${component.long_name}`
          : component.long_name
      }
      if (component.types.includes('locality')) {
        city = component.long_name
      }
      if (component.types.includes('administrative_area_level_1')) {
        state = component.short_name
      }
      if (component.types.includes('country')) {
        country = component.short_name
      }
      if (component.types.includes('postal_code')) {
        postal_code = component.long_name
      }
    })

    return {
      formatted_address: result.formatted_address,
      street_address,
      city,
      state,
      country,
      postal_code,
      place_id: result.place_id,
    }
  } catch (error) {
    logger.error('Reverse geocoding error', { error, latitude, longitude })
    return null
  }
}

/**
 * Batch geocode multiple addresses
 */
export async function batchGeocode(addresses: string[]): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = []

  // Google Maps API has rate limits, so we'll add a small delay between requests
  for (const address of addresses) {
    const result = await geocodeAddress(address)
    results.push(result)

    // Add 100ms delay to avoid rate limiting
    if (addresses.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Validate an address (check if it can be geocoded)
 */
export async function validateAddress(address: string): Promise<boolean> {
  const result = await geocodeAddress(address)
  return result !== null
}

/**
 * Get distance between two addresses (in meters)
 * Uses Haversine formula as a lightweight alternative to Distance Matrix API
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`
  }

  const km = meters / 1000
  if (km < 10) {
    return `${km.toFixed(1)}km`
  }

  return `${Math.round(km)}km`
}

/**
 * Calculate estimated travel time (in minutes)
 * Simple estimation: assumes 40 km/h average speed for urban driving
 */
export function estimateTravelTime(distanceInMeters: number): number {
  const averageSpeedKmh = 40
  const distanceKm = distanceInMeters / 1000
  const hours = distanceKm / averageSpeedKmh
  return Math.round(hours * 60) // Convert to minutes
}
