import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { NextRequest } from 'next/server'
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { checkDNC } from '@/lib/compliance'
import { formatPhoneNumber, isValidPhoneNumber } from '@/lib/twilio/voice'

/**
 * GET /api/compliance/dnc/check?phone=+1234567890
 * Check if a phone number is on the Do Not Call registry
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError('User not authenticated')
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User is not associated with a tenant')
    }

    logger.apiRequest('GET', '/api/compliance/dnc/check', { tenantId, userId: user.id })

    // Get phone number from query string
    const { searchParams } = new URL(request.url)
    const phoneParam = searchParams.get('phone')

    if (!phoneParam) {
      throw ValidationError('Phone number is required', {
        message: 'Provide phone number as query parameter: ?phone=+1234567890',
      })
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneNumber(phoneParam)
    if (!isValidPhoneNumber(formattedPhone)) {
      throw ValidationError('Invalid phone number format', { phone: phoneParam })
    }

    // Check DNC registry
    const dncResult = await checkDNC(formattedPhone, tenantId)

    const duration = Date.now() - startTime
    logger.apiResponse('GET', '/api/compliance/dnc/check', 200, duration)

    return successResponse({
      phoneNumber: formattedPhone,
      status: dncResult.isListed ? 'listed' : 'clear',
      source: dncResult.source || null,
      listedDate: dncResult.listedDate || null,
      reason: dncResult.reason || null,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DNC check error', { error, duration })
    return errorResponse(error as Error)
  }
}
