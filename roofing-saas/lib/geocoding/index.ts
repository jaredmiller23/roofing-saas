/**
 * Geocoding functionality
 * Convert coordinates to addresses and vice versa
 */

import { reverseGeocode as reverseGeocodeAPI } from '@/lib/maps/geocoding'

/**
 * Reverse geocode coordinates to address using Google Geocoding API
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const result = await reverseGeocodeAPI(lat, lng)

    if (result && result.formatted_address) {
      return result.formatted_address
    }

    // Fallback to coordinates if geocoding fails
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  } catch (error) {
    console.error('Error in reverse geocoding:', error)
    // Fallback to coordinates on error
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
  }
}
