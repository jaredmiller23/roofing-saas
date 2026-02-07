import { NextRequest } from 'next/server'
import { reverseGeocode } from '@/lib/maps/geocoding'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { withAuth } from '@/lib/auth/with-auth'

/**
 * POST /api/maps/reverse-geocode
 * Convert coordinates to address
 * Used for pin dropping - get address when user clicks on map
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const { latitude, longitude } = body

    // Validate input
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      throw ValidationError('Invalid coordinates. latitude and longitude must be numbers.')
    }

    if (latitude < -90 || latitude > 90) {
      throw ValidationError('Invalid latitude. Must be between -90 and 90.')
    }

    if (longitude < -180 || longitude > 180) {
      throw ValidationError('Invalid longitude. Must be between -180 and 180.')
    }

    logger.info('Reverse geocoding request', { latitude, longitude })

    // Call Google Maps geocoding service
    const result = await reverseGeocode(latitude, longitude)

    if (!result) {
      throw NotFoundError('Address not found for these coordinates')
    }

    return successResponse({
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
    return errorResponse(error instanceof Error ? error : InternalError('Failed to reverse geocode coordinates'))
  }
})
