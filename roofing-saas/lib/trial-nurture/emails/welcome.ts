/**
 * Welcome Email Template (Day 0)
 * Sent immediately after trial setup
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface WelcomeEmailParams {
  recipientName: string
  tenantName: string
  appUrl: string
}

export function createWelcomeEmail(params: WelcomeEmailParams): string {
  const { recipientName, tenantName, appUrl } = params

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      Welcome to JobClarity, ${recipientName}!
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Your <strong>${tenantName}</strong> account is ready. You have 14 days of full
      Professional access &mdash; no credit card required.
    </p>

    <p style="color: #333; margin-bottom: 8px; font-weight: 600;">
      Here&apos;s how to get the most out of your trial:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr>
        <td style="padding: 16px; background-color: #FFF8F5; border-radius: 8px 8px 0 0; border-bottom: 1px solid #FFE8DD;">
          <strong style="color: #FF8243; font-size: 18px;">1.</strong>
          <strong style="color: #1a1a1a;"> Add your first contact</strong>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Import a homeowner, adjuster, or referral partner to start building your CRM.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px; background-color: #FFF8F5; border-bottom: 1px solid #FFE8DD;">
          <strong style="color: #FF8243; font-size: 18px;">2.</strong>
          <strong style="color: #1a1a1a;"> Create a project</strong>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Track a roofing job from lead to completion with your sales pipeline.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 16px; background-color: #FFF8F5; border-radius: 0 0 8px 8px;">
          <strong style="color: #FF8243; font-size: 18px;">3.</strong>
          <strong style="color: #1a1a1a;"> Invite your team</strong>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Add crew leads or office staff so everyone&apos;s on the same page.
          </p>
        </td>
      </tr>
    </table>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}/dashboard" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Go to Your Dashboard
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Questions? Just reply to this email &mdash; we read every one.
    </p>
  `

  return createEmailHTML(body, 'Welcome to JobClarity')
}

export function getWelcomeSubject(): string {
  return 'Welcome to JobClarity — here\'s your quick-start guide'
}
