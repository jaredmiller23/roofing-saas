/**
 * ARIA Notification Utilities
 * Send email/SMS notifications to contacts and team members
 */

import { sendEmail } from '@/lib/resend/email'
import { sendSMS } from '@/lib/twilio/sms'
import { logger } from '@/lib/logger'
import type { SupabaseClient } from '@supabase/supabase-js'

interface NotifyContactParams {
  supabase: SupabaseClient
  tenantId: string
  contactId: string
  subject: string
  body: string
  channel?: 'email' | 'sms' | 'both'
}

interface NotifyTeamMemberParams {
  supabase: SupabaseClient
  tenantId: string
  assignedTo: string // Name string (fuzzy matched against user full_name)
  subject: string
  body: string
  channel?: 'email' | 'sms' | 'both'
}

interface NotifyResult {
  sent: boolean
  channels: string[]
}

/**
 * Send a notification to a contact (by contact ID).
 * Looks up email/phone from the contacts table.
 * Never throws — logs errors and returns { sent: false }.
 */
export async function notifyContact(params: NotifyContactParams): Promise<NotifyResult> {
  const { supabase, tenantId, contactId, subject, body, channel = 'sms' } = params
  const channels: string[] = []

  try {
    // Look up contact
    const { data: contact, error } = await supabase
      .from('contacts')
      .select('email, phone, first_name, last_name')
      .eq('id', contactId)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !contact) {
      logger.warn('[notify] Contact not found', { contactId, error })
      return { sent: false, channels }
    }

    // Send email if requested and email available
    if ((channel === 'email' || channel === 'both') && contact.email) {
      try {
        await sendEmail({
          to: contact.email,
          subject,
          html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        })
        channels.push('email')
      } catch (err) {
        logger.error('[notify] Failed to send email to contact', { contactId, error: err })
      }
    }

    // Send SMS if requested and phone available
    if ((channel === 'sms' || channel === 'both') && contact.phone) {
      try {
        await sendSMS({
          to: contact.phone,
          body,
        })
        channels.push('sms')
      } catch (err) {
        logger.error('[notify] Failed to send SMS to contact', { contactId, error: err })
      }
    }

    return { sent: channels.length > 0, channels }
  } catch (err) {
    logger.error('[notify] notifyContact failed', { contactId, error: err })
    return { sent: false, channels }
  }
}

/**
 * Send a notification to a team member (by name).
 * Resolves the name against tenant_users + auth.users, then sends via
 * enabled channels based on user notification preferences.
 * Never throws — logs errors and returns { sent: false }.
 */
export async function notifyTeamMember(params: NotifyTeamMemberParams): Promise<NotifyResult> {
  const { supabase, tenantId, assignedTo, subject, body, channel = 'email' } = params
  const channels: string[] = []

  try {
    // Find the team member by name via tenant_users join
    // tenant_users links user_id to tenant; auth.users has email + raw_user_meta_data
    const { data: tenantUsers, error: tuError } = await supabase
      .from('tenant_users')
      .select('user_id')
      .eq('tenant_id', tenantId)

    if (tuError || !tenantUsers?.length) {
      logger.warn('[notify] No tenant users found', { tenantId, error: tuError })
      return { sent: false, channels }
    }

    // Query users table to match by full_name (case-insensitive)
    const userIds = tenantUsers.map(tu => tu.user_id)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, raw_user_meta_data')
      .in('id', userIds)

    if (usersError || !users?.length) {
      logger.warn('[notify] No users found for tenant', { tenantId, error: usersError })
      return { sent: false, channels }
    }

    // Fuzzy match on name — compare lowercased
    const normalizedName = assignedTo.toLowerCase().trim()
    const matchedUser = users.find(u => {
      const meta = u.raw_user_meta_data as Record<string, unknown> | null
      const fullName = (meta?.full_name as string || '').toLowerCase().trim()
      return fullName === normalizedName || fullName.includes(normalizedName) || normalizedName.includes(fullName)
    })

    if (!matchedUser) {
      logger.warn('[notify] Team member not found by name', { assignedTo, tenantId })
      return { sent: false, channels }
    }

    const meta = matchedUser.raw_user_meta_data as Record<string, unknown> | null
    const email = matchedUser.email as string | undefined
    const phone = meta?.phone as string | undefined

    // Send email if requested and available
    if ((channel === 'email' || channel === 'both') && email) {
      try {
        await sendEmail({
          to: email,
          subject,
          html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
        })
        channels.push('email')
      } catch (err) {
        logger.error('[notify] Failed to send email to team member', { assignedTo, error: err })
      }
    }

    // Send SMS if requested and phone available
    if ((channel === 'sms' || channel === 'both') && phone) {
      try {
        await sendSMS({
          to: phone,
          body,
        })
        channels.push('sms')
      } catch (err) {
        logger.error('[notify] Failed to send SMS to team member', { assignedTo, error: err })
      }
    }

    return { sent: channels.length > 0, channels }
  } catch (err) {
    logger.error('[notify] notifyTeamMember failed', { assignedTo, error: err })
    return { sent: false, channels }
  }
}
