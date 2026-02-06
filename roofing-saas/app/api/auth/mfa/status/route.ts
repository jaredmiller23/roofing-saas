// =============================================
// MFA Status API Route
// =============================================
// Route: GET /api/auth/mfa/status
// Purpose: Get current MFA status for authenticated user
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { getMFAStatus, getAssuranceLevel } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request: NextRequest) => {
  try {
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
})
