// =============================================
// MFA Enforcement Status API Route
// =============================================
// Route: GET /api/auth/mfa/enforcement
// Purpose: Get MFA enforcement status for current user
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { getMFAEnforcementStatus } from '@/lib/auth/mfa-enforcement'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const GET = withAuth(async (_request: NextRequest) => {
  try {
    const status = await getMFAEnforcementStatus()

    return successResponse({
      success: true,
      ...status,
    })
  } catch (error) {
    logger.error('Error getting MFA enforcement status:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
