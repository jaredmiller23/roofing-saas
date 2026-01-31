/**
 * Cron Job: Opt-Out Deadline Monitor
 *
 * Runs daily to monitor opt-out processing deadlines per April 2025 TCPA rules.
 *
 * TCPA Requirements:
 * - Opt-out must be honored within 10 BUSINESS DAYS
 * - Creates admin alerts for approaching/overdue deadlines
 * - Updates queue entries to 'overdue' status when deadline passes
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/opt-out-monitor",
 *     "schedule": "0 8 * * *"
 *   }]
 * }
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
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

interface OptOutQueueEntry {
  id: string
  tenant_id: string
  contact_id: string
  phone_number: string
  opt_out_type: string
  opt_out_source: string
  opt_out_requested_at: string
  deadline: string
  follow_up_sent_at: string | null
  status: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('Starting opt-out monitor cron job')

  // Use service role client for cross-tenant access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase service role not configured')
    return errorResponse(InternalError('Server configuration error'))
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = new Date()
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

  try {
    // Find all pending opt-outs
    const { data: rawEntries, error: fetchError } = await supabase
      .from('call_opt_out_queue')
      .select('*')
      .in('status', ['pending', 'follow_up_sent'])
      .order('deadline', { ascending: true })

    if (fetchError) {
      logger.error('Error fetching opt-out queue', { error: fetchError })
      return errorResponse(InternalError('Database error'))
    }

    const entries = (rawEntries || []) as OptOutQueueEntry[]

    const stats = {
      processed: 0,
      overdue: 0,
      approaching: 0,
      ok: 0,
      alertsCreated: 0,
      errors: 0,
    }

    const results: Array<{ entryId: string; status: string; action?: string; error?: string }> = []

    // Process each entry
    for (const entry of entries) {
      stats.processed++

      const deadline = new Date(entry.deadline)

      if (deadline < now) {
        // Deadline has passed
        stats.overdue++

        // Update status to overdue
        const { error: updateError } = await supabase
          .from('call_opt_out_queue')
          .update({ status: 'overdue' })
          .eq('id', entry.id)

        if (updateError) {
          logger.error('Error updating opt-out to overdue', {
            entryId: entry.id,
            error: updateError,
          })
          stats.errors++
          results.push({
            entryId: entry.id,
            status: 'error',
            error: updateError.message,
          })
          continue
        }

        // Create critical alert for overdue
        const { error: alertError } = await supabase.from('admin_alerts').insert({
          tenant_id: entry.tenant_id,
          alert_type: 'compliance_violation',
          severity: 'critical',
          title: 'TCPA Opt-Out Deadline OVERDUE',
          message: `Opt-out request for ${entry.phone_number} has passed its 10-business-day deadline. Immediate action required to prevent TCPA violation.`,
          metadata: {
            queue_id: entry.id,
            contact_id: entry.contact_id,
            phone_number: entry.phone_number,
            deadline: entry.deadline,
            days_overdue: Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24)),
          },
        })

        if (alertError) {
          logger.error('Error creating overdue alert', { error: alertError })
        } else {
          stats.alertsCreated++
        }

        // Log to compliance audit
        await supabase.from('call_compliance_log').insert({
          tenant_id: entry.tenant_id,
          contact_id: entry.contact_id,
          phone_number: entry.phone_number,
          compliance_check_type: 'opt_out_check',
          check_result: 'blocked',
          check_details: {
            action: 'opt_out_deadline_overdue',
            queue_id: entry.id,
            deadline: entry.deadline,
            detected_at: now.toISOString(),
          },
        })

        logger.warn('Opt-out deadline OVERDUE', {
          entryId: entry.id,
          tenantId: entry.tenant_id,
          phoneNumber: entry.phone_number,
          deadline: entry.deadline,
        })

        results.push({
          entryId: entry.id,
          status: 'overdue',
          action: 'marked_overdue_alert_created',
        })
      } else if (deadline < twoDaysFromNow) {
        // Deadline approaching (within 2 days)
        stats.approaching++

        // Create warning alert
        const daysRemaining = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )

        const { error: alertError } = await supabase.from('admin_alerts').insert({
          tenant_id: entry.tenant_id,
          alert_type: 'compliance_warning',
          severity: 'warning',
          title: 'TCPA Opt-Out Deadline Approaching',
          message: `Opt-out request for ${entry.phone_number} must be fully processed within ${daysRemaining} day(s) to meet TCPA 10-business-day requirement.`,
          metadata: {
            queue_id: entry.id,
            contact_id: entry.contact_id,
            phone_number: entry.phone_number,
            deadline: entry.deadline,
            days_remaining: daysRemaining,
          },
        })

        if (alertError) {
          logger.error('Error creating approaching alert', { error: alertError })
        } else {
          stats.alertsCreated++
        }

        logger.info('Opt-out deadline approaching', {
          entryId: entry.id,
          tenantId: entry.tenant_id,
          phoneNumber: entry.phone_number,
          deadline: entry.deadline,
          daysRemaining,
        })

        results.push({
          entryId: entry.id,
          status: 'approaching',
          action: 'alert_created',
        })
      } else {
        // Deadline OK (more than 2 days away)
        stats.ok++

        results.push({
          entryId: entry.id,
          status: 'ok',
        })
      }
    }

    const duration = Date.now() - startTime

    logger.info('Opt-out monitor cron job completed', {
      duration,
      stats,
    })

    return successResponse({
      message: 'Opt-out monitor cron completed',
      stats,
      results,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Opt-out monitor cron job failed', { error, duration })
    return errorResponse(error as Error)
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
