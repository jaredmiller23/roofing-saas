import { withAuth } from '@/lib/auth/with-auth'
import {
  ValidationError,
  mapZodError,
} from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'
import { triggerWorkflow } from '@/lib/automation/engine'
import { type TriggerType } from '@/lib/automation/types'
import { z } from 'zod'

const triggerWorkflowSchema = z.object({
  trigger_type: z.string(),
  trigger_data: z.record(z.string(), z.any()),
})

/**
 * POST /api/workflows/trigger
 * Manually trigger workflows for testing
 */
export const POST = withAuth(async (request, { userId, tenantId }) => {
  const startTime = Date.now()

  try {
    logger.apiRequest('POST', '/api/workflows/trigger', { tenantId, userId })

    const body = await request.json()

    // Validate input
    const validatedData = triggerWorkflowSchema.safeParse(body)
    if (!validatedData.success) {
      throw mapZodError(validatedData.error)
    }

    const { trigger_type, trigger_data } = validatedData.data

    // Trigger workflows
    const executionIds = await triggerWorkflow(
      tenantId,
      trigger_type as TriggerType,
      trigger_data
    )

    if (executionIds.length === 0) {
      throw ValidationError('No workflows found for this trigger type', {
        trigger_type,
      })
    }

    const duration = Date.now() - startTime
    logger.apiResponse('POST', '/api/workflows/trigger', 200, duration)

    return successResponse({
      message: 'Workflows triggered successfully',
      execution_ids: executionIds,
      count: executionIds.length,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Trigger workflow error', { error, duration })
    return errorResponse(error as Error)
  }
})
