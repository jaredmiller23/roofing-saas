/**
 * Email Compliance Helpers
 * CAN-SPAM compliance: opt-out management, bounce handling
 */

import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

/**
 * Check if email can be sent to a contact
 * Validates opt-out status and email validity (bounce tracking)
 */
export async function canSendEmail(email: string): Promise<{
  allowed: boolean
  reason?: string
}> {
  try {
    const supabase = await createClient()

    // Get contact details
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('email_opt_out, email_invalid, email_invalid_reason')
      .eq('email', email)
      .eq('is_deleted', false)
      .single()

    if (error || !contact) {
      // Unknown contact - allow but log warning
      logger.warn('Attempting to send email to unknown contact', { email })
      return { allowed: true } // Allow for now, but should require opt-in in production
    }

    // Check opt-out status
    if (contact.email_opt_out) {
      return { allowed: false, reason: 'Contact has opted out of emails' }
    }

    // Check if email is marked as invalid (bounced)
    if (contact.email_invalid) {
      return {
        allowed: false,
        reason: `Email is invalid: ${contact.email_invalid_reason || 'Previously bounced'}`,
      }
    }

    return { allowed: true }
  } catch (error) {
    logger.error('Error checking email permission', { error })
    return { allowed: false, reason: 'Error checking permissions' }
  }
}

/**
 * Mark contact as opted out of emails
 */
export async function optOutEmail(
  email: string,
  reason: string = 'User requested unsubscribe'
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        email_opt_out: true,
        email_opt_out_date: new Date().toISOString(),
        email_opt_out_reason: reason,
      })
      .eq('email', email)
      .eq('is_deleted', false)
      .select('id')
      .single()

    if (error || !contact) {
      logger.error('Failed to opt out contact from email', { email, error })
      return { success: false, error: error?.message || 'Contact not found' }
    }

    logger.info('Contact opted out of email', { email, contactId: contact.id })
    return { success: true, contactId: contact.id }
  } catch (error) {
    logger.error('Error opting out contact from email', { error })
    return { success: false, error: 'Failed to opt out' }
  }
}

/**
 * Mark contact email as invalid (bounced)
 */
export async function markEmailInvalid(
  email: string,
  reason: string = 'Email bounced'
): Promise<{ success: boolean; contactId?: string; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: contact, error } = await supabase
      .from('contacts')
      .update({
        email_invalid: true,
        email_invalid_date: new Date().toISOString(),
        email_invalid_reason: reason,
      })
      .eq('email', email)
      .eq('is_deleted', false)
      .select('id')
      .single()

    if (error || !contact) {
      logger.error('Failed to mark email as invalid', { email, error })
      return { success: false, error: error?.message || 'Contact not found' }
    }

    logger.warn('Email marked as invalid', { email, contactId: contact.id, reason })
    return { success: true, contactId: contact.id }
  } catch (error) {
    logger.error('Error marking email as invalid', { error })
    return { success: false, error: 'Failed to mark invalid' }
  }
}

/**
 * Get email compliance statistics for a tenant
 */
export async function getEmailComplianceStats(tenantId: string): Promise<{
  totalContacts: number
  validEmails: number
  optedOut: number
  invalidEmails: number
}> {
  const supabase = await createClient()

  const { count: totalContacts } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .not('email', 'is', null)

  const { count: optedOut } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('email_opt_out', true)
    .eq('is_deleted', false)

  const { count: invalidEmails } = await supabase
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('email_invalid', true)
    .eq('is_deleted', false)

  const validEmails = (totalContacts || 0) - (optedOut || 0) - (invalidEmails || 0)

  return {
    totalContacts: totalContacts || 0,
    validEmails: validEmails > 0 ? validEmails : 0,
    optedOut: optedOut || 0,
    invalidEmails: invalidEmails || 0,
  }
}

/**
 * Get email analytics for activities
 */
export async function getEmailAnalytics(
  tenantId: string,
  dateFrom?: Date,
  dateTo?: Date
): Promise<{
  totalSent: number
  totalDelivered: number
  totalOpened: number
  totalClicked: number
  totalBounced: number
  openRate: number
  clickRate: number
  bounceRate: number
}> {
  const supabase = await createClient()

  let query = supabase
    .from('activities')
    .select('metadata')
    .eq('tenant_id', tenantId)
    .eq('type', 'email')
    .eq('direction', 'outbound')

  if (dateFrom) {
    query = query.gte('created_at', dateFrom.toISOString())
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo.toISOString())
  }

  const { data: activities } = await query

  if (!activities || activities.length === 0) {
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalOpened: 0,
      totalClicked: 0,
      totalBounced: 0,
      openRate: 0,
      clickRate: 0,
      bounceRate: 0,
    }
  }

  const totalSent = activities.length
  let totalDelivered = 0
  let totalOpened = 0
  let totalClicked = 0
  let totalBounced = 0

  for (const activity of activities) {
    const metadata = activity.metadata as Record<string, unknown>
    if (metadata.status === 'delivered') totalDelivered++
    if (metadata.opened) totalOpened++
    if (metadata.clicked) totalClicked++
    if (metadata.bounced) totalBounced++
  }

  return {
    totalSent,
    totalDelivered,
    totalOpened,
    totalClicked,
    totalBounced,
    openRate: totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0,
    clickRate: totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0,
    bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
  }
}
