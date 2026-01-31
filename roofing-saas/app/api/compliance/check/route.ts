import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { canMakeCall } from '@/lib/compliance/call-compliance'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
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
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    // Get tenant ID from database
    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with tenant')
    }

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
      userId: user.id,
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
}
