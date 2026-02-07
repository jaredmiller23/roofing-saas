import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { canMakeCall } from '@/lib/compliance/call-compliance'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/compliance/check
 *
 * Check if a call can be made to a phone number
 * Performs comprehensive TCPA/TSR compliance validation
 *
 * Query params:
 * - phone: Phone number to check (required)
 * - contactId: Contact ID (optional)
 *
 * Returns:
 * {
 *   success: boolean
 *   data: {
 *     canCall: boolean
 *     reason?: string
 *     warning?: string
 *     checks: { ... }
 *   }
 * }
 */
export const GET = withAuth(async (request: NextRequest, { userId, tenantId }) => {
  try {
    // Get query params
    const searchParams = request.nextUrl.searchParams
    const phoneNumber = searchParams.get('phone')
    const contactId = searchParams.get('contactId')

    if (!phoneNumber) {
      throw ValidationError('Phone number is required')
    }

    // Perform compliance check
    const result = await canMakeCall({
      phoneNumber,
      contactId: contactId || undefined,
      tenantId,
      userId,
    })

    logger.info('Compliance check completed', {
      phoneNumber,
      contactId,
      tenantId,
      canCall: result.canCall,
    })

    return successResponse(result)
  } catch (error) {
    logger.error('Error in compliance check API', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
