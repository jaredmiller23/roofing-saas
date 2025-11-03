import { NextRequest, NextResponse } from 'next/server'
import { reverseGeocode } from '@/lib/maps/geocoding'
import { logger } from '@/lib/logger'

/**
 * POST /api/maps/reverse-geocode
 * Convert coordinates to address
 * Used for pin dropping - get address when user clicks on map
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { latitude, longitude } = body

    // Validate input
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { error: 'Invalid coordinates. latitude and longitude must be numbers.' },
        { status: 400 }
      )
    }

    if (latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { error: 'Invalid latitude. Must be between -90 and 90.' },
        { status: 400 }
      )
    }

    if (longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { error: 'Invalid longitude. Must be between -180 and 180.' },
        { status: 400 }
      )
    }

    logger.info('Reverse geocoding request', { latitude, longitude })

    // Call Google Maps geocoding service
    const result = await reverseGeocode(latitude, longitude)

    if (!result) {
      return NextResponse.json(
        { error: 'Address not found for these coordinates' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      address: result.formatted_address,
      street_address: result.street_address,
      city: result.city,
      state: result.state,
      postal_code: result.postal_code,
      country: result.country,
      place_id: result.place_id,
    })
  } catch (error) {
    logger.error('Reverse geocoding error', { error })
    return NextResponse.json(
      { error: 'Failed to reverse geocode coordinates' },
      { status: 500 }
    )
  }
}
