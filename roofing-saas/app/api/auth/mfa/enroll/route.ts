// =============================================
// MFA Enrollment API Route
// =============================================
// Route: POST /api/auth/mfa/enroll
// Purpose: Start MFA enrollment, returns QR code and secret
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { enrollMFA, generateRecoveryCodes } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json().catch(() => ({}))
    const friendlyName = body.friendlyName || 'Authenticator App'

    const enrollment = await enrollMFA(friendlyName)

    // Generate recovery codes for backup access
    const recoveryCodes = generateRecoveryCodes(10)

    return successResponse({
      success: true,
      enrollment: {
        factorId: enrollment.factorId,
        qrCode: enrollment.qrCode,
        secret: enrollment.secret,
        uri: enrollment.uri,
      },
      recoveryCodes,
    })
  } catch (error) {
    logger.error('Error enrolling MFA:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
