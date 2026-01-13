/**
 * Trial Ended Email Template
 * Sent when trial ends and grace period begins
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface TrialEndedEmailParams {
  tenantName: string
  upgradeUrl: string
  gracePeriodDays: number
  gracePeriodEndDate: string
}

/**
 * Generate HTML for trial ended notification email
 */
export function createTrialEndedEmail(params: TrialEndedEmailParams): string {
  const { tenantName, upgradeUrl, gracePeriodDays, gracePeriodEndDate } = params

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      Your trial has ended
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi there,
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      Your free trial of <strong>${tenantName}</strong>'s Professional plan has ended.
      You've been downgraded to the Starter plan.
    </p>

    <div style="background-color: #FFF3E0; border-left: 4px solid #FF8243; padding: 16px; margin: 24px 0;">
      <p style="color: #333; margin: 0;">
        <strong>Grace Period:</strong> You have ${gracePeriodDays} days (until ${gracePeriodEndDate})
        to upgrade and keep access to your Professional features and data.
      </p>
    </div>

    <p style="color: #333; margin-bottom: 16px;">
      Features you no longer have access to:
    </p>

    <ul style="color: #333; margin-bottom: 24px; padding-left: 24px;">
      <li>Claims tracking and management</li>
      <li>Email and SMS campaigns</li>
      <li>Storm intelligence and targeting</li>
      <li>QuickBooks integration</li>
    </ul>

    <p style="color: #333; margin-bottom: 24px;">
      <strong>Upgrade today</strong> to restore full access and continue growing your
      roofing business.
    </p>

    <div style="margin: 32px 0;">
      <a href="${upgradeUrl}" class="button" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Upgrade Now
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Questions? Reply to this email and we'll be happy to help.
    </p>
  `

  return createEmailHTML(body, 'Your Trial Has Ended')
}

/**
 * Get email subject for trial ended notification
 */
export function getTrialEndedSubject(): string {
  return 'Your trial has ended - upgrade to keep your features'
}
