// =============================================
// MFA Disable API Route
// =============================================
// Route: POST /api/auth/mfa/disable
// Purpose: Disable MFA for the authenticated user
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { disableMFA, getMFAStatus } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()

    // If factorId not provided, get the first verified factor
    let factorId = body.factorId

    if (!factorId) {
      const status = await getMFAStatus()
      const verifiedFactor = status.factors.find(f => f.status === 'verified')

      if (!verifiedFactor) {
        throw ValidationError('No MFA factor to disable')
      }

      factorId = verifiedFactor.id
    }

    const result = await disableMFA(factorId)

    if (!result.success) {
      throw InternalError(result.error || 'Failed to disable MFA')
    }

    logger.info('MFA disabled successfully', { userId: user.id })

    return successResponse({
      success: true,
      message: 'MFA has been disabled',
    })
  } catch (error) {
    logger.error('Error disabling MFA:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
