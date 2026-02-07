import { createClient } from '@/lib/supabase/server'
import { withAuth } from '@/lib/auth/with-auth'
import { logger } from '@/lib/logger'
import { InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

/**
 * Projects Filters API
 * GET /api/projects/filters - Get available filter options
 */

export const GET = withAuth(async (_request, { tenantId }) => {
  try {
    const supabase = await createClient()

    // Fetch all projects to extract unique filter values
    const { data: projects, error } = await supabase
      .from('projects')
      .select('custom_fields')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .neq('custom_fields->>proline_pipeline', 'OLD RECRUITING') // Exclude HR data

    if (error) {
      logger.error('Filters fetch error:', { error })
      throw InternalError(error.message)
    }

    // Extract unique values
    const pipelinesSet = new Set<string>()
    const stagesSet = new Set<string>()
    const assigneesSet = new Set<string>()

    projects?.forEach((project) => {
      const customFields = project.custom_fields as Record<string, unknown> | null

      if (customFields?.proline_pipeline) {
        pipelinesSet.add(customFields.proline_pipeline as string)
      }
      if (customFields?.proline_stage) {
        stagesSet.add(customFields.proline_stage as string)
      }
      if (customFields?.assigned_to) {
        assigneesSet.add(customFields.assigned_to as string)
      }
    })

    // Convert to sorted arrays
    const pipelines = Array.from(pipelinesSet).sort()
    const stages = Array.from(stagesSet).sort()
    const assignees = Array.from(assigneesSet).sort()

    return successResponse({
      pipelines,
      stages,
      assignees,
    })
  } catch (error) {
    logger.error('Filters API error:', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
})
