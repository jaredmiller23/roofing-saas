/**
 * Payment Failed Email Template
 * Sent when an invoice payment fails
 */

import { createEmailHTML } from '@/lib/resend/email'

export interface PaymentFailedEmailParams {
  tenantName: string
  amount: string
  updatePaymentUrl: string
  invoiceUrl?: string
  attemptNumber: number
  gracePeriodDays: number
  gracePeriodEndDate: string
}

/**
 * Generate HTML for payment failed notification email
 */
export function createPaymentFailedEmail(params: PaymentFailedEmailParams): string {
  const {
    tenantName,
    amount,
    updatePaymentUrl,
    invoiceUrl,
    attemptNumber,
    gracePeriodDays,
    gracePeriodEndDate
  } = params

  const isFirstAttempt = attemptNumber <= 1

  const body = `
    <h1 style="color: #C62828; font-size: 24px; margin-bottom: 24px;">
      ${isFirstAttempt ? 'Payment Failed' : 'Payment Still Failing'}
    </h1>

    <p style="color: #333; margin-bottom: 16px;">
      Hi there,
    </p>

    <p style="color: #333; margin-bottom: 16px;">
      We were unable to process your payment of <strong>${amount}</strong> for
      <strong>${tenantName}</strong>.
    </p>

    ${attemptNumber > 1 ? `
    <p style="color: #C62828; margin-bottom: 16px;">
      This is attempt #${attemptNumber}. We will retry the payment automatically,
      but please update your payment method to avoid service interruption.
    </p>
    ` : ''}

    <div style="background-color: #FFEBEE; border-left: 4px solid #C62828; padding: 16px; margin: 24px 0;">
      <p style="color: #333; margin: 0;">
        <strong>Action Required:</strong> Update your payment method before ${gracePeriodEndDate}
        (${gracePeriodDays} days) to maintain access to your Professional features.
      </p>
    </div>

    <div style="margin: 32px 0;">
      <a href="${updatePaymentUrl}" class="button" style="background-color: #FF8243; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Update Payment Method
      </a>
    </div>

    ${invoiceUrl ? `
    <p style="color: #666; font-size: 14px; margin-top: 24px;">
      <a href="${invoiceUrl}" style="color: #2D7A7A;">View Invoice</a>
    </p>
    ` : ''}

    <p style="color: #666; font-size: 14px; margin-top: 32px;">
      If you believe this is an error or need assistance, reply to this email.
    </p>
  `

  return createEmailHTML(body, 'Payment Failed')
}

/**
 * Get email subject for payment failed notification
 */
export function getPaymentFailedSubject(attemptNumber: number): string {
  if (attemptNumber <= 1) {
    return 'Action Required: Payment failed for your subscription'
  }
  return `Urgent: Payment still failing (attempt #${attemptNumber})`
}
