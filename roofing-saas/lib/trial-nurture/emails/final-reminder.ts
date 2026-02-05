/**
 * Final Reminder Email Template (Day 13)
 * Last day urgency + feature loss list + upgrade CTA
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface FinalReminderEmailParams {
  recipientName: string
  tenantName: string
  appUrl: string
  upgradeUrl: string
}

export function createFinalReminderEmail(params: FinalReminderEmailParams): string {
  const { recipientName, tenantName, appUrl, upgradeUrl } = params

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      Your trial ends tomorrow
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi ${recipientName},
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      Your <strong>${tenantName}</strong> Professional trial expires tomorrow. After that,
      your account will be downgraded to the Starter plan.
    </p>

    <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #333; margin: 0 0 8px; font-weight: 600;">
        Features you&apos;ll lose access to:
      </p>
      <ul style="color: #555; margin: 0; padding-left: 20px; font-size: 14px;">
        <li>Claims tracking and management</li>
        <li>Email and SMS campaigns</li>
        <li>Storm intelligence and targeting</li>
        <li>QuickBooks integration</li>
        <li>Advanced reporting and analytics</li>
        <li>Territory mapping</li>
      </ul>
    </div>

    <p style="color: #333; margin-bottom: 16px;">
      Your data is safe &mdash; nothing gets deleted. Upgrade anytime to pick up right
      where you left off.
    </p>

    <div style="background-color: #FFF8F5; padding: 20px; border-radius: 8px; margin: 24px 0; text-align: center;">
      <p style="color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 0 0 4px;">
        Professional Plan
      </p>
      <p style="color: #FF8243; font-size: 28px; font-weight: 700; margin: 0 0 8px;">
        $149<span style="font-size: 14px; color: #666; font-weight: 400;">/month</span>
      </p>
      <p style="color: #555; font-size: 14px; margin: 0 0 16px;">
        Everything you need to run your roofing business
      </p>
      <a href="${upgradeUrl}" style="background-color: #FF8243; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Upgrade Now
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Not ready? No problem. Your Starter plan keeps basic features active.
      <a href="${appUrl}/settings?tab=billing" style="color: #FF8243;">Compare plans</a>
    </p>
  `

  return createEmailHTML(body, 'Your Trial Ends Tomorrow')
}

export function getFinalReminderSubject(): string {
  return 'Last day to keep your Professional features'
}
