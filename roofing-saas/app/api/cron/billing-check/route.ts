/**
 * Cron Job: Billing Expiration Checks
 *
 * Runs daily to process billing-related expirations:
 * 1. Trials that have ended - start grace period
 * 2. Grace periods ending soon - send warning emails
 * 3. Grace periods that have expired - downgrade to Starter
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/billing-check",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
import {
  startGracePeriod,
  sendGracePeriodEndingEmail,
  downgradeToStarter,
} from '@/lib/billing/grace-period'
import { AuthenticationError } from '@/lib/api/errors'
import { errorResponse } from '@/lib/api/response'

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

interface TrialEndingSubscription {
  id: string
  tenant_id: string
  status: string
  trial_ends_at: string
}

interface TenantWithGracePeriod {
  id: string
  name: string
  grace_period_ends_at: string
  subscription_tier: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized billing-check cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('Starting billing check cron job')

  // Use service role client for cross-tenant access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase service role not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const stats = {
    trialsEnded: 0,
    gracePeriodsWarned: 0,
    gracePeriodsExpired: 0,
    errors: 0,
  }

  const results: Array<{ tenantId: string; action: string; status: string; error?: string }> = []

  try {
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const threeDaysFromNow = new Date(now)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

    // ==========================================================================
    // 1. Find trials that ended today (status is still 'trialing' but trial_ends_at is past)
    // ==========================================================================
    const { data: endedTrials, error: trialsError } = await supabase
      .from('subscriptions')
      .select('id, tenant_id, status, trial_ends_at')
      .eq('status', 'trialing')
      .lt('trial_ends_at', now.toISOString())
      .eq('is_deleted', false)

    if (trialsError) {
      logger.error('Error fetching ended trials', { error: trialsError })
      stats.errors++
    } else {
      const trials = (endedTrials || []) as unknown as TrialEndingSubscription[]

      for (const trial of trials) {
        try {
          // Start grace period for this tenant
          await startGracePeriod(trial.tenant_id, 'trial_ended')

          // Update subscription status
          await supabase
            .from('subscriptions')
            .update({ status: 'past_due' })
            .eq('id', trial.id)

          stats.trialsEnded++
          results.push({
            tenantId: trial.tenant_id,
            action: 'trial_ended',
            status: 'success',
          })

          logger.info('Started grace period for ended trial', {
            tenantId: trial.tenant_id,
            subscriptionId: trial.id,
          })
        } catch (error) {
          stats.errors++
          results.push({
            tenantId: trial.tenant_id,
            action: 'trial_ended',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          logger.error('Error processing ended trial', {
            tenantId: trial.tenant_id,
            error,
          })
        }
      }
    }

    // ==========================================================================
    // 2. Find grace periods ending in 3 days - send warning emails
    // ==========================================================================
    const threeDaysStart = new Date(threeDaysFromNow)
    threeDaysStart.setHours(0, 0, 0, 0)

    const threeDaysEnd = new Date(threeDaysStart)
    threeDaysEnd.setDate(threeDaysEnd.getDate() + 1)

    const { data: expiringGracePeriods, error: expiringError } = await supabase
      .from('tenants')
      .select('id, name, grace_period_ends_at, subscription_tier')
      .gte('grace_period_ends_at', threeDaysStart.toISOString())
      .lt('grace_period_ends_at', threeDaysEnd.toISOString())

    if (expiringError) {
      logger.error('Error fetching expiring grace periods', { error: expiringError })
      stats.errors++
    } else {
      const expiring = (expiringGracePeriods || []) as unknown as TenantWithGracePeriod[]

      for (const tenant of expiring) {
        try {
          // Determine reason from subscription events (simplified - assume trial_ended)
          const reason = 'trial_ended' as const

          await sendGracePeriodEndingEmail(tenant.id, 3, reason)

          stats.gracePeriodsWarned++
          results.push({
            tenantId: tenant.id,
            action: 'grace_period_warning',
            status: 'success',
          })

          logger.info('Sent grace period ending warning', {
            tenantId: tenant.id,
            daysRemaining: 3,
          })
        } catch (error) {
          stats.errors++
          results.push({
            tenantId: tenant.id,
            action: 'grace_period_warning',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          logger.error('Error sending grace period warning', {
            tenantId: tenant.id,
            error,
          })
        }
      }
    }

    // ==========================================================================
    // 3. Find grace periods that have expired - downgrade to Starter
    // ==========================================================================
    const { data: expiredGracePeriods, error: expiredError } = await supabase
      .from('tenants')
      .select('id, name, grace_period_ends_at, subscription_tier')
      .lt('grace_period_ends_at', now.toISOString())
      .neq('subscription_tier', 'starter')

    if (expiredError) {
      logger.error('Error fetching expired grace periods', { error: expiredError })
      stats.errors++
    } else {
      const expired = (expiredGracePeriods || []) as unknown as TenantWithGracePeriod[]

      for (const tenant of expired) {
        try {
          await downgradeToStarter(tenant.id)

          stats.gracePeriodsExpired++
          results.push({
            tenantId: tenant.id,
            action: 'downgraded',
            status: 'success',
          })

          logger.info('Downgraded tenant after grace period expired', {
            tenantId: tenant.id,
            previousTier: tenant.subscription_tier,
          })
        } catch (error) {
          stats.errors++
          results.push({
            tenantId: tenant.id,
            action: 'downgraded',
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error',
          })
          logger.error('Error downgrading tenant', {
            tenantId: tenant.id,
            error,
          })
        }
      }
    }

    const duration = Date.now() - startTime

    logger.info('Billing check cron job completed', {
      duration,
      stats,
    })

    return NextResponse.json({
      success: true,
      message: 'Billing check cron completed',
      stats,
      results,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Billing check cron job failed', { error, duration })
    return errorResponse(error as Error)
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
