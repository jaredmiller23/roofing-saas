// =============================================
// MFA Enforcement Status API Route
// =============================================
// Route: GET /api/auth/mfa/enforcement
// Purpose: Get MFA enforcement status for current user
// =============================================

import { getMFAEnforcementStatus } from '@/lib/auth/mfa-enforcement'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { getCurrentUser } from '@/lib/auth/session'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const status = await getMFAEnforcementStatus()

    return successResponse({
      success: true,
      ...status,
    })
  } catch (error) {
    logger.error('Error getting MFA enforcement status:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}