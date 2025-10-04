/**
 * Geocoding API
 * Convert addresses to coordinates and vice versa
 */

import { NextRequest, NextResponse } from 'next/server'
import { geocodeAddress, reverseGeocode, validateAddress, batchGeocode } from '@/lib/maps/geocoding'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const address = searchParams.get('address')
    const lat = searchParams.get('lat')
    const lng = searchParams.get('lng')
    const validate = searchParams.get('validate') === 'true'
    const batch = searchParams.get('batch')

    // Batch geocoding
    if (batch) {
      try {
        const addresses = JSON.parse(batch) as string[]
        const results = await batchGeocode(addresses)
        return NextResponse.json({ results })
      } catch (_error) {
        return NextResponse.json(
          { error: 'Invalid batch parameter - must be JSON array of addresses' },
          { status: 400 }
        )
      }
    }

    // Address validation
    if (validate && address) {
      const isValid = await validateAddress(address)
      return NextResponse.json({ valid: isValid, address })
    }

    // Forward geocoding (address → coordinates)
    if (address) {
      const result = await geocodeAddress(address)

      if (!result) {
        return NextResponse.json(
          { error: 'Address not found or geocoding failed' },
          { status: 404 }
        )
      }

      return NextResponse.json(result)
    }

    // Reverse geocoding (coordinates → address)
    if (lat && lng) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json(
          { error: 'Invalid latitude or longitude' },
          { status: 400 }
        )
      }

      const result = await reverseGeocode(latitude, longitude)

      if (!result) {
        return NextResponse.json(
          { error: 'Location not found or reverse geocoding failed' },
          { status: 404 }
        )
      }

      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Provide either address or lat/lng parameters' },
      { status: 400 }
    )
  } catch (error) {
    logger.error('Geocoding API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
