// =============================================
// MFA Verify API Route
// =============================================
// Route: POST /api/auth/mfa/verify
// Purpose: Verify TOTP code for login (with challengeId) or enrollment (without)
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { verifyMFAEnrollment, verifyMFAChallenge, generateRecoveryCodes } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest, { user }) => {
  try {
    const body = await request.json()

    if (!body.factorId || !body.code) {
      throw ValidationError('factorId and code are required')
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(String(body.code))) {
      throw ValidationError('Code must be 6 digits')
    }

    // Login flow: client provides challengeId from createMFAChallenge
    // Enrollment flow: no challengeId, verifyMFAEnrollment creates its own
    if (body.challengeId) {
      const result = await verifyMFAChallenge(body.factorId, body.challengeId, body.code)

      if (!result.success) {
        throw ValidationError(result.error || 'Invalid verification code')
      }

      logger.info('MFA login verified', { userId: user.id })

      return successResponse({
        success: true,
        message: 'MFA verification successful',
      })
    }

    // Enrollment verification (no challengeId)
    const result = await verifyMFAEnrollment(body.factorId, body.code)

    if (!result.success) {
      throw ValidationError(result.error || 'Invalid verification code')
    }

    const recoveryCodes = generateRecoveryCodes(10)

    logger.info('MFA enrolled successfully', { userId: user.id })

    return successResponse({
      success: true,
      message: 'MFA enabled successfully',
      recoveryCodes,
      recoveryCodesWarning: 'Save these recovery codes in a safe place. They will not be shown again.',
    })
  } catch (error) {
    logger.error('Error verifying MFA:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
