/**
 * Downgraded Email Template
 * Sent when grace period expires and account is downgraded
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface DowngradedEmailParams {
  tenantName: string
  upgradeUrl: string
}

/**
 * Generate HTML for downgrade notification email
 */
export function createDowngradedEmail(params: DowngradedEmailParams): string {
  const { tenantName, upgradeUrl } = params

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      Your account has been downgraded
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi there,
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      Your <strong>${tenantName}</strong> account has been downgraded to the
      <strong>Starter</strong> plan because your grace period has expired.
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      You now have limited access:
    </p>

    <ul style="color: #333; margin-bottom: 24px; padding-left: 24px;">
      <li>✅ Pipeline management (up to 100 contacts)</li>
      <li>✅ Basic project tracking</li>
      <li>✅ Document signatures</li>
      <li>❌ Claims tracking - <em>disabled</em></li>
      <li>❌ Campaigns - <em>disabled</em></li>
      <li>❌ Storm intelligence - <em>disabled</em></li>
      <li>❌ QuickBooks integration - <em>disabled</em></li>
    </ul>

    <p style="color: #333; margin-bottom: 24px;">
      Your Professional data is still saved. <strong>Upgrade anytime</strong> to
      restore full access.
    </p>

    <div style="margin: 32px 0;">
      <a href="${upgradeUrl}" class="button" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Upgrade to Professional
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Questions? Reply to this email and we'll be happy to help.
    </p>
  `

  return createEmailHTML(body, 'Account Downgraded')
}

/**
 * Get email subject for downgrade notification
 */
export function getDowngradedSubject(): string {
  return 'Your account has been downgraded to Starter'
}
