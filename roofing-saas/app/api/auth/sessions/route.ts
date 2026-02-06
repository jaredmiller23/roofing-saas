// =============================================
// User Sessions API Route
// =============================================
// Route: GET/DELETE /api/auth/sessions
// Purpose: List and manage user sessions
// =============================================

import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/with-auth'
import { getUserSessions, revokeSession, getRequestContext, parseUserAgent } from '@/lib/auth/sessions'
import { logger } from '@/lib/logger'
import { ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * GET /api/auth/sessions
 * Get all active sessions for the current user
 */
export const GET = withAuth(async (_request: NextRequest, { user }) => {
  try {
    const sessions = await getUserSessions(user.id)

    // Get current request context to identify current session
    const { ip, userAgent } = await getRequestContext()
    const currentParsed = parseUserAgent(userAgent)

    // Mark which session is "current" based on matching characteristics
    const sessionsWithCurrent = sessions.map(session => {
      // A session is likely current if IP and browser match
      const isCurrent = session.is_current ||
        (session.ip_address === ip &&
         session.browser === currentParsed.browser &&
         session.os === currentParsed.os)

      return {
        ...session,
        is_current: isCurrent,
      }
    })

    return successResponse({
      success: true,
      sessions: sessionsWithCurrent,
      count: sessions.length,
    })
  } catch (error) {
    logger.error('Error getting sessions:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/auth/sessions
 * Revoke a specific session by ID
 */
export const DELETE = withAuth(async (request: NextRequest, { user }) => {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('id')

    if (!sessionId) {
      throw ValidationError('Session ID is required')
    }

    // Verify the session belongs to the user
    const sessions = await getUserSessions(user.id)
    const targetSession = sessions.find(s => s.id === sessionId)

    if (!targetSession) {
      throw ValidationError('Session not found')
    }

    const success = await revokeSession(sessionId, 'user_action')

    if (!success) {
      throw InternalError('Failed to revoke session')
    }

    logger.info('Session revoked', { userId: user.id, sessionId })

    return successResponse({
      success: true,
      message: 'Session has been signed out',
    })
  } catch (error) {
    logger.error('Error revoking session:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
