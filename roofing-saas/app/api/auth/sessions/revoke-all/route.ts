// =============================================
// Revoke All Sessions API Route
// =============================================
// Route: POST /api/auth/sessions/revoke-all
// Purpose: Sign out from all other devices
// =============================================

import { getCurrentUser } from '@/lib/auth/session'
import { revokeAllOtherSessions } from '@/lib/auth/sessions'
import { logger } from '@/lib/logger'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * POST /api/auth/sessions/revoke-all
 * Revoke all sessions except the current one
 */
export async function POST() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      throw AuthenticationError()
    }

    // Note: In a real implementation, you'd get the current session token
    // from the auth context. For now, we'll revoke based on the user's request
    // context (IP/UA matching) handled in the sessions utility.
    const revokedCount = await revokeAllOtherSessions(user.id)

    logger.info('All other sessions revoked', {
      userId: user.id,
      revokedCount,
    })

    return successResponse({
      success: true,
      message: revokedCount > 0
        ? `Signed out from ${revokedCount} other device${revokedCount !== 1 ? 's' : ''}`
        : 'No other active sessions found',
      revokedCount,
    })
  } catch (error) {
    logger.error('Error revoking all sessions:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
