import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session'
import { logger } from '@/lib/logger'
import { AuthenticationError, AuthorizationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { DEFAULT_PIPELINE_STAGES } from '@/lib/pipeline/constants'

/**
 * GET /api/settings/pipeline-stages
 * Get all pipeline stages for tenant. Auto-seeds defaults if none exist.
 */
export async function GET() {
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

    const { data: initialStages, error: fetchError } = await supabase
      .from('pipeline_stages')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('stage_order', { ascending: true })

    if (fetchError) {
      throw InternalError(fetchError.message)
    }

    let stages = initialStages

    // Auto-seed default stages if none exist for this tenant
    if (!stages || stages.length === 0) {
      const seedData = DEFAULT_PIPELINE_STAGES.map(stage => ({
        tenant_id: tenantId,
        stage_key: stage.stage_key,
        name: stage.name,
        description: stage.description,
        color: stage.color,
        stage_order: stage.stage_order,
        stage_type: stage.stage_type,
        win_probability: stage.win_probability,
        is_active: true,
        is_default: true,
        created_by: user.id,
      }))

      const { data: seededStages, error: seedError } = await supabase
        .from('pipeline_stages')
        .insert(seedData)
        .select()

      if (seedError) {
        // Race condition: another request already seeded — re-fetch
        if (seedError.code === '23505') {
          const { data: existingStages } = await supabase
            .from('pipeline_stages')
            .select('*')
            .eq('tenant_id', tenantId)
            .order('stage_order', { ascending: true })

          return successResponse({ stages: existingStages || [] })
        }
        logger.error('Error seeding pipeline stages:', { error: seedError })
        throw InternalError(seedError.message)
      }

      stages = seededStages
    }

    return successResponse({ stages: stages || [] })
  } catch (error) {
    logger.error('Error fetching pipeline stages:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * POST /api/settings/pipeline-stages
 * Pipeline stages are fixed (tied to PostgreSQL enum). Use PATCH to customize.
 */
export async function POST() {
  return errorResponse(
    ValidationError('Pipeline stages are fixed. Use PATCH to customize existing stages.')
  )
}
