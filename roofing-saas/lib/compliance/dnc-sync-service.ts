/**
 * DNC Sync Service
 * Manages automated DNC registry synchronization and compliance tracking
 *
 * FTC Telemarketing Sales Rule (TSR) Requirements:
 * - Must sync with National Do Not Call Registry every 31 days
 * - Must use most recent registry data before calling
 * - Failure to update = $43,792 per violation (as of 2025)
 *
 * Tennessee State DNC Requirements:
 * - Separate registry from federal
 * - $500/year subscription required
 * - $2,000 per violation
 * - As of July 2024, now covers SMS messages too
 *
 * This service tracks sync jobs, calculates next sync deadlines,
 * and provides integration hooks for DNC data import.
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { hashPhoneNumber } from './dnc-service'

export type DNCRegistrySource = 'federal' | 'state_tn' | 'internal'

export interface DNCSyncJob {
  id: string
  tenantId: string
  source: DNCRegistrySource
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  recordsProcessed: number
  recordsAdded: number
  recordsRemoved: number
  errorMessage?: string
}

export interface DNCSyncStatus {
  source: DNCRegistrySource
  lastSyncDate: Date | null
  nextSyncDeadline: Date | null
  daysSinceLastSync: number | null
  isOverdue: boolean
  isApproaching: boolean // Within 5 days of deadline
  recordCount: number
}

/**
 * FTC requires DNC sync every 31 days
 * We use 30 to provide 1-day buffer
 */
const FEDERAL_SYNC_INTERVAL_DAYS = 31
const SYNC_WARNING_DAYS = 5

/**
 * Get DNC sync status for a tenant
 * Returns status for federal, state, and internal registries
 *
 * @param tenantId - Tenant ID
 * @returns Array of sync status for each registry source
 */
export async function getDNCSyncStatus(tenantId: string): Promise<DNCSyncStatus[]> {
  try {
    const supabase = await createClient()

    // Get last successful sync for each source
    const { data: syncJobs, error: syncError } = await supabase
      .from('dnc_sync_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })

    if (syncError) {
      logger.error('Error fetching DNC sync jobs', { error: syncError, tenantId })
    }

    // Get record counts per source
    const { data: registryCounts, error: countError } = await supabase
      .from('dnc_registry')
      .select('source')
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    if (countError) {
      logger.error('Error fetching DNC registry counts', { error: countError, tenantId })
    }

    // Build status for each source
    const sources: DNCRegistrySource[] = ['federal', 'state_tn', 'internal']
    const now = new Date()
    const statuses: DNCSyncStatus[] = []

    for (const source of sources) {
      const lastJob = syncJobs?.find((job) => job.source === source)
      const lastSyncDate = lastJob?.completed_at ? new Date(lastJob.completed_at) : null

      let daysSinceLastSync: number | null = null
      let nextSyncDeadline: Date | null = null
      let isOverdue = false
      let isApproaching = false

      if (lastSyncDate) {
        daysSinceLastSync = Math.floor(
          (now.getTime() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24)
        )

        // Calculate next deadline (31 days from last sync for federal, 31 for state)
        const syncInterval =
          source === 'internal' ? Infinity : FEDERAL_SYNC_INTERVAL_DAYS
        nextSyncDeadline = new Date(lastSyncDate.getTime() + syncInterval * 24 * 60 * 60 * 1000)

        if (source !== 'internal') {
          isOverdue = daysSinceLastSync > syncInterval
          isApproaching =
            !isOverdue && daysSinceLastSync > syncInterval - SYNC_WARNING_DAYS
        }
      } else {
        // Never synced
        if (source !== 'internal') {
          isOverdue = true
        }
      }

      // Count records for this source
      const recordCount =
        registryCounts?.filter((r) => r.source === source).length || 0

      statuses.push({
        source,
        lastSyncDate,
        nextSyncDeadline,
        daysSinceLastSync,
        isOverdue,
        isApproaching,
        recordCount,
      })
    }

    return statuses
  } catch (error) {
    logger.error('Error in getDNCSyncStatus', { error, tenantId })
    return []
  }
}

/**
 * Create a new DNC sync job
 * Call this before starting a DNC import
 *
 * @param tenantId - Tenant ID
 * @param source - DNC registry source (federal, state_tn, internal)
 * @returns Sync job ID
 */
export async function createDNCSyncJob(
  tenantId: string,
  source: DNCRegistrySource
): Promise<{ success: boolean; jobId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('dnc_sync_jobs')
      .insert({
        tenant_id: tenantId,
        source,
        status: 'pending',
        records_processed: 0,
        records_added: 0,
        records_removed: 0,
      })
      .select('id')
      .single()

    if (error) {
      logger.error('Error creating DNC sync job', { error, tenantId, source })
      return { success: false, error: error.message }
    }

    logger.info('Created DNC sync job', { jobId: data.id, tenantId, source })
    return { success: true, jobId: data.id }
  } catch (error) {
    logger.error('Error in createDNCSyncJob', { error })
    return { success: false, error: 'Failed to create sync job' }
  }
}

/**
 * Update DNC sync job status
 *
 * @param jobId - Sync job ID
 * @param status - New status
 * @param stats - Optional statistics to update
 */
export async function updateDNCSyncJob(
  jobId: string,
  status: 'in_progress' | 'completed' | 'failed',
  stats?: {
    recordsProcessed?: number
    recordsAdded?: number
    recordsRemoved?: number
    errorMessage?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const updateData: Record<string, unknown> = { status }

    if (status === 'in_progress') {
      updateData.started_at = new Date().toISOString()
    } else if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString()
    }

    if (stats) {
      if (stats.recordsProcessed !== undefined)
        updateData.records_processed = stats.recordsProcessed
      if (stats.recordsAdded !== undefined) updateData.records_added = stats.recordsAdded
      if (stats.recordsRemoved !== undefined)
        updateData.records_removed = stats.recordsRemoved
      if (stats.errorMessage !== undefined) updateData.error_message = stats.errorMessage
    }

    const { error } = await supabase.from('dnc_sync_jobs').update(updateData).eq('id', jobId)

    if (error) {
      logger.error('Error updating DNC sync job', { error, jobId })
      return { success: false, error: error.message }
    }

    logger.info('Updated DNC sync job', { jobId, status, stats })
    return { success: true }
  } catch (error) {
    logger.error('Error in updateDNCSyncJob', { error })
    return { success: false, error: 'Failed to update sync job' }
  }
}

/**
 * Import DNC records from a batch
 * Used during sync jobs to import phone numbers
 *
 * @param tenantId - Tenant ID
 * @param source - DNC registry source
 * @param phoneNumbers - Array of phone numbers to add
 * @returns Import statistics
 */
export async function importDNCBatch(
  tenantId: string,
  source: DNCRegistrySource,
  phoneNumbers: string[]
): Promise<{
  success: boolean
  added: number
  skipped: number
  errors: number
  errorMessage?: string
}> {
  try {
    const supabase = await createClient()
    let added = 0
    const skipped = 0
    let errors = 0

    // Process in batches of 100 for performance
    const batchSize = 100
    for (let i = 0; i < phoneNumbers.length; i += batchSize) {
      const batch = phoneNumbers.slice(i, i + batchSize)

      const records = batch.map((phone) => {
        // Normalize phone number to E.164
        const normalized = normalizePhoneNumber(phone)
        const areaCode = normalized.length >= 4 ? normalized.substring(2, 5) : null

        return {
          tenant_id: tenantId,
          phone_number: normalized,
          phone_hash: hashPhoneNumber(normalized),
          source,
          area_code: areaCode,
          listed_date: new Date().toISOString().split('T')[0],
        }
      })

      const { error } = await supabase
        .from('dnc_registry')
        .upsert(records, {
          onConflict: 'tenant_id,phone_hash,source',
          ignoreDuplicates: true,
        })

      if (error) {
        logger.error('Error importing DNC batch', { error, batchIndex: i, source })
        errors += batch.length
      } else {
        added += batch.length
      }
    }

    logger.info('DNC batch import completed', {
      tenantId,
      source,
      total: phoneNumbers.length,
      added,
      skipped,
      errors,
    })

    return { success: errors === 0, added, skipped, errors }
  } catch (error) {
    logger.error('Error in importDNCBatch', { error })
    return {
      success: false,
      added: 0,
      skipped: 0,
      errors: phoneNumbers.length,
      errorMessage: error instanceof Error ? error.message : 'Import failed',
    }
  }
}

/**
 * Normalize phone number to E.164 format (+1XXXXXXXXXX)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Handle different lengths
  if (digits.length === 10) {
    return '+1' + digits
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return '+' + digits
  } else if (digits.length === 12 && digits.startsWith('1')) {
    return '+' + digits
  }

  // Return with +1 prefix if not already there
  return digits.startsWith('+') ? digits : '+1' + digits
}

/**
 * Get DNC sync history for a tenant
 *
 * @param tenantId - Tenant ID
 * @param limit - Number of records to return
 * @returns Array of sync job records
 */
export async function getDNCSyncHistory(
  tenantId: string,
  limit: number = 20
): Promise<DNCSyncJob[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('dnc_sync_jobs')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching DNC sync history', { error, tenantId })
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      source: row.source as DNCRegistrySource,
      status: row.status,
      startedAt: row.started_at ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      recordsProcessed: row.records_processed,
      recordsAdded: row.records_added,
      recordsRemoved: row.records_removed,
      errorMessage: row.error_message,
    }))
  } catch (error) {
    logger.error('Error in getDNCSyncHistory', { error })
    return []
  }
}

/**
 * Check if any DNC registry needs syncing across all tenants
 * Used by cron job to determine if alerts need to be created
 *
 * @returns Array of tenant IDs with overdue syncs
 */
export async function getTenantsWithOverdueDNCSync(): Promise<
  Array<{
    tenantId: string
    source: DNCRegistrySource
    daysSinceLastSync: number
  }>
> {
  try {
    const supabase = await createClient()

    // Get all tenants
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('is_deleted', false)

    if (tenantError) {
      logger.error('Error fetching tenants', { error: tenantError })
      return []
    }

    const overdue: Array<{
      tenantId: string
      source: DNCRegistrySource
      daysSinceLastSync: number
    }> = []

    for (const tenant of tenants || []) {
      const statuses = await getDNCSyncStatus(tenant.id)

      for (const status of statuses) {
        if (status.isOverdue && status.source !== 'internal') {
          overdue.push({
            tenantId: tenant.id,
            source: status.source,
            daysSinceLastSync: status.daysSinceLastSync || 999,
          })
        }
      }
    }

    return overdue
  } catch (error) {
    logger.error('Error in getTenantsWithOverdueDNCSync', { error })
    return []
  }
}
