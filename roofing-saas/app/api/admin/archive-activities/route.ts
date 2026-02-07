import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { isAdmin } from '@/lib/auth/session'
import { AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/archive-activities
 * Archives soft-deleted activities older than 1 year
 * Admin/owner-only endpoint for database maintenance
 */
export const POST = withAuth(async (request: NextRequest, { user, tenantId }) => {
  const startTime = Date.now()

  try {
    // Check if user is admin or owner
    const userIsAdmin = await isAdmin(user.id)
    if (!userIsAdmin) {
      throw AuthorizationError('Admin or owner access required')
    }

    logger.apiRequest('POST', '/api/admin/archive-activities', { tenantId, userId: user.id })

    // Use admin client since we're calling a SECURITY DEFINER function
    // that needs to bypass RLS for cross-tenant archival operations
    const supabase = await createAdminClient()

    // Call the archive function
    // Note: Type assertion needed until database types are regenerated
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)('archive_old_activities') as { data: number | null, error: { message: string } | null }

    if (error) {
      logger.error('Activity archival error', { error, tenantId, userId: user.id })
      throw InternalError('Failed to archive activities')
    }

    const archived_count = data ?? 0
    const duration = Date.now() - startTime

    logger.apiResponse('POST', '/api/admin/archive-activities', 200, duration)
    logger.info('Activities archived', {
      userId: user.id,
      tenantId,
      archived_count,
      duration
    })

    return successResponse({
      success: true,
      archived_count
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Archive activities API error', { error, duration })
    return errorResponse(error as Error)
  }
})
