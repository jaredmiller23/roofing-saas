import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * GET /api/activities
 * Fetch activities with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant')
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const projectId = searchParams.get('project_id')
    const contactId = searchParams.get('contact_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    // Build query
    let query = supabase
      .from('activities')
      .select(`
        id,
        activity_type,
        subject,
        notes,
        created_at,
        created_by,
        project_id,
        contact_id
      `)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }
    if (contactId) {
      query = query.eq('contact_id', contactId)
    }

    const { data: activities, error: fetchError } = await query

    if (fetchError) {
      logger.error('Error fetching activities', { error: fetchError })
      throw InternalError('Failed to fetch activities')
    }

    // Map to expected format (activity_type -> type for frontend compatibility)
    const mappedActivities = (activities || []).map(activity => ({
      ...activity,
      type: activity.activity_type, // Alias for frontend
    }))

    return successResponse({ activities: mappedActivities })
  } catch (error) {
    logger.error('Error in GET /api/activities', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
