/**
 * Cron Job: DNC Sync Monitor
 *
 * Runs daily to check if any tenants need to sync their DNC registries.
 *
 * FTC TSR Requirement:
 * - Must sync with National DNC Registry every 31 days
 * - Failure to update = $43,792 per violation
 *
 * This job:
 * 1. Checks all tenants for overdue DNC syncs
 * 2. Creates admin alerts for overdue syncs
 * 3. Creates warning alerts for approaching deadlines
 *
 * Configure in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/dnc-sync",
 *     "schedule": "0 6 * * *"
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
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

const FEDERAL_SYNC_INTERVAL_DAYS = 31
const SYNC_WARNING_DAYS = 5

interface SyncJob {
  tenant_id: string
  sync_type: string
  completed_at: string
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Verify authorization
  if (!verifyCronSecret(request)) {
    logger.warn('Unauthorized cron request attempt')
    return errorResponse(AuthenticationError('Unauthorized'))
  }

  logger.info('Starting DNC sync monitor cron job')

  // Use service role client for cross-tenant access
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error('Supabase service role not configured')
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const now = new Date()

  try {
    // Get all tenants
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('is_active', true)

    if (tenantError) {
      logger.error('Error fetching tenants', { error: tenantError })
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    const stats = {
      tenantsChecked: 0,
      overdue: 0,
      approaching: 0,
      alertsCreated: 0,
      errors: 0,
    }

    const results: Array<{
      tenantId: string
      tenantName: string
      source: string
      status: string
      daysSinceSync?: number
    }> = []

    // Check each tenant's DNC sync status
    for (const tenant of tenants || []) {
      stats.tenantsChecked++

      // Get last successful sync for each source
      const { data: syncJobs, error: syncError } = await supabase
        .from('dnc_sync_jobs')
        .select('tenant_id, sync_type, completed_at')
        .eq('tenant_id', tenant.id)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })

      if (syncError) {
        logger.error('Error fetching sync jobs for tenant', {
          tenantId: tenant.id,
          error: syncError,
        })
        stats.errors++
        continue
      }

      // Check federal and state sync status
      const sources = ['federal', 'state_tn'] as const

      for (const source of sources) {
        const lastSync = (syncJobs as SyncJob[])?.find((job) => job.sync_type === source)

        if (!lastSync) {
          // Never synced - critical alert
          stats.overdue++

          const { error: alertError } = await supabase.from('admin_alerts').insert({
            tenant_id: tenant.id,
            alert_type: 'compliance_violation',
            severity: 'critical',
            title: `DNC Registry Never Synced: ${source === 'federal' ? 'Federal' : 'Tennessee State'}`,
            message: `The ${source === 'federal' ? 'Federal' : 'Tennessee State'} Do Not Call registry has never been synced. This is a compliance violation. Sync immediately to avoid penalties.`,
            metadata: {
              source,
              issue: 'never_synced',
            },
          })

          if (!alertError) {
            stats.alertsCreated++
          }

          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            source,
            status: 'never_synced',
          })

          continue
        }

        const lastSyncDate = new Date(lastSync.completed_at)
        const daysSinceSync = Math.floor(
          (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceSync > FEDERAL_SYNC_INTERVAL_DAYS) {
          // Overdue - critical alert
          stats.overdue++

          const { error: alertError } = await supabase.from('admin_alerts').insert({
            tenant_id: tenant.id,
            alert_type: 'compliance_violation',
            severity: 'critical',
            title: `DNC Registry Sync OVERDUE: ${source === 'federal' ? 'Federal' : 'Tennessee State'}`,
            message: `The ${source === 'federal' ? 'Federal' : 'Tennessee State'} Do Not Call registry is ${daysSinceSync} days since last sync (limit: ${FEDERAL_SYNC_INTERVAL_DAYS} days). Sync immediately.`,
            metadata: {
              source,
              days_since_sync: daysSinceSync,
              last_sync: lastSync.completed_at,
            },
          })

          if (!alertError) {
            stats.alertsCreated++
          }

          logger.warn('DNC sync overdue', {
            tenantId: tenant.id,
            source,
            daysSinceSync,
          })

          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            source,
            status: 'overdue',
            daysSinceSync,
          })
        } else if (daysSinceSync > FEDERAL_SYNC_INTERVAL_DAYS - SYNC_WARNING_DAYS) {
          // Approaching deadline - warning alert
          stats.approaching++

          const daysRemaining = FEDERAL_SYNC_INTERVAL_DAYS - daysSinceSync

          const { error: alertError } = await supabase.from('admin_alerts').insert({
            tenant_id: tenant.id,
            alert_type: 'compliance_warning',
            severity: 'warning',
            title: `DNC Registry Sync Due Soon: ${source === 'federal' ? 'Federal' : 'Tennessee State'}`,
            message: `The ${source === 'federal' ? 'Federal' : 'Tennessee State'} Do Not Call registry sync is due in ${daysRemaining} day(s). Schedule sync to avoid compliance violation.`,
            metadata: {
              source,
              days_since_sync: daysSinceSync,
              days_remaining: daysRemaining,
              last_sync: lastSync.completed_at,
            },
          })

          if (!alertError) {
            stats.alertsCreated++
          }

          logger.info('DNC sync approaching deadline', {
            tenantId: tenant.id,
            source,
            daysSinceSync,
            daysRemaining,
          })

          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            source,
            status: 'approaching',
            daysSinceSync,
          })
        } else {
          // OK
          results.push({
            tenantId: tenant.id,
            tenantName: tenant.name,
            source,
            status: 'ok',
            daysSinceSync,
          })
        }
      }
    }

    const duration = Date.now() - startTime

    logger.info('DNC sync monitor cron job completed', {
      duration,
      stats,
    })

    return NextResponse.json({
      success: true,
      message: 'DNC sync monitor cron completed',
      stats,
      results,
      duration,
    })
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('DNC sync monitor cron job failed', { error, duration })
    return errorResponse(error as Error)
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}
