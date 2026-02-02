/**
 * Cron Job: Process Workflow Step Executions
 *
 * Runs every minute to process pending workflow step executions.
 * Replaces setTimeout-based delays with persistent database scheduling.
 *
 * Configure in vercel.json with schedule: every minute
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { processPendingWorkflowExecutions } from '@/lib/automation/workflow-scheduler'
import { AuthenticationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

// Verify cron secret for security
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // If no secret is configured, only allow in development
  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === 'Bearer ' + cronSecret
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('[Workflow Cron] Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  try {
    // Process all pending workflow step executions
    const result = await processPendingWorkflowExecutions()

    const duration = Date.now() - startTime

    // Only log if there was work to do (reduce noise)
    if (result.processed > 0) {
      logger.info('[Workflow Cron] Processing completed', {
        duration,
        ...result,
      })
    }

    return successResponse({
      message: 'Workflow processing completed',
      stats: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('[Workflow Cron] Processing failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
    })

    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
