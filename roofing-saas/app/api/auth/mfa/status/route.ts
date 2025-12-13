// =============================================
// MFA Status API Route
// =============================================
// Route: GET /api/auth/mfa/status
// Purpose: Get current MFA status for authenticated user
// =============================================

import { getCurrentUser } from '@/lib/auth/session'
import { getMFAStatus, getAssuranceLevel } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const [mfaStatus, assuranceLevel] = await Promise.all([
      getMFAStatus(),
      getAssuranceLevel(),
    ])

    return successResponse({
      success: true,
      mfa: {
        enabled: mfaStatus.enabled,
        factors: mfaStatus.factors,
        assuranceLevel: assuranceLevel.currentLevel,
        requiresMFA: assuranceLevel.nextLevel === 'aal2',
      },
    })
  } catch (error) {
    logger.error('Error getting MFA status:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
