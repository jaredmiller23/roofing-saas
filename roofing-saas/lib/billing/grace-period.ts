/**
 * Grace Period Management
 *
 * Handles grace period logic for:
 * - Trial expiration
 * - Payment failures
 *
 * Grace period gives users 7 days to fix payment issues before downgrade.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/resend/email'
import { logger } from '@/lib/logger'
import { logSubscriptionEvent } from './subscription'
import {
  createTrialEndedEmail,
  getTrialEndedSubject,
  createGracePeriodEndingEmail,
  getGracePeriodEndingSubject,
  createDowngradedEmail,
  getDowngradedSubject,
} from './emails'

// Grace period configuration
export const GRACE_PERIOD_DAYS = 7

export type GracePeriodReason = 'trial_ended' | 'payment_failed'

export interface GracePeriodStatus {
  isInGracePeriod: boolean
  gracePeriodEndsAt: Date | null
  daysRemaining: number | null
  reason: GracePeriodReason | null
}

// =============================================================================
// Get Tenant Admin Email
// =============================================================================

/**
 * Get the primary admin email for a tenant
 * Used for sending billing notifications
 */
export async function getTenantAdminEmail(tenantId: string): Promise<{
  email: string
  name: string
  tenantName: string
} | null> {
  const supabase = await createAdminClient()

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    logger.warn('Tenant not found for admin email lookup', { tenantId })
    return null
  }

  // Get owner or first admin from tenant_users
  const { data: adminMember } = await supabase
    .from('tenant_users')
    .select('user_id, role')
    .eq('tenant_id', tenantId)
    .in('role', ['owner', 'admin'])
    .order('role', { ascending: true }) // owner first
    .limit(1)
    .single()

  if (!adminMember?.user_id) {
    logger.warn('No admin found for tenant', { tenantId })
    return null
  }

  // Fetch user details from auth.users via admin client
  const { data: authUser } = await supabase
    .from('users')
    .select('id, email, raw_user_meta_data')
    .eq('id', adminMember.user_id)
    .single()

  if (!authUser) {
    logger.warn('Admin user not found in auth', { userId: adminMember.user_id })
    return null
  }

  const meta = (authUser.raw_user_meta_data || {}) as Record<string, string>
  const user = {
    id: authUser.id as string,
    email: authUser.email as string,
    full_name: meta.full_name || null,
  }

  return {
    email: user.email,
    name: user.full_name || 'there',
    tenantName: tenant.name,
  }
}

// =============================================================================
// Start Grace Period
// =============================================================================

/**
 * Start a grace period for a tenant
 * Called when trial ends or payment fails
 */
export async function startGracePeriod(
  tenantId: string,
  reason: GracePeriodReason
): Promise<void> {
  const supabase = await createAdminClient()

  // Calculate grace period end date
  const gracePeriodEndsAt = new Date()
  gracePeriodEndsAt.setDate(gracePeriodEndsAt.getDate() + GRACE_PERIOD_DAYS)

  // Update tenant
  const { error } = await supabase
    .from('tenants')
    .update({ grace_period_ends_at: gracePeriodEndsAt.toISOString() })
    .eq('id', tenantId)

  if (error) {
    logger.error('Failed to start grace period', { tenantId, reason, error })
    throw error
  }

  // Log event
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  if (subscription) {
    await logSubscriptionEvent(tenantId, subscription.id, {
      event_type: 'grace_period_started',
      metadata: {
        reason,
        grace_period_ends_at: gracePeriodEndsAt.toISOString(),
        days: GRACE_PERIOD_DAYS,
      },
      initiated_by: 'system',
    })
  }

  logger.info('Grace period started', {
    tenantId,
    reason,
    gracePeriodEndsAt: gracePeriodEndsAt.toISOString(),
  })

  // Send notification email
  await sendGracePeriodStartedEmail(tenantId, reason, gracePeriodEndsAt)
}

/**
 * Send email when grace period starts (trial ended)
 */
async function sendGracePeriodStartedEmail(
  tenantId: string,
  reason: GracePeriodReason,
  gracePeriodEndsAt: Date
): Promise<void> {
  const adminInfo = await getTenantAdminEmail(tenantId)
  if (!adminInfo) {
    logger.warn('Cannot send grace period email - no admin found', { tenantId })
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'
  const upgradeUrl = `${baseUrl}/settings?tab=billing`

  // Only send trial ended email from here - payment failed has its own email
  if (reason !== 'trial_ended') {
    return
  }

  const html = createTrialEndedEmail({
    tenantName: adminInfo.tenantName,
    upgradeUrl,
    gracePeriodDays: GRACE_PERIOD_DAYS,
    gracePeriodEndDate: gracePeriodEndsAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  })

  try {
    await sendEmail({
      to: adminInfo.email,
      subject: getTrialEndedSubject(),
      html,
    })

    logger.info('Sent trial ended email', { tenantId, to: adminInfo.email })
  } catch (error) {
    logger.error('Failed to send trial ended email', { tenantId, error })
  }
}

// =============================================================================
// Check Grace Period
// =============================================================================

/**
 * Get grace period status for a tenant
 */
export async function getGracePeriodStatus(
  tenantId: string
): Promise<GracePeriodStatus> {
  const supabase = await createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('grace_period_ends_at')
    .eq('id', tenantId)
    .single()

  if (!tenant?.grace_period_ends_at) {
    return {
      isInGracePeriod: false,
      gracePeriodEndsAt: null,
      daysRemaining: null,
      reason: null,
    }
  }

  const gracePeriodEndsAt = new Date(tenant.grace_period_ends_at)
  const now = new Date()

  if (gracePeriodEndsAt <= now) {
    // Grace period has expired
    return {
      isInGracePeriod: false,
      gracePeriodEndsAt,
      daysRemaining: 0,
      reason: null, // Would need to look up from events to determine reason
    }
  }

  // Calculate days remaining
  const msRemaining = gracePeriodEndsAt.getTime() - now.getTime()
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

  return {
    isInGracePeriod: true,
    gracePeriodEndsAt,
    daysRemaining,
    reason: null, // Would need to look up from events to determine reason
  }
}

/**
 * Check if grace period has expired for a tenant
 */
export async function isGracePeriodExpired(tenantId: string): Promise<boolean> {
  const status = await getGracePeriodStatus(tenantId)
  return status.gracePeriodEndsAt !== null && !status.isInGracePeriod
}

// =============================================================================
// Clear Grace Period
// =============================================================================

/**
 * Clear grace period (when user upgrades or fixes payment)
 */
export async function clearGracePeriod(tenantId: string): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await supabase
    .from('tenants')
    .update({ grace_period_ends_at: null })
    .eq('id', tenantId)

  if (error) {
    logger.error('Failed to clear grace period', { tenantId, error })
    throw error
  }

  logger.info('Grace period cleared', { tenantId })
}

// =============================================================================
// Grace Period Notifications
// =============================================================================

/**
 * Send grace period ending warning email
 * Called by cron job 3 days before expiration
 */
export async function sendGracePeriodEndingEmail(
  tenantId: string,
  daysRemaining: number,
  reason: GracePeriodReason
): Promise<void> {
  const adminInfo = await getTenantAdminEmail(tenantId)
  if (!adminInfo) {
    logger.warn('Cannot send grace period ending email - no admin found', { tenantId })
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'
  const upgradeUrl = `${baseUrl}/settings?tab=billing`

  // Calculate end date
  const gracePeriodEndDate = new Date()
  gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + daysRemaining)

  const html = createGracePeriodEndingEmail({
    tenantName: adminInfo.tenantName,
    daysRemaining,
    upgradeUrl,
    gracePeriodEndDate: gracePeriodEndDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
    reason,
  })

  try {
    await sendEmail({
      to: adminInfo.email,
      subject: getGracePeriodEndingSubject(daysRemaining),
      html,
    })

    logger.info('Sent grace period ending email', {
      tenantId,
      to: adminInfo.email,
      daysRemaining,
    })
  } catch (error) {
    logger.error('Failed to send grace period ending email', { tenantId, error })
  }
}

/**
 * Send downgrade notification email
 * Called when grace period expires
 */
export async function sendDowngradedEmail(tenantId: string): Promise<void> {
  const adminInfo = await getTenantAdminEmail(tenantId)
  if (!adminInfo) {
    logger.warn('Cannot send downgrade email - no admin found', { tenantId })
    return
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com'
  const upgradeUrl = `${baseUrl}/settings?tab=billing`

  const html = createDowngradedEmail({
    tenantName: adminInfo.tenantName,
    upgradeUrl,
  })

  try {
    await sendEmail({
      to: adminInfo.email,
      subject: getDowngradedSubject(),
      html,
    })

    logger.info('Sent downgrade email', { tenantId, to: adminInfo.email })
  } catch (error) {
    logger.error('Failed to send downgrade email', { tenantId, error })
  }
}

// =============================================================================
// Downgrade to Starter
// =============================================================================

/**
 * Downgrade tenant to Starter plan after grace period expires
 */
export async function downgradeToStarter(tenantId: string): Promise<void> {
  const supabase = await createAdminClient()

  // Update tenant tier
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      subscription_tier: 'starter',
      grace_period_ends_at: null, // Clear grace period
    })
    .eq('id', tenantId)

  if (tenantError) {
    logger.error('Failed to downgrade tenant', { tenantId, error: tenantError })
    throw tenantError
  }

  // Update subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  if (subscription) {
    await supabase
      .from('subscriptions')
      .update({
        plan_tier: 'starter',
        plan_name: 'Starter',
        status: 'active', // They're on Starter now, which is free
      })
      .eq('id', subscription.id)

    // Log event
    await logSubscriptionEvent(tenantId, subscription.id, {
      event_type: 'plan_downgraded',
      new_status: 'active',
      new_plan: 'starter',
      metadata: { reason: 'grace_period_expired' },
      initiated_by: 'system',
    })
  }

  logger.info('Tenant downgraded to Starter', { tenantId })

  // Send notification email
  await sendDowngradedEmail(tenantId)
}
