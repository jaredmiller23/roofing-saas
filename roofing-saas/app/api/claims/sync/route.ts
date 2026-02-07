/**
 * Claims Sync API
 *
 * POST /api/claims/sync
 * Sync a project to the Claims Agent module.
 * Creates or updates a claim based on project data.
 */

import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { syncProjectToClaims, gatherProjectSyncData } from '@/lib/claims/sync-service'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const POST = withAuth(async (request, _auth) => {
  try {
    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const { project_id } = body

    if (!project_id) {
      throw ValidationError('project_id is required')
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, claim_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Sync to Claims Agent
    const result = await syncProjectToClaims(supabase, project_id)

    if (!result.success) {
      throw ValidationError(result.error || 'Sync failed')
    }

    logger.info('Project synced to claims', {
      projectId: project_id,
      claimId: result.claim_id,
    })

    return successResponse({
      success: true,
      claim_id: result.claim_id,
      claim_number: result.claim_number,
      status: result.status,
      message: result.error || 'Project synced successfully',
    })
  } catch (error) {
    logger.error('Claims sync API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * GET /api/claims/sync?project_id={id}
 * Preview sync data without actually syncing
 */
export const GET = withAuth(async (request, _auth) => {
  try {
    const supabase = await createClient()
    const projectId = request.nextUrl.searchParams.get('project_id')

    if (!projectId) {
      throw ValidationError('project_id parameter is required')
    }

    // Gather sync data preview
    const syncData = await gatherProjectSyncData(supabase, projectId)

    if (!syncData) {
      throw NotFoundError('Project data')
    }

    return successResponse({
      success: true,
      preview: syncData,
    })
  } catch (error) {
    logger.error('Claims sync preview API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
