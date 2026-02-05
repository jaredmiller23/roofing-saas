/**
 * Cron Job: Trial Nurture Emails
 *
 * Runs daily to send time-based and behavioral emails to trial tenants.
 * Complements the Stripe webhook trial-ending email (Day 11).
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/trial-nurture",
 *     "schedule": "0 14 * * *"
 *   }]
 * }
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { processTrialNurtureEmails } from '@/lib/trial-nurture/engine'
import { AuthenticationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === 'Bearer ' + cronSecret
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized trial-nurture cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('[TrialNurture] Cron job started')

  try {
    const result = await processTrialNurtureEmails()
    const duration = Date.now() - startTime

    logger.info('[TrialNurture] Cron job completed', {
      duration,
      tenantsProcessed: result.tenantsProcessed,
      emailsSent: result.emailsSent,
      errors: result.errors,
    })

    return successResponse({
      message: 'Trial nurture cron completed',
      ...result,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('[TrialNurture] Cron job failed', { error, duration })
    return errorResponse(error as Error)
  }
}

export async function POST(request: NextRequest) {
  return GET(request)
}
