/**
 * Cron Job: Process Campaign Step Executions
 *
 * Runs every 5 minutes to process pending campaign step executions.
 * This handles time-delayed steps, scheduled emails/SMS, task creation, etc.
 *
 * Configure in vercel.json with schedule: every 5 minutes
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { processPendingExecutions } from '@/lib/campaigns/execution-engine'
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
    logger.warn('[Campaign Cron] Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('[Campaign Cron] Starting campaign processing job')

  try {
    // Process all pending step executions
    const result = await processPendingExecutions()

    const duration = Date.now() - startTime

    logger.info('[Campaign Cron] Campaign processing job completed', {
      duration,
      ...result,
    })

    return successResponse({
      message: 'Campaign processing completed',
      stats: {
        processed: result.processed,
        succeeded: result.succeeded,
        failed: result.failed,
      },
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime

    logger.error('[Campaign Cron] Campaign processing job failed', {
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
