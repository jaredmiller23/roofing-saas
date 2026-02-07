import { withAuth } from '@/lib/auth/with-auth'
import { executeWorkflowById } from '@/lib/automation/engine'
import { ValidationError, NotFoundError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'
import { logger } from '@/lib/logger'

export const POST = withAuth(async (request, { userId, tenantId }) => {
  try {
    const body = await request.json()
    const { workflow_id, trigger_data } = body

    if (!workflow_id || !trigger_data) {
      throw ValidationError('Missing required fields: workflow_id, trigger_data')
    }

    // Merge user context into trigger data
    const enrichedTriggerData = {
      ...trigger_data,
      user: { id: userId, ...trigger_data.user },
    }

    // Execute workflow using server-side persistent scheduler
    // This ensures delays survive restarts and scale-outs
    const executionId = await executeWorkflowById(
      workflow_id,
      tenantId,
      enrichedTriggerData
    )

    if (!executionId) {
      throw NotFoundError('Workflow not found or not active')
    }

    logger.info('Workflow execution started via API', {
      executionId,
      workflowId: workflow_id,
      userId,
    })

    return successResponse({
      execution_id: executionId,
      status: 'pending',
      message: 'Workflow execution started. Steps will be processed by the scheduler.',
    })
  } catch (error) {
    logger.error('Error executing workflow', {
      error: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error as Error)
  }
})

// Endpoint for manually triggering workflows
export const PUT = withAuth(async (request, { userId, tenantId }) => {
  try {
    const body = await request.json()
    const { workflow_id, manual_data } = body

    if (!workflow_id) {
      throw ValidationError('Missing required field: workflow_id')
    }

    // Merge user context into manual data
    const enrichedData = {
      ...(manual_data || {}),
      user: { id: userId },
      triggered_manually: true,
      triggered_at: new Date().toISOString(),
    }

    // Execute workflow using server-side persistent scheduler
    const executionId = await executeWorkflowById(
      workflow_id,
      tenantId,
      enrichedData
    )

    if (!executionId) {
      throw NotFoundError('Workflow not found or not active')
    }

    logger.info('Manual workflow execution started', {
      executionId,
      workflowId: workflow_id,
      userId,
    })

    return successResponse({
      execution_id: executionId,
      message: 'Manual workflow triggered successfully',
    })
  } catch (error) {
    logger.error('Error triggering manual workflow', {
      error: error instanceof Error ? error.message : String(error),
    })
    return errorResponse(error as Error)
  }
})
