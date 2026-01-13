/**
 * Grace Period Ending Email Template
 * Sent 3 days before grace period expires
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface GracePeriodEndingEmailParams {
  tenantName: string
  daysRemaining: number
  upgradeUrl: string
  gracePeriodEndDate: string
  reason: 'trial_ended' | 'payment_failed'
}

/**
 * Generate HTML for grace period ending notification email
 */
export function createGracePeriodEndingEmail(params: GracePeriodEndingEmailParams): string {
  const { tenantName, daysRemaining, upgradeUrl, gracePeriodEndDate, reason } = params

  const reasonText = reason === 'trial_ended'
    ? 'your trial ended'
    : 'your payment failed'

  const body = `
    <h1 style="color: #C62828; font-size: 24px; margin-bottom: 24px;">
      ⚠️ Final Notice: ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi there,
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      This is a final reminder that your grace period for <strong>${tenantName}</strong>
      expires on <strong>${gracePeriodEndDate}</strong>.
    </p>

    <div style="background-color: #FFEBEE; border-left: 4px solid #C62828; padding: 16px; margin: 24px 0;">
      <p style="color: #333; margin: 0; font-weight: bold;">
        After ${gracePeriodEndDate}, you will permanently lose access to Professional features.
      </p>
    </div>

    <p style="color: #333; margin-bottom: 16px;">
      Since ${reasonText}, you've been in a grace period. Here's what happens if you
      don't upgrade:
    </p>

    <ul style="color: #333; margin-bottom: 24px; padding-left: 24px;">
      <li>Claims data will become read-only</li>
      <li>Active campaigns will be paused</li>
      <li>Storm tracking will be disabled</li>
      <li>QuickBooks sync will stop</li>
    </ul>

    <p style="color: #333; margin-bottom: 24px;">
      <strong>Don't lose your data.</strong> Upgrade now to maintain full access.
    </p>

    <div style="margin: 32px 0;">
      <a href="${upgradeUrl}" class="button" style="background-color: #C62828; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Upgrade Now - Don't Lose Access
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Need help? Reply to this email or contact support immediately.
    </p>
  `

  return createEmailHTML(body, 'Final Notice: Grace Period Ending')
}

/**
 * Get email subject for grace period ending notification
 */
export function getGracePeriodEndingSubject(daysRemaining: number): string {
  if (daysRemaining <= 1) {
    return '⚠️ URGENT: Your access expires tomorrow'
  }
  return `⚠️ Final Notice: ${daysRemaining} days until you lose access`
}
