/**
 * Claims Sync API
 *
 * POST /api/claims/sync
 * Sync a project to the Claims Agent module.
 * Creates or updates a claim based on project data.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { syncProjectToClaims, gatherProjectSyncData } from '@/lib/claims/sync-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { project_id } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, claim_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // Sync to Claims Agent
    const result = await syncProjectToClaims(supabase, project_id)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }

    logger.info('Project synced to claims', {
      projectId: project_id,
      claimId: result.claim_id,
    })

    return NextResponse.json({
      success: true,
      claim_id: result.claim_id,
      claim_number: result.claim_number,
      status: result.status,
      message: result.error || 'Project synced successfully',
    })
  } catch (error) {
    logger.error('Claims sync API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/claims/sync?project_id={id}
 * Preview sync data without actually syncing
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = request.nextUrl.searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id parameter is required' },
        { status: 400 }
      )
    }

    // Gather sync data preview
    const syncData = await gatherProjectSyncData(supabase, projectId)

    if (!syncData) {
      return NextResponse.json(
        { error: 'Failed to gather project data' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      preview: syncData,
    })
  } catch (error) {
    logger.error('Claims sync preview API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
