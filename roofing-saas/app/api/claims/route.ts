import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { ClaimData } from '@/lib/claims/types'

/**
 * GET /api/claims
 * Get all claims for current tenant (optionally filtered by project)
 *
 * Query params:
 * - project_id: Filter by project (optional)
 * - status: Filter by status (optional)
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

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')
    const status = searchParams.get('status')

    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('claims')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    // Apply filters
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      logger.error('Error fetching claims', { error })
      throw InternalError('Failed to fetch claims')
    }

    return successResponse({
      claims: (data || []) as ClaimData[],
      total: data?.length || 0,
    })
  } catch (error) {
    logger.error('Error in GET /api/claims', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
