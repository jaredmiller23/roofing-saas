// =============================================
// MFA Verify API Route
// =============================================
// Route: POST /api/auth/mfa/verify
// Purpose: Verify TOTP code to complete enrollment or authenticate
// =============================================

import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { verifyMFAEnrollment, generateRecoveryCodes } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const body = await request.json()

    if (!body.factorId || !body.code) {
      throw ValidationError('factorId and code are required')
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(body.code)) {
      throw ValidationError('Code must be 6 digits')
    }

    const result = await verifyMFAEnrollment(body.factorId, body.code)

    if (!result.success) {
      throw ValidationError(result.error || 'Invalid verification code')
    }

    // Generate recovery codes on successful enrollment
    const recoveryCodes = generateRecoveryCodes(10)

    // In production, you should hash these and store them in the database
    // For now, we just return them to show once to the user
    logger.info('MFA enrolled successfully', { userId: user.id })

    return successResponse({
      success: true,
      message: 'MFA enabled successfully',
      recoveryCodes,
      // Important: Tell user to save these codes
      recoveryCodesWarning: 'Save these recovery codes in a safe place. They will not be shown again.',
    })
  } catch (error) {
    logger.error('Error verifying MFA:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
