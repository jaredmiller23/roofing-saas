/**
 * Social Proof Email Template (Day 8)
 * ROI stats and value proposition
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface SocialProofEmailParams {
  recipientName: string
  appUrl: string
  daysRemaining: number
}

export function createSocialProofEmail(params: SocialProofEmailParams): string {
  const { recipientName, appUrl, daysRemaining } = params

  const body = `
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">
      How roofing companies save 10+ hours a week
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi ${recipientName},
    </p>

    <p style="color: #333; margin-bottom: 24px;">
      Roofing contractors who switch from spreadsheets and paper to JobClarity
      consistently report saving serious time. Here&apos;s where the hours come from:
    </p>

    <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
      <tr>
        <td style="padding: 12px 16px; background-color: #FFF8F5; border-bottom: 1px solid #FFE8DD; border-radius: 8px 8px 0 0;">
          <strong style="color: #FF8243; font-size: 20px;">3 hrs</strong>
          <span style="color: #1a1a1a;"> &mdash; No more hunting for contact info</span>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Every homeowner, adjuster, and sub in one searchable place.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #FFF8F5; border-bottom: 1px solid #FFE8DD;">
          <strong style="color: #FF8243; font-size: 20px;">4 hrs</strong>
          <span style="color: #1a1a1a;"> &mdash; Pipeline visibility replaces status meetings</span>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Everyone sees where every job stands without asking.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #FFF8F5; border-bottom: 1px solid #FFE8DD;">
          <strong style="color: #FF8243; font-size: 20px;">2 hrs</strong>
          <span style="color: #1a1a1a;"> &mdash; Estimates in minutes, not hours</span>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Professional quotes with templates, sent and tracked digitally.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; background-color: #FFF8F5; border-radius: 0 0 8px 8px;">
          <strong style="color: #FF8243; font-size: 20px;">2 hrs</strong>
          <span style="color: #1a1a1a;"> &mdash; Territory tracking eliminates wasted knocks</span>
          <p style="color: #555; margin: 4px 0 0; font-size: 14px;">
            Know which doors have been knocked and by whom.
          </p>
        </td>
      </tr>
    </table>

    <div style="background-color: #F0FDF4; border-left: 4px solid #22C55E; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0;">
      <p style="color: #333; margin: 0; font-size: 15px;">
        <strong>Bottom line:</strong> At $149/mo for Professional, JobClarity pays for
        itself in the first week if it saves your team even 2 hours.
      </p>
    </div>

    <p style="color: #333; margin-bottom: 16px;">
      You have <strong>${daysRemaining} days</strong> left to try everything. Make the most of it.
    </p>

    <div style="margin: 32px 0; text-align: center;">
      <a href="${appUrl}/dashboard" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
        Go to Your Dashboard
      </a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      Want to see how other roofing companies use JobClarity? Reply and we&apos;ll share examples.
    </p>
  `

  return createEmailHTML(body, 'Save 10+ Hours a Week')
}

export function getSocialProofSubject(): string {
  return 'How roofing companies save 10+ hrs/week'
}
