import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { canStartProduction, getStatusForPipelineStage } from '@/lib/pipeline/validation'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import type { PipelineStage } from '@/lib/types/api'

export const dynamic = 'force-dynamic'

/**
 * POST /api/projects/[id]/start-production
 * Start production for a won project
 * - Validates project is in 'won' stage
 * - Creates initial production job
 * - Transitions project to 'production' stage
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw AuthenticationError()
    }

    const tenantId = await getUserTenantId(user.id)
    if (!tenantId) {
      throw AuthorizationError('No tenant found')
    }

    const supabase = await createClient()
    const resolvedParams = await params
    const projectId = resolvedParams.id

    // Parse optional body for job details
    let jobDetails: {
      job_type?: string
      scheduled_date?: string
      notes?: string
    } = {}

    try {
      jobDetails = await request.json()
    } catch {
      // Body is optional
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      throw ValidationError('Invalid project ID format')
    }

    // Fetch project with contact info
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        tenant_id,
        name,
        pipeline_stage,
        approved_value,
        estimated_value,
        contact_id,
        contact:contact_id (
          first_name,
          last_name,
          address_street,
          address_city,
          address_state,
          address_zip
        )
      `)
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project not found')
    }

    // Validate project is in 'won' stage
    const currentStage = project.pipeline_stage as PipelineStage
    if (!canStartProduction(currentStage)) {
      throw ValidationError(
        `Cannot start production. Project must be in 'Won' stage. Current stage: ${currentStage}`,
        { code: 'INVALID_STATE', current_stage: currentStage }
      )
    }

    // Generate job number (YY-####)
    const year = new Date().getFullYear().toString().slice(-2)
    const { count } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .like('job_number', `${year}-%`)

    const jobNumber = `${year}-${String((count || 0) + 1).padStart(4, '0')}`

    // Get contact data for job description
    const contact = project.contact as {
      first_name?: string
      last_name?: string
      address_street?: string
      address_city?: string
      address_state?: string
      address_zip?: string
    } | null

    const jobAddress = contact
      ? `${contact.address_street || ''}, ${contact.address_city || ''} ${contact.address_state || ''} ${contact.address_zip || ''}`.trim().replace(/^,\s*/, '')
      : ''

    // Create production job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        tenant_id: tenantId,
        project_id: projectId,
        job_number: jobNumber,
        job_type: jobDetails.job_type || 'roof_replacement',
        status: 'scheduled',
        scheduled_date: jobDetails.scheduled_date || null,
        description: `Production job for ${project.name}`,
        work_address: jobAddress,
        material_cost: 0,
        labor_cost: 0,
        equipment_cost: 0,
        other_costs: 0,
        completion_percentage: 0,
        notes: jobDetails.notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (jobError) {
      logger.error('[API] Error creating job:', { error: jobError })
      throw InternalError('Failed to create production job')
    }

    // Update project to 'production' stage with auto-synced status
    const productionStatus = getStatusForPipelineStage('production')
    const { data: updatedProject, error: updateError } = await supabase
      .from('projects')
      .update({
        pipeline_stage: 'production',
        status: productionStatus,
        actual_start: new Date().toISOString().split('T')[0], // Set actual start date
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (updateError) {
      logger.error('[API] Error updating project:', { error: updateError })
      // Job was created but project update failed - log but still return job
    }

    return successResponse({
      message: 'Production started successfully',
      job: job,
      project: updatedProject || project,
      job_number: jobNumber,
    })
  } catch (error) {
    logger.error('[API] Start production error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}
