/**
 * Cron Job: Consolidated Daily Tasks
 *
 * Runs all daily cron jobs in sequence to stay within Vercel Hobby plan's
 * 2 cron job limit. Each task runs independently - failures don't block others.
 *
 * Tasks executed:
 * 1. Signature reminders - 9 AM style (documents expiring soon)
 * 2. Campaign processing - 8 AM style (pending step executions)
 * 3. Billing checks - 10 AM style (trials, grace periods, downgrades)
 * 4. Storm monitoring - polls NWS for severe weather alerts
 * 5. DNC sync monitoring - FTC 31-day registry sync compliance
 * 6. Opt-out monitoring - TCPA 10-business-day deadline tracking
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/daily-tasks",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 */

import { NextRequest } from 'next/server'
import { logger } from '@/lib/logger'
import { AuthenticationError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

// Import the handlers from individual cron endpoints
import { GET as signatureRemindersHandler } from '@/app/api/cron/signature-reminders/route'
import { GET as processCampaignsHandler } from '@/app/api/cron/process-campaigns/route'
import { GET as billingCheckHandler } from '@/app/api/cron/billing-check/route'
import { GET as stormMonitorHandler } from '@/app/api/cron/storm-monitor/route'
import { GET as dncSyncHandler } from '@/app/api/cron/dnc-sync/route'
import { GET as optOutMonitorHandler } from '@/app/api/cron/opt-out-monitor/route'

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

interface TaskResult {
  task: string
  success: boolean
  duration: number
  result?: unknown
  error?: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('[Daily Tasks] Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('[Daily Tasks] Starting consolidated daily tasks')

  const results: TaskResult[] = []

  // Task 1: Signature Reminders
  const signatureStart = Date.now()
  try {
    logger.info('[Daily Tasks] Running signature reminders...')
    const response = await signatureRemindersHandler(request)
    const data = await response.json()
    results.push({
      task: 'signature_reminders',
      success: response.ok,
      duration: Date.now() - signatureStart,
      result: data,
    })
    logger.info('[Daily Tasks] Signature reminders completed', { duration: Date.now() - signatureStart })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.push({
      task: 'signature_reminders',
      success: false,
      duration: Date.now() - signatureStart,
      error: errorMessage,
    })
    logger.error('[Daily Tasks] Signature reminders failed', { error: errorMessage })
  }

  // Task 2: Campaign Processing
  const campaignStart = Date.now()
  try {
    logger.info('[Daily Tasks] Running campaign processing...')
    const response = await processCampaignsHandler(request)
    const data = await response.json()
    results.push({
      task: 'process_campaigns',
      success: response.ok,
      duration: Date.now() - campaignStart,
      result: data,
    })
    logger.info('[Daily Tasks] Campaign processing completed', { duration: Date.now() - campaignStart })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.push({
      task: 'process_campaigns',
      success: false,
      duration: Date.now() - campaignStart,
      error: errorMessage,
    })
    logger.error('[Daily Tasks] Campaign processing failed', { error: errorMessage })
  }

  // Task 3: Billing Check
  const billingStart = Date.now()
  try {
    logger.info('[Daily Tasks] Running billing check...')
    const response = await billingCheckHandler(request)
    const data = await response.json()
    results.push({
      task: 'billing_check',
      success: response.ok,
      duration: Date.now() - billingStart,
      result: data,
    })
    logger.info('[Daily Tasks] Billing check completed', { duration: Date.now() - billingStart })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.push({
      task: 'billing_check',
      success: false,
      duration: Date.now() - billingStart,
      error: errorMessage,
    })
    logger.error('[Daily Tasks] Billing check failed', { error: errorMessage })
  }

  // Task 4: Storm Monitoring
  const stormStart = Date.now()
  try {
    logger.info('[Daily Tasks] Running storm monitor...')
    const response = await stormMonitorHandler(request)
    const data = await response.json()
    results.push({
      task: 'storm_monitor',
      success: response.ok,
      duration: Date.now() - stormStart,
      result: data,
    })
    logger.info('[Daily Tasks] Storm monitor completed', { duration: Date.now() - stormStart })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.push({
      task: 'storm_monitor',
      success: false,
      duration: Date.now() - stormStart,
      error: errorMessage,
    })
    logger.error('[Daily Tasks] Storm monitor failed', { error: errorMessage })
  }

  // Task 5: DNC Sync Monitor
  const dncStart = Date.now()
  try {
    logger.info('[Daily Tasks] Running DNC sync monitor...')
    const response = await dncSyncHandler(request)
    const data = await response.json()
    results.push({
      task: 'dnc_sync',
      success: response.ok,
      duration: Date.now() - dncStart,
      result: data,
    })
    logger.info('[Daily Tasks] DNC sync monitor completed', { duration: Date.now() - dncStart })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.push({
      task: 'dnc_sync',
      success: false,
      duration: Date.now() - dncStart,
      error: errorMessage,
    })
    logger.error('[Daily Tasks] DNC sync monitor failed', { error: errorMessage })
  }

  // Task 6: Opt-Out Monitor
  const optOutStart = Date.now()
  try {
    logger.info('[Daily Tasks] Running opt-out monitor...')
    const response = await optOutMonitorHandler(request)
    const data = await response.json()
    results.push({
      task: 'opt_out_monitor',
      success: response.ok,
      duration: Date.now() - optOutStart,
      result: data,
    })
    logger.info('[Daily Tasks] Opt-out monitor completed', { duration: Date.now() - optOutStart })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    results.push({
      task: 'opt_out_monitor',
      success: false,
      duration: Date.now() - optOutStart,
      error: errorMessage,
    })
    logger.error('[Daily Tasks] Opt-out monitor failed', { error: errorMessage })
  }

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length

  logger.info('[Daily Tasks] All daily tasks completed', {
    totalDuration,
    successCount,
    failureCount,
  })

  return successResponse({
    message: `Daily tasks completed: ${successCount} succeeded, ${failureCount} failed`,
    results,
    totalDuration,
  })
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
