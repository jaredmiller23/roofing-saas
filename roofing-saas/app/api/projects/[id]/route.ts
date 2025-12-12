import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import {
  validateCompleteTransition,
  getStatusForPipelineStage,
} from '@/lib/pipeline/validation'
import { triggerWorkflow } from '@/lib/automation/engine'
import { logger } from '@/lib/logger'
import type { PipelineStage } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/[id]
 * Fetch a single project by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const supabase = await createClient()
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Fetch project with contact details
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select(`
        id,
        name,
        project_number,
        contact_id,
        status,
        type,
        estimated_value,
        approved_value,
        final_value,
        profit_margin,
        created_at,
        updated_at,
        created_by,
        description,
        scope_of_work,
        custom_fields,
        pipeline_stage,
        stage_changed_at,
        lead_source,
        priority,
        lead_score,
        estimated_start,
        actual_start,
        actual_completion,
        estimated_close_date,
        adjuster_contact_id,
        contact:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone,
          address_street,
          address_city,
          address_state,
          address_zip
        ),
        adjuster:adjuster_contact_id (
          id,
          first_name,
          last_name,
          company,
          phone,
          email
        )
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !project) {
      logger.error('[API] Error fetching project:', { error: fetchError })
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ project })
  } catch (error) {
    logger.error('[API] Projects GET error:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/projects/[id]
 * Update a project's details (including pipeline_stage)
 * Includes validation for pipeline stage transitions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Await params Promise to get the id
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: 'Invalid project ID format' },
        { status: 400 }
      )
    }

    // Fetch full project data for validation (need current stage and values)
    const { data: existingProject, error: fetchError } = await supabase
      .from('projects')
      .select('id, pipeline_stage, estimated_value, approved_value, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (fetchError || !existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: Record<string, unknown> = { ...body }

    // Pipeline stage transition validation
    if (body.pipeline_stage && body.pipeline_stage !== existingProject.pipeline_stage) {
      const currentStage = existingProject.pipeline_stage as PipelineStage
      const newStage = body.pipeline_stage as PipelineStage

      // Combine existing and new values for validation
      const projectForValidation = {
        estimated_value: body.estimated_value ?? existingProject.estimated_value,
        approved_value: body.approved_value ?? existingProject.approved_value,
      }

      // Validate the transition
      const validation = validateCompleteTransition(currentStage, newStage, projectForValidation)
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: validation.error,
            code: 'INVALID_STAGE_TRANSITION',
            current_stage: currentStage,
            requested_stage: newStage,
          },
          { status: 400 }
        )
      }

      // Auto-sync status based on pipeline stage
      const autoStatus = getStatusForPipelineStage(newStage)
      updateData.status = autoStatus
    }

    // Update the project with provided fields (use updateData which may include auto-synced status)
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select(`
        id,
        name,
        project_number,
        contact_id,
        status,
        type,
        estimated_value,
        approved_value,
        final_value,
        created_at,
        updated_at,
        created_by,
        description,
        custom_fields,
        pipeline_stage,
        stage_changed_at,
        lead_source,
        priority,
        lead_score,
        estimated_close_date,
        adjuster_contact_id,
        contact:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        adjuster:adjuster_contact_id (
          id,
          first_name,
          last_name,
          company,
          phone,
          email
        )
      `)
      .single()

    if (updateError) {
      logger.error('[API] Error updating project:', { error: updateError })
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      )
    }

    // Trigger workflow automation if pipeline stage changed
    if (body.pipeline_stage && body.pipeline_stage !== existingProject.pipeline_stage) {
      const previousStage = existingProject.pipeline_stage as PipelineStage
      const newStage = body.pipeline_stage as PipelineStage

      const triggerData = {
        project_id: id,
        project_name: updatedProject?.name,
        previous_stage: previousStage,
        new_stage: newStage,
        contact_id: updatedProject?.contact_id,
        estimated_value: updatedProject?.estimated_value,
        approved_value: updatedProject?.approved_value,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
      }

      // Fire general stage change workflow (async - don't block response)
      triggerWorkflow(tenantId, 'pipeline_stage_changed', triggerData).catch((error) => {
        logger.error('[API] Workflow trigger (pipeline_stage_changed) failed:', { error })
      })

      // Fire specific 'project_won' trigger when moving to won stage
      if (newStage === 'won') {
        triggerWorkflow(tenantId, 'project_won', triggerData).catch((error) => {
          logger.error('[API] Workflow trigger (project_won) failed:', { error })
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedProject,
    })
  } catch (error) {
    logger.error('[API] Projects PATCH error:', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
