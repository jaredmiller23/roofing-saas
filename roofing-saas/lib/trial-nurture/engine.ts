/**
 * Trial Nurture Email Engine
 *
 * Processes the trial email sequence for active trial tenants.
 * Runs daily via cron to send time-based and behavioral emails.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { isResendConfigured } from '@/lib/resend/client'
import { sendEmail } from '@/lib/resend/email'
import { getTenantAdminEmail } from '@/lib/billing/grace-period'
import { evaluateChecklist } from '@/lib/onboarding/checklist-evaluator'
import { logger } from '@/lib/logger'
import type { TrialEmailKey, TrialEmailScheduleEntry, GettingStartedVariant } from './types'
import type { OnboardingPriority } from '@/lib/onboarding/types'
import {
  createWelcomeEmail,
  getWelcomeSubject,
  createGettingStartedEmail,
  getGettingStartedSubject,
  createFeatureSpotlightEmail,
  getFeatureSpotlightSubject,
  getFeaturesForPriorities,
  createSocialProofEmail,
  getSocialProofSubject,
  createFinalReminderEmail,
  getFinalReminderSubject,
} from './emails'

// ============================================================================
// Schedule
// ============================================================================

const TRIAL_EMAIL_SCHEDULE: TrialEmailScheduleEntry[] = [
  { key: 'welcome', day: 0, behavioral: false },
  { key: 'getting_started', day: 2, behavioral: true },
  { key: 'feature_spotlight', day: 5, behavioral: true },
  { key: 'social_proof', day: 8, behavioral: false },
  // Day 11 handled by Stripe webhook (trial_will_end)
  { key: 'final_reminder', day: 13, behavioral: false },
]

export function getTrialEmailSchedule(): TrialEmailScheduleEntry[] {
  return TRIAL_EMAIL_SCHEDULE
}

// ============================================================================
// Main Processing
// ============================================================================

export interface ProcessingResult {
  tenantsProcessed: number
  emailsSent: number
  errors: number
  details: Array<{ tenantId: string; emailKey: string; status: 'sent' | 'skipped' | 'error'; reason?: string }>
}

/**
 * Process all trial nurture emails for active trial tenants.
 * Called by the daily cron job.
 */
export async function processTrialNurtureEmails(): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    tenantsProcessed: 0,
    emailsSent: 0,
    errors: 0,
    details: [],
  }

  if (!isResendConfigured()) {
    logger.warn('[TrialNurture] Resend not configured, skipping')
    return result
  }

  const supabase = await createAdminClient()

  // Find all active trial subscriptions
  const { data: trialSubscriptions, error } = await supabase
    .from('subscriptions')
    .select('tenant_id, trial_started_at, trial_ends_at')
    .eq('status', 'trialing')
    .not('trial_started_at', 'is', null)
    .not('trial_ends_at', 'is', null)

  if (error) {
    logger.error('[TrialNurture] Failed to fetch trial subscriptions', { error })
    return result
  }

  if (!trialSubscriptions || trialSubscriptions.length === 0) {
    logger.info('[TrialNurture] No active trial subscriptions found')
    return result
  }

  logger.info(`[TrialNurture] Processing ${trialSubscriptions.length} trial tenants`)

  for (const sub of trialSubscriptions) {
    result.tenantsProcessed++

    try {
      const trialStartedAt = new Date(sub.trial_started_at!)
      const trialEndsAt = new Date(sub.trial_ends_at!)
      const now = new Date()

      // Compute trial age in days
      const trialAgeDays = Math.floor(
        (now.getTime() - trialStartedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Compute days remaining
      const daysRemaining = Math.max(
        0,
        Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      )

      // Get already-sent emails for this tenant
      const { data: sentEmails } = await supabase
        .from('trial_emails')
        .select('email_key')
        .eq('tenant_id', sub.tenant_id)

      const sentKeys = new Set((sentEmails ?? []).map((e) => e.email_key))

      // Determine which emails are due
      const dueEmails = TRIAL_EMAIL_SCHEDULE.filter(
        (entry) => trialAgeDays >= entry.day && !sentKeys.has(entry.key)
      )

      if (dueEmails.length === 0) continue

      // Get admin email (one lookup per tenant, shared across all due emails)
      const adminInfo = await getTenantAdminEmail(sub.tenant_id)
      if (!adminInfo) {
        for (const entry of dueEmails) {
          result.details.push({
            tenantId: sub.tenant_id,
            emailKey: entry.key,
            status: 'skipped',
            reason: 'No admin email found',
          })
        }
        continue
      }

      // Send each due email
      for (const entry of dueEmails) {
        try {
          const { subject, html } = await buildEmailContent(
            entry.key,
            sub.tenant_id,
            adminInfo,
            daysRemaining
          )

          const emailResult = await sendEmail({
            to: adminInfo.email,
            subject,
            html,
          })

          // Record in trial_emails
          await supabase.from('trial_emails').insert({
            tenant_id: sub.tenant_id,
            email_key: entry.key,
            recipient_email: adminInfo.email,
            resend_id: emailResult.id,
          })

          result.emailsSent++
          result.details.push({
            tenantId: sub.tenant_id,
            emailKey: entry.key,
            status: 'sent',
          })

          logger.info('[TrialNurture] Email sent', {
            tenantId: sub.tenant_id,
            emailKey: entry.key,
            to: adminInfo.email,
          })
        } catch (sendError) {
          result.errors++
          result.details.push({
            tenantId: sub.tenant_id,
            emailKey: entry.key,
            status: 'error',
            reason: (sendError as Error).message,
          })

          logger.error('[TrialNurture] Failed to send email', {
            tenantId: sub.tenant_id,
            emailKey: entry.key,
            error: sendError,
          })
        }
      }
    } catch (tenantError) {
      result.errors++
      logger.error('[TrialNurture] Error processing tenant', {
        tenantId: sub.tenant_id,
        error: tenantError,
      })
    }
  }

  return result
}

// ============================================================================
// Welcome Email (Immediate)
// ============================================================================

/**
 * Send the welcome email immediately after trial setup.
 * Called from setup-trial route (fire-and-forget).
 */
export async function sendTrialWelcomeEmail(tenantId: string): Promise<void> {
  if (!isResendConfigured()) {
    logger.warn('[TrialNurture] Resend not configured, skipping welcome email')
    return
  }

  const adminInfo = await getTenantAdminEmail(tenantId)
  if (!adminInfo) {
    logger.warn('[TrialNurture] No admin email for welcome', { tenantId })
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.jobclarity.io'

  const html = createWelcomeEmail({
    recipientName: adminInfo.name,
    tenantName: adminInfo.tenantName,
    appUrl,
  })

  const emailResult = await sendEmail({
    to: adminInfo.email,
    subject: getWelcomeSubject(),
    html,
  })

  // Record in trial_emails
  const supabase = await createAdminClient()
  await supabase.from('trial_emails').insert({
    tenant_id: tenantId,
    email_key: 'welcome',
    recipient_email: adminInfo.email,
    resend_id: emailResult.id,
  })

  logger.info('[TrialNurture] Welcome email sent', {
    tenantId,
    to: adminInfo.email,
  })
}

// ============================================================================
// Email Content Builder
// ============================================================================

async function buildEmailContent(
  emailKey: TrialEmailKey,
  tenantId: string,
  adminInfo: { email: string; name: string; tenantName: string },
  daysRemaining: number
): Promise<{ subject: string; html: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.jobclarity.io'
  const upgradeUrl = `${appUrl}/settings?tab=billing`

  switch (emailKey) {
    case 'welcome':
      return {
        subject: getWelcomeSubject(),
        html: createWelcomeEmail({
          recipientName: adminInfo.name,
          tenantName: adminInfo.tenantName,
          appUrl,
        }),
      }

    case 'getting_started': {
      const variant = await determineGettingStartedVariant(tenantId)
      return {
        subject: getGettingStartedSubject(adminInfo.name),
        html: createGettingStartedEmail({
          recipientName: adminInfo.name,
          appUrl,
          variant,
        }),
      }
    }

    case 'feature_spotlight': {
      const priorities = await getOnboardingPriorities(tenantId)
      const features = getFeaturesForPriorities(priorities)
      return {
        subject: getFeatureSpotlightSubject(),
        html: createFeatureSpotlightEmail({
          recipientName: adminInfo.name,
          appUrl,
          features,
          daysRemaining,
        }),
      }
    }

    case 'social_proof':
      return {
        subject: getSocialProofSubject(),
        html: createSocialProofEmail({
          recipientName: adminInfo.name,
          appUrl,
          daysRemaining,
        }),
      }

    case 'final_reminder':
      return {
        subject: getFinalReminderSubject(),
        html: createFinalReminderEmail({
          recipientName: adminInfo.name,
          tenantName: adminInfo.tenantName,
          appUrl,
          upgradeUrl,
        }),
      }
  }
}

// ============================================================================
// Behavioral Helpers
// ============================================================================

/**
 * Determine the Day 2 email variant based on user activity.
 */
async function determineGettingStartedVariant(
  tenantId: string
): Promise<GettingStartedVariant> {
  try {
    // Check if onboarding was completed
    const supabase = await createAdminClient()
    const { data: tenant } = await supabase
      .from('tenants')
      .select('onboarding_completed')
      .eq('id', tenantId)
      .single()

    if (!tenant?.onboarding_completed) {
      return 'no_onboarding'
    }

    // Check checklist state for activity
    const checklist = await evaluateChecklist(tenantId)
    const hasContacts = checklist.items.find((i) => i.key === 'add_contact')?.completed ?? false
    const hasProjects = checklist.items.find((i) => i.key === 'create_project')?.completed ?? false

    if (!hasContacts) return 'no_contacts'
    if (!hasProjects) return 'no_projects'
    return 'active_user'
  } catch (error) {
    logger.error('[TrialNurture] Error determining variant', { tenantId, error })
    return 'no_contacts' // safe default
  }
}

/**
 * Get onboarding priorities from tenant settings for Day 5 email.
 */
async function getOnboardingPriorities(
  tenantId: string
): Promise<OnboardingPriority[]> {
  try {
    const supabase = await createAdminClient()
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('custom_settings')
      .eq('tenant_id', tenantId)
      .single()

    const onboarding = (settings?.custom_settings as Record<string, unknown>)
      ?.onboarding as Record<string, unknown> | undefined
    const priorities = onboarding?.priorities as OnboardingPriority[] | undefined

    return priorities && Array.isArray(priorities) ? priorities : []
  } catch {
    return []
  }
}
