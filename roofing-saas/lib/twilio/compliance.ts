/**
 * SMS Compliance Helpers
 * TCPA compliance: opt-out management, quiet hours, consent tracking
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

// Standard opt-out keywords (TCPA requirements)
const OPT_OUT_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
  'STOP ALL',
]

// Opt-in keywords
const OPT_IN_KEYWORDS = [
  'START',
  'YES',
  'UNSTOP',
  'SUBSCRIBE',
]

/**
 * Check if message contains an opt-out keyword
 */
export function isOptOutMessage(message: string): boolean {
  const upperMessage = message.trim().toUpperCase()
  return OPT_OUT_KEYWORDS.some(keyword => upperMessage === keyword)
}

/**
 * Check if message contains an opt-in keyword
 */
export function isOptInMessage(message: string): boolean {
  const upperMessage = message.trim().toUpperCase()
  return OPT_IN_KEYWORDS.some(keyword => upperMessage === keyword)
}

/**
 * Mark contact as opted out of SMS
 */
export async function optOutContact(
  phoneNumber: string,
  reason: string = 'User requested STOP'
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        sms_opt_out: true,
        sms_opt_out_date: new Date().toISOString(),
        sms_opt_out_reason: reason,
      })
      .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
      .eq('is_deleted', false)
      .select('id')
      .single()

    if (error || !contact) {
      logger.error('Failed to opt out contact', { phoneNumber, error })
      return { success: false, error: error?.message || 'Contact not found' }
    }

    logger.info('Contact opted out of SMS', { phoneNumber, contactId: contact.id })
    return { success: true, contactId: contact.id }
  } catch (error) {
    logger.error('Error opting out contact', { error })
    return { success: false, error: 'Failed to opt out' }
  }
}

/**
 * Mark contact as opted in to SMS
 */
export async function optInContact(
  phoneNumber: string
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        sms_opt_in: true,
        sms_opt_in_date: new Date().toISOString(),
        sms_opt_out: false,
        sms_opt_out_date: null,
        sms_opt_out_reason: null,
      })
      .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
      .eq('is_deleted', false)
      .select('id')
      .single()

    if (error || !contact) {
      logger.error('Failed to opt in contact', { phoneNumber, error })
      return { success: false, error: error?.message || 'Contact not found' }
    }

    logger.info('Contact opted in to SMS', { phoneNumber, contactId: contact.id })
    return { success: true, contactId: contact.id }
  } catch (error) {
    logger.error('Error opting in contact', { error })
    return { success: false, error: 'Failed to opt in' }
  }
}

/**
 * Check if SMS can be sent to a contact
 * Validates opt-out status and quiet hours
 */
export async function canSendSMS(phoneNumber: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  try {
    const supabase = await createClient()

    // Get contact details
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('sms_opt_out, sms_opt_in, timezone')
      .or(`phone.eq.${phoneNumber},mobile_phone.eq.${phoneNumber}`)
      .eq('is_deleted', false)
      .single()

    if (error || !contact) {
      // Unknown contact - allow but log warning
      logger.warn('Attempting to send SMS to unknown contact', { phoneNumber })
      return { allowed: true } // Allow for now, but should require opt-in in production
    }

    // Check opt-out status
    if (contact.sms_opt_out) {
      return { allowed: false, reason: 'Contact has opted out of SMS' }
    }

    // Check quiet hours (8am-9pm)
    const timezone = contact.timezone || 'America/New_York'
    const now = new Date()
    const localTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const hour = localTime.getHours()

    if (hour < 8 || hour >= 21) {
      return { allowed: false, reason: 'Outside quiet hours (8am-9pm)' }
    }

    return { allowed: true }
  } catch (error) {
    logger.error('Error checking SMS permission', { error })
    return { allowed: false, reason: 'Error checking permissions' }
  }
}

/**
 * Get opt-out/opt-in statistics for a tenant
 */
export async function getComplianceStats(tenantId: string): Promise<{
  totalContacts: number
  optedIn: number
  optedOut: number
  noConsent: number
}> {
  const supabase = await createClient()

  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)

  const { count: optedIn } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('sms_opt_in', true)
    .eq('is_deleted', false)

  const { count: optedOut } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('sms_opt_out', true)
    .eq('is_deleted', false)

  return {
    totalContacts: totalContacts || 0,
    optedIn: optedIn || 0,
    optedOut: optedOut || 0,
    noConsent: (totalContacts || 0) - (optedIn || 0) - (optedOut || 0),
  }
}
