/**
 * Geocoding API
 * Convert addresses to coordinates and vice versa
 */

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { geocodeAddress, reverseGeocode, validateAddress, batchGeocode } from '@/lib/maps/geocoding'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (request: NextRequest) => {
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
        return successResponse(results)
      } catch (_error) {
        return errorResponse(ValidationError('Invalid batch parameter - must be JSON array of addresses'))
      }
    }

    // Address validation
    if (validate && address) {
      const isValid = await validateAddress(address)
      return successResponse({ valid: isValid, address })
    }

    // Forward geocoding (address → coordinates)
    if (address) {
      const result = await geocodeAddress(address)

      if (!result) {
        return errorResponse(NotFoundError('Address not found or geocoding failed'))
      }

      return successResponse(result)
    }

    // Reverse geocoding (coordinates → address)
    if (lat && lng) {
      const latitude = parseFloat(lat)
      const longitude = parseFloat(lng)

      if (isNaN(latitude) || isNaN(longitude)) {
        return errorResponse(ValidationError('Invalid latitude or longitude'))
      }

      const result = await reverseGeocode(latitude, longitude)

      if (!result) {
        return errorResponse(NotFoundError('Location not found or reverse geocoding failed'))
      }

      return successResponse(result)
    }

    return errorResponse(ValidationError('Provide either address or lat/lng parameters'))
  } catch (error) {
    logger.error('Geocoding API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
