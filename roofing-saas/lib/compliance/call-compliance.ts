/**
 * Call Compliance Orchestration
 * Main entry point for TCPA/TSR call compliance checks
 *
 * Performs comprehensive compliance validation:
 * 1. Opt-out check (has contact opted out of calls?)
 * 2. DNC check (is number on federal/state/internal DNC list?)
 * 3. Time check (within 9am-8pm calling hours?)
 * 4. Consent check (has contact given explicit consent?)
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { checkDNC } from './dnc-service'
import { isWithinCallingHours } from './time-restrictions'
import type {
  CanMakeCallParams,
  ComplianceCheckResult,
  ComplianceCheck,
  ComplianceLogEntry,
} from './types'

/**
 * Comprehensive compliance check before making a call
 * Validates all TCPA/TSR requirements
 *
 * Check order:
 * 1. Opt-out (immediate fail if opted out)
 * 2. DNC registry (immediate fail if listed)
 * 3. Time restrictions (immediate fail if outside hours)
 * 4. Consent (warning if not obtained, but allow call)
 *
 * @param params - Phone number, contact ID, tenant ID, user ID
 * @returns ComplianceCheckResult indicating if call is allowed
 *
 * @example
 * const result = await canMakeCall({
 *   phoneNumber: '+14235551234',
 *   contactId: 'uuid',
 *   tenantId: 'uuid',
 *   userId: 'uuid'
 * });
 *
 * if (result.canCall) {
 *   // Proceed with call
 * } else {
 *   console.error(result.reason);
 * }
 */
export async function canMakeCall(
  params: CanMakeCallParams
): Promise<ComplianceCheckResult> {
  const { phoneNumber, contactId, tenantId, userId } = params

  logger.info('Starting call compliance check', {
    phoneNumber,
    contactId,
    tenantId,
  })

  const checks: ComplianceCheckResult['checks'] = {}

  try {
    const supabase = await createClient()

    // Get contact details if contactId provided
    let contact = null
    if (contactId) {
      const { data, error } = await supabase
        .from('contacts')
        .select(
          'call_opt_out, call_consent, timezone, dnc_status, phone, mobile_phone'
        )
        .eq('id', contactId)
        .eq('is_deleted', false)
        .single()

      if (error) {
        logger.error('Error fetching contact', { error, contactId })
      } else {
        contact = data
      }
    }

    // STEP 1: Check opt-out status
    if (contact?.call_opt_out) {
      const optOutCheck: ComplianceCheck = {
        type: 'opt_out',
        passed: false,
        reason: 'Contact has opted out of calls',
      }
      checks.optOut = optOutCheck

      // Log compliance check
      await logComplianceCheck({
        tenantId,
        contactId,
        userId,
        phoneNumber,
        checkType: 'opt_out_check',
        result: 'fail',
        reason: optOutCheck.reason,
      })

      logger.warn('Call blocked: Contact opted out', { contactId, phoneNumber })
      return {
        canCall: false,
        reason: 'Contact has opted out of receiving calls',
        checks,
      }
    }

    checks.optOut = {
      type: 'opt_out',
      passed: true,
    }

    // STEP 2: Check DNC registry
    const dncResult = await checkDNC(phoneNumber, tenantId)
    if (dncResult.isListed) {
      const dncCheck: ComplianceCheck = {
        type: 'dnc',
        passed: false,
        reason: dncResult.reason || 'Phone number is on Do Not Call list',
        metadata: {
          source: dncResult.source,
          listedDate: dncResult.listedDate,
        },
      }
      checks.dnc = dncCheck

      // Log compliance check
      await logComplianceCheck({
        tenantId,
        contactId,
        userId,
        phoneNumber,
        checkType: 'dnc_check',
        result: 'fail',
        reason: dncCheck.reason,
        dncSource: dncResult.source,
      })

      logger.warn('Call blocked: DNC listed', {
        phoneNumber,
        source: dncResult.source,
      })
      return {
        canCall: false,
        reason: `Phone number is on ${dncResult.source} Do Not Call list`,
        checks,
      }
    }

    // Also check contact's dnc_status field
    if (contact?.dnc_status && contact.dnc_status !== 'clear') {
      const dncCheck: ComplianceCheck = {
        type: 'dnc',
        passed: false,
        reason: `Contact marked as DNC: ${contact.dnc_status}`,
        metadata: {
          source: contact.dnc_status,
        },
      }
      checks.dnc = dncCheck

      // Log compliance check
      await logComplianceCheck({
        tenantId,
        contactId,
        userId,
        phoneNumber,
        checkType: 'dnc_check',
        result: 'fail',
        reason: dncCheck.reason,
        dncSource: contact.dnc_status,
      })

      logger.warn('Call blocked: Contact DNC status', {
        contactId,
        dncStatus: contact.dnc_status,
      })
      return {
        canCall: false,
        reason: `Contact is marked as ${contact.dnc_status} Do Not Call`,
        checks,
      }
    }

    checks.dnc = {
      type: 'dnc',
      passed: true,
    }

    // STEP 3: Check time restrictions
    const timezone = contact?.timezone || 'America/New_York'
    const timeResult = isWithinCallingHours(timezone)
    if (!timeResult.allowed) {
      const timeCheck: ComplianceCheck = {
        type: 'time',
        passed: false,
        reason: timeResult.reason || 'Outside calling hours',
        metadata: {
          timezone: timeResult.timezone,
          localTime: timeResult.localTime,
          localHour: timeResult.localHour,
        },
      }
      checks.time = timeCheck

      // Log compliance check
      await logComplianceCheck({
        tenantId,
        contactId,
        userId,
        phoneNumber,
        checkType: 'time_check',
        result: 'fail',
        reason: timeCheck.reason,
        contactTimezone: timeResult.timezone,
        contactLocalTime: timeResult.localTime,
      })

      logger.warn('Call blocked: Outside calling hours', {
        phoneNumber,
        timezone,
        localHour: timeResult.localHour,
      })
      return {
        canCall: false,
        reason: timeResult.reason,
        checks,
      }
    }

    checks.time = {
      type: 'time',
      passed: true,
      metadata: {
        timezone: timeResult.timezone,
        localTime: timeResult.localTime,
        localHour: timeResult.localHour,
      },
    }

    // STEP 4: Check consent (warning only, not blocking)
    if (!contact?.call_consent) {
      const consentCheck: ComplianceCheck = {
        type: 'consent',
        passed: false,
        reason: 'No explicit call consent recorded',
      }
      checks.consent = consentCheck

      // Log as warning
      await logComplianceCheck({
        tenantId,
        contactId,
        userId,
        phoneNumber,
        checkType: 'consent_check',
        result: 'warning',
        reason: consentCheck.reason,
      })

      logger.warn('Call consent not recorded', { contactId, phoneNumber })
      return {
        canCall: true,
        warning: 'No explicit call consent recorded. Consider obtaining consent.',
        checks,
      }
    }

    checks.consent = {
      type: 'consent',
      passed: true,
    }

    // ALL CHECKS PASSED
    // Log successful compliance check
    await logComplianceCheck({
      tenantId,
      contactId,
      userId,
      phoneNumber,
      checkType: 'opt_out_check',
      result: 'pass',
      reason: 'All compliance checks passed',
      contactTimezone: timezone,
      contactLocalTime: timeResult.localTime,
    })

    logger.info('Call compliance check passed', {
      phoneNumber,
      contactId,
      tenantId,
    })

    return {
      canCall: true,
      reason: 'All compliance checks passed',
      checks,
    }
  } catch (error) {
    logger.error('Error in call compliance check', { error, params })

    // Log error
    await logComplianceCheck({
      tenantId,
      contactId,
      userId,
      phoneNumber,
      checkType: 'opt_out_check',
      result: 'fail',
      reason: 'Error performing compliance check',
      metadata: { error: String(error) },
    })

    return {
      canCall: false,
      reason: 'Error performing compliance check',
      checks,
    }
  }
}

/**
 * Log compliance check to audit trail
 * Creates entry in call_compliance_log table
 *
 * @param entry - Compliance log entry data
 */
async function logComplianceCheck(
  entry: Omit<ComplianceLogEntry, 'metadata'> & {
    metadata?: Record<string, unknown>
  }
): Promise<void> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('call_compliance_log').insert({
      tenant_id: entry.tenantId,
      contact_id: entry.contactId || null,
      user_id: entry.userId || null,
      phone_number: entry.phoneNumber,
      check_type: entry.checkType,
      result: entry.result,
      reason: entry.reason || null,
      dnc_source: entry.dncSource || null,
      contact_timezone: entry.contactTimezone || null,
      contact_local_time: entry.contactLocalTime || null,
      metadata: entry.metadata || null,
    })

    if (error) {
      logger.error('Error logging compliance check', { error, entry })
    }
  } catch (error) {
    logger.error('Error in logComplianceCheck', { error })
  }
}

/**
 * Get recent compliance check failures for a tenant
 * Useful for monitoring and reporting
 *
 * @param tenantId - Tenant ID
 * @param limit - Number of records to return (default: 50)
 * @returns Array of compliance log entries
 */
export async function getRecentComplianceFailures(
  tenantId: string,
  limit: number = 50
): Promise<ComplianceLogEntry[]> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('call_compliance_log')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('result', 'fail')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      logger.error('Error fetching compliance failures', { error, tenantId })
      return []
    }

    return (data || []).map((row) => ({
      tenantId: row.tenant_id,
      contactId: row.contact_id,
      callLogId: row.call_log_id,
      userId: row.user_id,
      phoneNumber: row.phone_number,
      checkType: row.check_type,
      result: row.result,
      reason: row.reason,
      dncSource: row.dnc_source,
      contactTimezone: row.contact_timezone,
      contactLocalTime: row.contact_local_time,
      metadata: row.metadata,
    }))
  } catch (error) {
    logger.error('Error in getRecentComplianceFailures', { error })
    return []
  }
}

/**
 * Get compliance check statistics for a tenant
 * Returns counts of pass/fail/warning by check type
 *
 * @param tenantId - Tenant ID
 * @param days - Number of days to look back (default: 30)
 * @returns Statistics object
 */
export async function getComplianceStats(
  tenantId: string,
  days: number = 30
): Promise<{
  total: number
  passed: number
  failed: number
  warnings: number
  byType: Record<string, { pass: number; fail: number; warning: number }>
}> {
  try {
    const supabase = await createClient()
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data, error } = await supabase
      .from('call_compliance_log')
      .select('check_type, result')
      .eq('tenant_id', tenantId)
      .gte('created_at', since.toISOString())

    if (error) {
      logger.error('Error fetching compliance stats', { error, tenantId })
      return {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        byType: {},
      }
    }

    const stats = {
      total: data.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      byType: {} as Record<
        string,
        { pass: number; fail: number; warning: number }
      >,
    }

    data.forEach((row) => {
      if (row.result === 'pass') stats.passed++
      else if (row.result === 'fail') stats.failed++
      else if (row.result === 'warning') stats.warnings++

      if (!stats.byType[row.check_type]) {
        stats.byType[row.check_type] = { pass: 0, fail: 0, warning: 0 }
      }
      const result = row.result as 'pass' | 'fail' | 'warning'
      stats.byType[row.check_type][result]++
    })

    return stats
  } catch (error) {
    logger.error('Error in getComplianceStats', { error })
    return {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0,
      byType: {},
    }
  }
}
