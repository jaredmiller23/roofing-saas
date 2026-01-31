/**
 * Opt-Out Processing Service
 * Handles TCPA-compliant opt-out request processing
 *
 * April 2025 TCPA Rule Requirements:
 * 1. Opt-out must be honored within 10 BUSINESS DAYS (not calendar days)
 * 2. Single follow-up message allowed within 10 MINUTES of opt-out request
 * 3. After follow-up, complete blocking of all communications
 * 4. Must track and audit all opt-out processing for compliance proof
 *
 * Violation penalties: $500-$1,500 per violation, no cap on total damages
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { addToInternalDNC } from './dnc-service'
import type { Json } from '@/lib/types/database.types'

export type OptOutType = 'call' | 'sms' | 'both'
export type OptOutSource = 'sms_stop' | 'verbal' | 'web_form' | 'email' | 'manual' | 'ivr'

export interface OptOutRequest {
  contactId: string
  tenantId: string
  phoneNumber: string
  optOutType: OptOutType
  source: OptOutSource
  userId?: string
}

export interface OptOutResult {
  success: boolean
  queueId?: string
  deadline: Date
  canSendFollowUp: boolean
  followUpWindowEnds: Date
  error?: string
}

export interface OptOutQueueEntry {
  id: string
  tenantId: string
  contactId: string
  phoneNumber: string
  optOutType: OptOutType
  source: OptOutSource
  requestedAt: Date
  deadline: Date
  followUpSentAt?: Date
  processedAt?: Date
  status: 'pending' | 'follow_up_sent' | 'processed' | 'overdue' | 'cancelled'
}

/**
 * Calculate deadline that is N business days from start date
 * Skips weekends (Saturday = 6, Sunday = 0)
 *
 * @param fromDate - Start date
 * @param businessDays - Number of business days to add (default: 10 per TCPA)
 * @returns Deadline date
 */
export function calculateBusinessDaysDeadline(
  fromDate: Date,
  businessDays: number = 10
): Date {
  const result = new Date(fromDate)
  let daysAdded = 0

  while (daysAdded < businessDays) {
    result.setDate(result.getDate() + 1)
    const dayOfWeek = result.getDay()

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysAdded++
    }
  }

  return result
}

/**
 * Calculate 10-minute follow-up window end time
 *
 * @param optOutTime - When opt-out was requested
 * @returns Window end time
 */
export function calculateFollowUpWindowEnd(optOutTime: Date): Date {
  return new Date(optOutTime.getTime() + 10 * 60 * 1000) // 10 minutes in ms
}

/**
 * Check if within 10-minute follow-up window
 *
 * @param optOutTime - When opt-out was requested
 * @returns True if still within window
 */
export function isWithinFollowUpWindow(optOutTime: Date): boolean {
  const now = new Date()
  const windowEnd = calculateFollowUpWindowEnd(optOutTime)
  return now <= windowEnd
}

/**
 * Process an opt-out request
 * - Immediately adds to internal DNC
 * - Creates queue entry for deadline tracking
 * - Updates contact record
 * - Logs to compliance audit trail
 *
 * @param request - Opt-out request details
 * @returns Processing result with deadline and follow-up window info
 */
export async function processOptOut(
  request: OptOutRequest
): Promise<OptOutResult> {
  const { contactId, tenantId, phoneNumber, optOutType, source, userId } = request

  try {
    const supabase = await createClient()
    const now = new Date()
    const deadline = calculateBusinessDaysDeadline(now)
    const followUpWindowEnds = calculateFollowUpWindowEnd(now)

    logger.info('Processing opt-out request', {
      contactId,
      optOutType,
      source,
      deadline: deadline.toISOString(),
    })

    // 1. Add to internal DNC immediately (blocks future calls/texts)
    const dncReason = `Opt-out via ${source} on ${now.toISOString()}`
    await addToInternalDNC(phoneNumber, tenantId, dncReason)

    // 2. Update contact record
    const contactUpdate: Record<string, unknown> = {}

    if (optOutType === 'call' || optOutType === 'both') {
      contactUpdate.call_opt_out = true
      contactUpdate.call_opt_out_date = now.toISOString()
      contactUpdate.call_opt_out_reason = `Opt-out via ${source}`
      contactUpdate.call_opt_out_deadline = deadline.toISOString()
      contactUpdate.call_consent = 'none'
    }

    if (optOutType === 'sms' || optOutType === 'both') {
      contactUpdate.sms_opt_out = true
      contactUpdate.sms_opt_out_date = now.toISOString()
      contactUpdate.sms_opt_out_reason = `Opt-out via ${source}`
      contactUpdate.sms_opt_out_deadline = deadline.toISOString()
      contactUpdate.sms_opt_in = false
    }

    const { error: contactError } = await supabase
      .from('contacts')
      .update(contactUpdate)
      .eq('id', contactId)
      .eq('tenant_id', tenantId)

    if (contactError) {
      logger.error('Error updating contact for opt-out', { error: contactError })
    }

    // 3. Create queue entry for deadline tracking
    const { data: queueEntry, error: queueError } = await supabase
      .from('call_opt_out_queue')
      .insert({
        tenant_id: tenantId,
        contact_id: contactId,
        phone_number: phoneNumber,
        opt_out_type: optOutType,
        opt_out_requested_at: now.toISOString(),
        opt_out_source: source,
        deadline: deadline.toISOString(),
        status: 'pending',
      })
      .select('id')
      .single()

    if (queueError) {
      logger.error('Error creating opt-out queue entry', { error: queueError })
    }

    // 4. Log to compliance audit trail
    await supabase.from('call_compliance_log').insert({
      tenant_id: tenantId,
      contact_id: contactId,
      phone_number: phoneNumber,
      check_type: 'opt_out_check',
      result: 'blocked',
      metadata: {
        action: 'opt_out_processed',
        opt_out_type: optOutType,
        source,
        deadline: deadline.toISOString(),
        follow_up_window_ends: followUpWindowEnds.toISOString(),
        queue_id: queueEntry?.id,
      } as Json,
      user_id: userId,
    })

    logger.info('Opt-out processed successfully', {
      contactId,
      queueId: queueEntry?.id,
      deadline: deadline.toISOString(),
    })

    return {
      success: true,
      queueId: queueEntry?.id,
      deadline,
      canSendFollowUp: true,
      followUpWindowEnds,
    }
  } catch (error) {
    logger.error('Error processing opt-out', { error, request })
    return {
      success: false,
      deadline: new Date(),
      canSendFollowUp: false,
      followUpWindowEnds: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send single follow-up message after opt-out
 * April 2025 TCPA Rule: Only ONE follow-up allowed within 10 minutes
 *
 * @param queueId - Queue entry ID
 * @param tenantId - Tenant ID
 * @param message - Follow-up message text
 * @returns Success status
 */
export async function sendOptOutFollowUp(
  queueId: string,
  tenantId: string,
  message?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Get queue entry
    const { data: queueEntry, error: fetchError } = await supabase
      .from('call_opt_out_queue')
      .select('*')
      .eq('id', queueId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !queueEntry) {
      return { success: false, error: 'Queue entry not found' }
    }

    // Check if follow-up already sent
    if (queueEntry.follow_up_sent_at) {
      return {
        success: false,
        error: 'Follow-up already sent. Only ONE follow-up allowed per TCPA.',
      }
    }

    // Check if within 10-minute window
    const requestedAt = new Date(queueEntry.opt_out_requested_at)
    if (!isWithinFollowUpWindow(requestedAt)) {
      return {
        success: false,
        error: 'Follow-up window expired (>10 minutes since opt-out). No follow-up allowed.',
      }
    }

    // Update queue entry
    const now = new Date()
    const { error: updateError } = await supabase
      .from('call_opt_out_queue')
      .update({
        follow_up_sent_at: now.toISOString(),
        follow_up_message: message,
        status: 'follow_up_sent',
      })
      .eq('id', queueId)

    if (updateError) {
      logger.error('Error updating queue entry', { error: updateError })
      return { success: false, error: updateError.message }
    }

    // Log to compliance audit
    await supabase.from('call_compliance_log').insert({
      tenant_id: tenantId,
      contact_id: queueEntry.contact_id,
      phone_number: queueEntry.phone_number,
      check_type: 'opt_out_check',
      result: 'allowed',
      metadata: {
        action: 'opt_out_follow_up_sent',
        queue_id: queueId,
        follow_up_sent_at: now.toISOString(),
        message,
      } as Json,
    })

    logger.info('Opt-out follow-up sent', { queueId })

    return { success: true }
  } catch (error) {
    logger.error('Error sending opt-out follow-up', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Mark opt-out as fully processed
 * Called when 10-day deadline has been met
 *
 * @param queueId - Queue entry ID
 * @param tenantId - Tenant ID
 * @param userId - User who processed it
 */
export async function markOptOutProcessed(
  queueId: string,
  tenantId: string,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const now = new Date()

    const { error } = await supabase
      .from('call_opt_out_queue')
      .update({
        processed_at: now.toISOString(),
        processed_by: userId,
        status: 'processed',
      })
      .eq('id', queueId)
      .eq('tenant_id', tenantId)

    if (error) {
      return { success: false, error: error.message }
    }

    logger.info('Opt-out marked as processed', { queueId })
    return { success: true }
  } catch (error) {
    logger.error('Error marking opt-out processed', { error })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get pending opt-out queue entries for a tenant
 * Includes deadline status (ok, approaching, overdue)
 *
 * @param tenantId - Tenant ID
 * @returns Array of queue entries with deadline status
 */
export async function getPendingOptOuts(
  tenantId: string
): Promise<(OptOutQueueEntry & { deadlineStatus: 'ok' | 'approaching' | 'overdue' })[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('call_opt_out_queue')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'follow_up_sent'])
      .order('deadline', { ascending: true })

    if (error) {
      logger.error('Error fetching pending opt-outs', { error })
      return []
    }

    const now = new Date()
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)

    return (data || []).map((entry) => {
      const deadline = new Date(entry.deadline)
      let deadlineStatus: 'ok' | 'approaching' | 'overdue'

      if (deadline < now) {
        deadlineStatus = 'overdue'
      } else if (deadline < twoDaysFromNow) {
        deadlineStatus = 'approaching'
      } else {
        deadlineStatus = 'ok'
      }

      return {
        id: entry.id,
        tenantId: entry.tenant_id,
        contactId: entry.contact_id,
        phoneNumber: entry.phone_number,
        optOutType: entry.opt_out_type as OptOutType,
        source: entry.opt_out_source as OptOutSource,
        requestedAt: new Date(entry.opt_out_requested_at),
        deadline,
        followUpSentAt: entry.follow_up_sent_at ? new Date(entry.follow_up_sent_at) : undefined,
        processedAt: entry.processed_at ? new Date(entry.processed_at) : undefined,
        status: entry.status as OptOutQueueEntry['status'],
        deadlineStatus,
      }
    })
  } catch (error) {
    logger.error('Error in getPendingOptOuts', { error })
    return []
  }
}

/**
 * Get opt-out statistics for a tenant
 *
 * @param tenantId - Tenant ID
 * @param days - Number of days to look back
 */
export async function getOptOutStats(
  tenantId: string,
  days: number = 30
): Promise<{
  total: number
  pending: number
  processed: number
  overdue: number
  bySource: Record<string, number>
}> {
  try {
    const supabase = await createClient()
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('call_opt_out_queue')
      .select('status, opt_out_source')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())

    if (error) {
      logger.error('Error fetching opt-out stats', { error })
      return { total: 0, pending: 0, processed: 0, overdue: 0, bySource: {} }
    }

    const stats = {
      total: data.length,
      pending: 0,
      processed: 0,
      overdue: 0,
      bySource: {} as Record<string, number>,
    }

    data.forEach((entry) => {
      // Count by status
      if (entry.status === 'pending' || entry.status === 'follow_up_sent') {
        stats.pending++
      } else if (entry.status === 'processed') {
        stats.processed++
      } else if (entry.status === 'overdue') {
        stats.overdue++
      }

      // Count by source
      const source = entry.opt_out_source
      stats.bySource[source] = (stats.bySource[source] || 0) + 1
    })

    return stats
  } catch (error) {
    logger.error('Error in getOptOutStats', { error })
    return { total: 0, pending: 0, processed: 0, overdue: 0, bySource: {} }
  }
}
