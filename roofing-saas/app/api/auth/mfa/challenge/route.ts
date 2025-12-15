// =============================================
// MFA Challenge API Route
// =============================================
// Route: POST /api/auth/mfa/challenge
// Purpose: Create a new MFA challenge for verification
// =============================================

import { getCurrentUser } from '@/lib/auth/session'
import { createMFAChallenge } from '@/lib/auth/mfa'
import { logger } from '@/lib/logger'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    const body = await request.json()
    const { factorId } = body

    if (!factorId) {
      throw ValidationError('Factor ID is required')
    }

    const challenge = await createMFAChallenge(factorId)

    return successResponse({
      success: true,
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
    })
  } catch (error) {
    logger.error('Error creating MFA challenge:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}