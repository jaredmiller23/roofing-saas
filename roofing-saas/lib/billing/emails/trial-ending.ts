/**
 * Trial Ending Email Template
 * Sent 3 days before trial ends via Stripe webhook
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface TrialEndingEmailParams {
  tenantName: string
  daysRemaining: number
  upgradeUrl: string
  trialEndDate: string
}

/**
 * Generate HTML for trial ending notification email
 */
export function createTrialEndingEmail(params: TrialEndingEmailParams): string {
  const { tenantName, daysRemaining, upgradeUrl, trialEndDate } = params

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      Your trial ends in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi there,
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      Your free trial of <strong>${tenantName}</strong>'s Professional plan ends on
      <strong>${trialEndDate}</strong>.
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      After your trial ends, you'll lose access to:
    </p>

    <ul style="color: #333; margin-bottom: 24px; padding-left: 24px;">
      <li>Claims tracking and management</li>
      <li>Email and SMS campaigns</li>
      <li>Storm intelligence and targeting</li>
      <li>QuickBooks integration</li>
    </ul>

    <p style="color: #333; margin-bottom: 24px;">
      <strong>Upgrade now</strong> to keep all your Professional features and continue
      growing your roofing business.
    </p>

    <div style="margin: 32px 0;">
      <a href="${upgradeUrl}" class="button" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Upgrade to Professional
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Questions about your subscription? Reply to this email and we'll be happy to help.
    </p>
  `

  return createEmailHTML(body, 'Your Trial Ends Soon')
}

/**
 * Get email subject for trial ending notification
 */
export function getTrialEndingSubject(daysRemaining: number): string {
  if (daysRemaining <= 1) {
    return 'Your trial ends tomorrow - upgrade now'
  }
  return `Your trial ends in ${daysRemaining} days`
}
