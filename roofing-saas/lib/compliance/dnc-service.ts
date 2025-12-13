/**
 * DNC (Do Not Call) Service
 * Manages DNC registry lookups, internal DNC list, and compliance checks
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'
import type { DNCCheckResult, DNCSource } from './types'

/**
 * Generate SHA256 hash of phone number for DNC lookups
 * Used for privacy-preserving lookups in DNC registry
 *
 * @param phoneNumber - Phone number in E.164 format (+14235551234)
 * @returns SHA256 hash as hex string
 */
export function hashPhoneNumber(phoneNumber: string): string {
  return createHash('sha256').update(phoneNumber).digest('hex')
}

/**
 * Check if phone number is in DNC registry
 * Checks federal, state, and internal DNC lists
 *
 * @param phoneNumber - Phone number to check (E.164 format)
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @returns DNCCheckResult indicating if number is listed
 *
 * @example
 * const result = await checkDNC('+14235551234', tenantId);
 * if (result.isListed) {
 *   console.log(`Number is on ${result.source} DNC list`);
 * }
 */
export async function checkDNC(
  phoneNumber: string,
  tenantId: string
): Promise<DNCCheckResult> {
  try {
    const supabase = await createClient()
    const phone_hash = hashPhoneNumber(phoneNumber)

    logger.debug('Checking DNC registry', { phoneNumber, tenantId, phone_hash })

    // Query DNC registry for this phone hash
    const { data: entries, error } = await supabase
      .from('dnc_registry')
      .select('source, listed_date, expires_at')
      .eq('tenant_id', tenantId)
      .eq('phone_hash', phone_hash)
      .eq('is_deleted', false)

    if (error) {
      logger.error('Error querying DNC registry', { error, phoneNumber })
      return {
        isListed: false,
        reason: 'Error checking DNC registry',
      }
    }

    if (!entries || entries.length === 0) {
      logger.debug('Phone number not in DNC registry', { phoneNumber })
      return { isListed: false }
    }

    // Check for expired entries
    const now = new Date()
    const activeEntries = entries.filter((entry) => {
      if (!entry.expires_at) return true // No expiration
      return new Date(entry.expires_at) > now
    })

    if (activeEntries.length === 0) {
      logger.debug('All DNC entries expired', { phoneNumber })
      return { isListed: false }
    }

    // Return first active entry
    const entry = activeEntries[0]
    logger.info('Phone number found in DNC registry', {
      phoneNumber,
      source: entry.source,
      listedDate: entry.listed_date,
    })

    return {
      isListed: true,
      source: entry.source as DNCSource,
      listedDate: entry.listed_date ? new Date(entry.listed_date) : undefined,
      reason: `Phone number is on ${entry.source} DNC list`,
    }
  } catch (error) {
    logger.error('Error in checkDNC', { error, phoneNumber })
    return {
      isListed: false,
      reason: 'Error checking DNC registry',
    }
  }
}

/**
 * Add phone number to internal DNC list
 * Used when contact opts out or requests no calls
 *
 * @param phoneNumber - Phone number to add (E.164 format)
 * @param tenantId - Tenant ID
 * @param reason - Reason for adding to DNC (optional)
 * @returns Success boolean and entry ID
 */
export async function addToInternalDNC(
  phoneNumber: string,
  tenantId: string,
  reason?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const phone_hash = hashPhoneNumber(phoneNumber)

    // Extract area code from phone number (+1 423 555 1234 -> 423)
    const areaCode = phoneNumber.replace(/^\+1(\d{3}).*$/, '$1')

    logger.info('Adding phone to internal DNC list', {
      phoneNumber,
      tenantId,
      reason,
    })

    const { data, error } = await supabase
      .from('dnc_registry')
      .insert({
        tenant_id: tenantId,
        phone_number: phoneNumber,
        phone_hash,
        source: 'internal',
        area_code: areaCode.length === 3 ? areaCode : null,
        listed_date: new Date().toISOString().split('T')[0],
        metadata: reason ? { reason } : null,
      })
      .select('id')
      .single()

    if (error) {
      // Check for unique constraint violation (already exists)
      if (error.code === '23505') {
        logger.warn('Phone number already in internal DNC', { phoneNumber })
        return {
          success: true,
          error: 'Phone number already in internal DNC list',
        }
      }

      logger.error('Error adding to internal DNC', { error, phoneNumber })
      return { success: false, error: error.message }
    }

    // Also update contact record if it exists
    await supabase
      .from('contacts')
      .update({
        dnc_status: 'internal',
        dnc_internal_listed: true,
        dnc_last_checked: new Date().toISOString(),
      })
      .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    logger.info('Successfully added to internal DNC', {
      phoneNumber,
      id: data.id,
    })
    return { success: true, id: data.id }
  } catch (error) {
    logger.error('Error in addToInternalDNC', { error, phoneNumber })
    return { success: false, error: 'Failed to add to internal DNC' }
  }
}

/**
 * Remove phone number from internal DNC list
 * Used when contact requests to be removed from DNC
 *
 * @param phoneNumber - Phone number to remove
 * @param tenantId - Tenant ID
 * @returns Success boolean
 */
export async function removeFromInternalDNC(
  phoneNumber: string,
  tenantId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const phone_hash = hashPhoneNumber(phoneNumber)

    logger.info('Removing phone from internal DNC list', {
      phoneNumber,
      tenantId,
    })

    // Soft delete from DNC registry
    const { error: dncError } = await supabase
      .from('dnc_registry')
      .update({ is_deleted: true })
      .eq('tenant_id', tenantId)
      .eq('phone_hash', phone_hash)
      .eq('source', 'internal')

    if (dncError) {
      logger.error('Error removing from internal DNC', {
        error: dncError,
        phoneNumber,
      })
      return { success: false, error: dncError.message }
    }

    // Update contact record to clear internal DNC status
    await supabase
      .from('contacts')
      .update({
        dnc_status: 'clear',
        dnc_internal_listed: false,
        dnc_last_checked: new Date().toISOString(),
      })
      .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)
      .eq('dnc_status', 'internal') // Only update if currently marked as internal

    logger.info('Successfully removed from internal DNC', { phoneNumber })
    return { success: true }
  } catch (error) {
    logger.error('Error in removeFromInternalDNC', { error, phoneNumber })
    return { success: false, error: 'Failed to remove from internal DNC' }
  }
}

/**
 * Get DNC registry statistics for a tenant
 * Returns counts by source (federal, state, internal)
 *
 * @param tenantId - Tenant ID
 * @returns DNC statistics object
 */
export async function getDNCStats(tenantId: string): Promise<{
  total: number
  federal: number
  state: number
  internal: number
}> {
  try {
    const supabase = await createClient()

    const { count: total } = await supabase
      .from('dnc_registry')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_deleted', false)

    const { count: federal } = await supabase
      .from('dnc_registry')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', 'federal')
      .eq('is_deleted', false)

    const { count: state } = await supabase
      .from('dnc_registry')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', 'state_tn')
      .eq('is_deleted', false)

    const { count: internal } = await supabase
      .from('dnc_registry')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('source', 'internal')
      .eq('is_deleted', false)

    return {
      total: total || 0,
      federal: federal || 0,
      state: state || 0,
      internal: internal || 0,
    }
  } catch (error) {
    logger.error('Error getting DNC stats', { error, tenantId })
    return { total: 0, federal: 0, state: 0, internal: 0 }
  }
}
