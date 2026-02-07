import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withAuthParams, type AuthContext } from '@/lib/auth/with-auth'
import {
  validateCompleteTransitionAsync,
  getStatusForPipelineStage,
  requiresPerfectPacketValidation,
} from '@/lib/pipeline/validation'
import { triggerWorkflow } from '@/lib/automation/engine'
import { handleStageChange } from '@/lib/campaigns/trigger-handler'
import { checkPermission } from '@/lib/auth/check-permission'
import { logger } from '@/lib/logger'
import { ApiError, ErrorCode, AuthenticationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { PipelineStage } from '@/lib/types/api'
import { getAuditContext, auditedUpdate, auditedDelete } from '@/lib/audit/audit-middleware'

export const dynamic = 'force-dynamic'

/**
 * GET /api/projects/[id]
 * Fetch a single project by ID
 */
export const GET = withAuthParams(async (
  _request: NextRequest,
  { tenantId }: AuthContext,
  { params }
) => {
  try {
    const supabase = await createClient()
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      throw ValidationError('Project ID is required')
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      throw ValidationError('Invalid project ID format')
    }

    // Fetch project with contact details
    const { data: project, error: fetchError } = await supabase
      .from('projects')
      .select(`
        id,
        tenant_id,
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
      logger.error('Error fetching project', { error: fetchError })
      throw NotFoundError('Project')
    }

    return successResponse(project)
  } catch (error) {
    logger.error('Error in GET /api/projects/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * PATCH /api/projects/[id]
 * Update a project's details (including pipeline_stage)
 * Includes validation for pipeline stage transitions
 */
export const PATCH = withAuthParams(async (
  request: NextRequest,
  { user, tenantId }: AuthContext,
  { params }
) => {
  try {
    // Get audit context for logging - pass pre-fetched auth to avoid duplicate calls
    const auditContext = await getAuditContext(request, { user, tenantId })
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    const body = await request.json()

    // Await params Promise to get the id
    const resolvedParams = await params
    const id = resolvedParams.id

    if (!id) {
      throw ValidationError('Project ID is required')
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(id)) {
      throw ValidationError('Invalid project ID format')
    }

    // Update project with audit logging
    const updatedProject = await auditedUpdate(
      'project',
      id,
      async (beforeValues) => {
        const supabase = await createClient()

        // Extract existing project values from beforeValues
        const existingProject = beforeValues

        // Field allowlisting — only permit known mutable fields
        const ALLOWED_FIELDS = [
          'name', 'description', 'scope_of_work', 'status', 'substatus', 'pipeline_stage', 'type', 'priority',
          'estimated_value', 'approved_value', 'final_value', 'profit_margin',
          'estimated_start', 'actual_start', 'actual_completion', 'estimated_close_date',
          'custom_fields', 'lead_source', 'lead_score',
          'contact_id', 'adjuster_contact_id',
        ]
        const updateData: Record<string, unknown> = {}
        for (const key of ALLOWED_FIELDS) {
          if (key in body) {
            updateData[key] = body[key]
          }
        }

        // Pipeline stage transition validation
        if (body.pipeline_stage && body.pipeline_stage !== existingProject.pipeline_stage) {
          const currentStage = existingProject.pipeline_stage as PipelineStage
          const newStage = body.pipeline_stage as PipelineStage

          // Combine existing and new values for validation
          const projectForValidation = {
            estimated_value: body.estimated_value ?? existingProject.estimated_value,
            approved_value: body.approved_value ?? existingProject.approved_value,
          }

          // Validate the transition (includes Perfect Packet validation for won -> production)
          const validation = await validateCompleteTransitionAsync(
            currentStage,
            newStage,
            projectForValidation,
            id,
            supabase,
            { skipPerfectPacket: body.skipPerfectPacket === true }
          )

          if (!validation.valid) {
            // Include Perfect Packet details in error response if applicable
            const errorDetails: Record<string, unknown> = {
              code: requiresPerfectPacketValidation(currentStage, newStage)
                ? 'PERFECT_PACKET_INCOMPLETE'
                : 'INVALID_STAGE_TRANSITION',
              current_stage: currentStage,
              requested_stage: newStage,
            }

            if (validation.perfectPacketResult) {
              errorDetails.perfectPacket = {
                missing: validation.perfectPacketResult.missing.map(r => ({
                  category: r.category,
                  label: r.label,
                })),
                present: validation.perfectPacketResult.present.map(r => ({
                  category: r.category,
                  label: r.label,
                })),
              }
            }

            throw ValidationError(validation.error || 'Invalid stage transition', errorDetails)
          }

          // Auto-sync status based on pipeline stage
          const autoStatus = getStatusForPipelineStage(newStage)
          updateData.status = autoStatus
          updateData.stage_changed_at = new Date().toISOString()
        }

        // Update the project with provided fields (use updateData which may include auto-synced status)
        const { data: result, error: updateError } = await supabase
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
            substatus,
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
          logger.error('Error updating project', { error: updateError })
          throw InternalError('Failed to update project')
        }

        // Trigger workflow automation if pipeline stage changed
        if (body.pipeline_stage && body.pipeline_stage !== existingProject.pipeline_stage) {
          const previousStage = existingProject.pipeline_stage as PipelineStage
          const newStage = body.pipeline_stage as PipelineStage

          const triggerData = {
            project_id: id,
            project_name: result?.name,
            previous_stage: previousStage,
            new_stage: newStage,
            contact_id: result?.contact_id,
            estimated_value: result?.estimated_value,
            approved_value: result?.approved_value,
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

          // Fire campaign triggers for stage changes (async - don't block response)
          handleStageChange({
            tenantId,
            projectId: id,
            contactId: result?.contact_id || null,
            fromStage: previousStage,
            toStage: newStage,
            changedBy: user.id,
            changedAt: new Date().toISOString(),
          }).catch((error) => {
            logger.error('[API] Campaign trigger (stage_change) failed:', { error })
          })
        }

        return result
      },
      auditContext,
      {
        operation: 'project_update',
        source: 'api',
        updated_fields: Object.keys(body),
        pipeline_stage_change: body.pipeline_stage ? {
          from: null, // Will be set by audit middleware
          to: body.pipeline_stage
        } : undefined
      }
    )

    return successResponse(updatedProject)
  } catch (error) {
    logger.error('Error in PATCH /api/projects/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})

/**
 * DELETE /api/projects/[id]
 * Soft delete a project
 */
export const DELETE = withAuthParams(async (
  request: NextRequest,
  { user, userId, tenantId }: AuthContext,
  { params }
) => {
  try {
    const canDelete = await checkPermission(userId, 'projects', 'delete')
    if (!canDelete) {
      return errorResponse(new ApiError(ErrorCode.INSUFFICIENT_PERMISSIONS, 'You do not have permission to delete projects', 403))
    }

    // Get audit context for logging - pass pre-fetched auth to avoid duplicate calls
    const auditContext = await getAuditContext(request, { user, tenantId })
    if (!auditContext) {
      throw AuthenticationError('Failed to get audit context')
    }

    const { id } = await params

    // Delete project with audit logging
    const result = await auditedDelete(
      'project',
      id,
      async (_beforeValues) => {
        const supabase = await createClient()

        // Soft delete
        const { error } = await supabase
          .from('projects')
          .update({ is_deleted: true })
          .eq('id', id)
          .eq('tenant_id', tenantId)

        if (error) {
          logger.error('Error deleting project', { error })
          throw InternalError('Failed to delete project')
        }

        return { success: true }
      },
      auditContext,
      {
        operation: 'project_delete',
        source: 'api',
        delete_type: 'soft'
      }
    )

    return successResponse(result)
  } catch (error) {
    logger.error('Error in DELETE /api/projects/:id', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
