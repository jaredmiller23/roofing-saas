/**
 * Perfect Packet Status API
 *
 * GET /api/projects/[id]/perfect-packet - Check packet completion status
 *
 * Returns which of the 4 required document categories are present/missing:
 * 1. Photos of home/damage
 * 2. Measurement report
 * 3. Insurance estimate
 * 4. Job submission form
 */

import { createClient } from '@/lib/supabase/server'
import { withAuthParams } from '@/lib/auth/with-auth'
import {
  validatePerfectPacket,
  PERFECT_PACKET_REQUIREMENTS,
} from '@/lib/pipeline/validation'
import { logger } from '@/lib/logger'
import { ValidationError, NotFoundError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * GET - Check Perfect Packet completion status for a project
 */
export const GET = withAuthParams(async (_request, { tenantId }, { params }) => {
  try {
    const { id: projectId } = await params
    const supabase = await createClient()

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(projectId)) {
      throw ValidationError('Invalid project ID format')
    }

    // Verify project exists and user has access
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, name, pipeline_stage')
      .eq('id', projectId)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .single()

    if (projectError || !project) {
      throw NotFoundError('Project')
    }

    // Validate Perfect Packet
    const result = await validatePerfectPacket(projectId, supabase)

    // Build detailed response
    const response = {
      projectId,
      projectName: project.name,
      pipelineStage: project.pipeline_stage,
      isComplete: result.isComplete,
      requirements: PERFECT_PACKET_REQUIREMENTS.map(req => ({
        category: req.category,
        label: req.label,
        description: req.description,
        isPresent: result.present.some(p => p.category === req.category),
        fileCount: result.fileCounts[req.category] || 0,
      })),
      summary: {
        total: PERFECT_PACKET_REQUIREMENTS.length,
        complete: result.present.length,
        missing: result.missing.length,
        missingItems: result.missing.map(r => r.label),
      },
    }

    return successResponse(response)
  } catch (error) {
    logger.error('[API] Perfect Packet status error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
