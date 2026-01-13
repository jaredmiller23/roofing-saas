/**
 * Signature Document Reminder Email Templates
 * 
 * Provides HTML email templates for reminding recipients to sign documents
 * Uses industry-standard 3-reminder cadence:
 * - Friendly reminder: 7 days before expiration
 * - Urgent reminder: 3 days before expiration
 * - Final reminder: 1 day before expiration
 */

import { createEmailHTML } from '@/lib/resend/email'

export type ReminderType = 'friendly' | 'urgent' | 'final'

export interface SignatureReminderData {
  recipientName: string
  documentTitle: string
  projectName?: string
  signingUrl: string
  expirationDate: string
  daysRemaining: number
  reminderType: ReminderType
}

/**
 * Get the subject line based on reminder urgency
 */
export function getReminderSubject(data: SignatureReminderData): string {
  switch (data.reminderType) {
    case 'friendly':
      return 'Reminder: Please sign "' + data.documentTitle + '"'
    case 'urgent':
      return 'Action Required: Sign "' + data.documentTitle + '" - ' + data.daysRemaining + ' days left'
    case 'final':
      return 'FINAL NOTICE: "' + data.documentTitle + '" expires tomorrow'
    default:
      return 'Reminder: Please sign "' + data.documentTitle + '"'
  }
}

/**
 * Get the email body content based on reminder urgency
 */
function getReminderBody(data: SignatureReminderData): string {
  const recipientName = data.recipientName
  const documentTitle = data.documentTitle
  const projectName = data.projectName
  const signingUrl = data.signingUrl
  const expirationDate = data.expirationDate
  const daysRemaining = data.daysRemaining
  const reminderType = data.reminderType

  // Common elements
  const projectLine = projectName ? '<p style="margin: 4px 0;"><strong>Project:</strong> ' + projectName + '</p>' : ''
  
  const documentDetails = [
    '<div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 24px 0;">',
    '<h3 style="margin: 0 0 12px 0; color: #374151;">Document Details</h3>',
    '<p style="margin: 4px 0;"><strong>Document:</strong> ' + documentTitle + '</p>',
    projectLine,
    '<p style="margin: 4px 0;"><strong>Deadline:</strong> ' + expirationDate + '</p>',
    '</div>'
  ].join('\n')

  const signButton = [
    '<p style="text-align: center;">',
    '<a href="' + signingUrl + '" class="button" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">',
    'Review & Sign Document',
    '</a>',
    '</p>',
    '<p style="color: #6b7280; font-size: 14px;">',
    'If the button does not work, copy and paste this link into your browser:<br>',
    '<a href="' + signingUrl + '" style="color: #3b82f6;">' + signingUrl + '</a>',
    '</p>'
  ].join('\n')

  switch (reminderType) {
    case 'friendly':
      return [
        '<div class="header">',
        '<h1 style="margin: 0; color: #1f2937;">Friendly Reminder: Document Awaiting Signature</h1>',
        '</div>',
        '',
        '<p>Hi ' + recipientName + ',</p>',
        '',
        '<p>We wanted to send you a friendly reminder that you have a document awaiting your signature. The document will expire in <strong>' + daysRemaining + ' days</strong>.</p>',
        '',
        documentDetails,
        '',
        '<p>Please take a moment to review and sign this document at your earliest convenience.</p>',
        '',
        signButton,
        '',
        '<p style="color: #6b7280; font-size: 14px; margin-top: 24px;">',
        'If you have any questions about this document, please contact us directly.',
        '</p>'
      ].join('\n')

    case 'urgent':
      return [
        '<div class="header" style="border-bottom-color: #f59e0b;">',
        '<h1 style="margin: 0; color: #d97706;">Action Required - Urgent</h1>',
        '</div>',
        '',
        '<p>Hi ' + recipientName + ',</p>',
        '',
        '<p style="color: #d97706; font-weight: bold;">Your document requires immediate attention. It will expire in ' + daysRemaining + ' days.</p>',
        '',
        '<p>Please sign this document as soon as possible to avoid any delays in processing.</p>',
        '',
        documentDetails,
        '',
        signButton,
        '',
        '<p style="color: #d97706; font-size: 14px; margin-top: 24px; font-weight: 500;">',
        'This document must be signed by ' + expirationDate + ' or it will expire.',
        '</p>'
      ].join('\n')

    case 'final':
      return [
        '<div class="header" style="border-bottom-color: #dc2626;">',
        '<h1 style="margin: 0; color: #dc2626;">FINAL NOTICE: Document Expires Tomorrow</h1>',
        '</div>',
        '',
        '<p>Hi ' + recipientName + ',</p>',
        '',
        '<p style="color: #dc2626; font-weight: bold; font-size: 16px;">',
        'This is your final reminder. The document below will expire TOMORROW (' + expirationDate + ').',
        '</p>',
        '',
        '<p>If this document is not signed by the deadline, it will expire and a new document may need to be sent.</p>',
        '',
        documentDetails,
        '',
        '<div style="background-color: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;">',
        '<p style="color: #dc2626; font-weight: bold; margin: 0;">Please sign this document TODAY</p>',
        '</div>',
        '',
        signButton,
        '',
        '<p style="color: #dc2626; font-size: 14px; margin-top: 24px;">',
        'If you have any questions or issues signing this document, please contact us immediately.',
        '</p>'
      ].join('\n')

    default:
      return getReminderBody({ ...data, reminderType: 'friendly' })
  }
}

/**
 * Generate the complete HTML email for a signature reminder
 */
export function createSignatureReminderEmail(data: SignatureReminderData): string {
  const body = getReminderBody(data)
  return createEmailHTML(body, getReminderSubject(data))
}

/**
 * Determine the reminder type based on days remaining
 */
export function determineReminderType(daysRemaining: number): ReminderType {
  if (daysRemaining <= 1) {
    return 'final'
  } else if (daysRemaining <= 3) {
    return 'urgent'
  } else {
    return 'friendly'
  }
}

/**
 * Check if a document should receive a reminder based on expiration
 * Returns the days remaining, or null if no reminder is needed
 * 
 * Reminder schedule:
 * - 7 days before expiration (friendly)
 * - 3 days before expiration (urgent)
 * - 1 day before expiration (final)
 */
export function shouldSendReminder(
  expiresAt: Date,
  reminderCount: number,
  lastReminderAt: Date | null
): { shouldSend: boolean; daysRemaining: number; reminderType: ReminderType } {
  const now = new Date()
  const msPerDay = 24 * 60 * 60 * 1000
  const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / msPerDay)

  // Do not send if already expired or max reminders sent
  if (daysRemaining <= 0 || reminderCount >= 3) {
    return { shouldSend: false, daysRemaining, reminderType: 'friendly' }
  }

  // Do not send more than one reminder per day
  if (lastReminderAt) {
    const hoursSinceLastReminder = (now.getTime() - lastReminderAt.getTime()) / (60 * 60 * 1000)
    if (hoursSinceLastReminder < 20) { // At least 20 hours between reminders
      return { shouldSend: false, daysRemaining, reminderType: determineReminderType(daysRemaining) }
    }
  }

  // Check if we are at a reminder threshold
  const reminderType = determineReminderType(daysRemaining)
  
  // Reminder schedule:
  // - First reminder at 7 days (friendly)
  // - Second reminder at 3 days (urgent)
  // - Third reminder at 1 day (final)
  const shouldSend = 
    (reminderCount === 0 && daysRemaining <= 7) ||
    (reminderCount === 1 && daysRemaining <= 3) ||
    (reminderCount === 2 && daysRemaining <= 1)

  return { shouldSend, daysRemaining, reminderType }
}

/**
 * Document Declined Email Template
 * 
 * Sent to document owner when a signer declines the document
 */

export interface SignatureDeclinedData {
  ownerName: string
  documentTitle: string
  projectName?: string
  declinedBy: string
  declinedByEmail?: string
  declineReason: string
  documentUrl: string
  declinedAt: string
}

/**
 * Get the subject line for decline notification
 */
export function getDeclineNotificationSubject(data: SignatureDeclinedData): string {
  return `Document Declined: "${data.documentTitle}"`
}

/**
 * Get the email body content for decline notification
 */
function getDeclineNotificationBody(data: SignatureDeclinedData): string {
  const {
    ownerName,
    documentTitle,
    projectName,
    declinedBy,
    declinedByEmail,
    declineReason,
    documentUrl,
    declinedAt
  } = data

  const projectLine = projectName ? `<p style="margin: 4px 0;"><strong>Project:</strong> ${projectName}</p>` : ''
  const declinedByEmailLine = declinedByEmail ? ` (${declinedByEmail})` : ''

  return `
    <div class="header" style="border-bottom-color: #dc2626;">
      <h1 style="margin: 0; color: #dc2626;">Document Declined</h1>
    </div>

    <p>Hi ${ownerName},</p>

    <p>We wanted to let you know that <strong>${declinedBy}${declinedByEmailLine}</strong> has declined to sign the following document:</p>

    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #dc2626;">
      <h3 style="margin: 0 0 12px 0; color: #991b1b;">Document Details</h3>
      <p style="margin: 4px 0;"><strong>Document:</strong> ${documentTitle}</p>
      ${projectLine}
      <p style="margin: 4px 0;"><strong>Declined on:</strong> ${declinedAt}</p>
    </div>

    <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ea580c;">
      <h3 style="margin: 0 0 12px 0; color: #9a3412;">Reason for Declining</h3>
      <p style="margin: 0; color: #7c2d12; white-space: pre-wrap;">${declineReason}</p>
    </div>

    <p>You can view the document details and create a new version if needed:</p>

    <p style="text-align: center;">
      <a href="${documentUrl}" class="button" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
        View Document
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      If you need to make changes based on the feedback provided, you can create a new version of the document and send it for signature again.
    </p>
  `
}

/**
 * Generate the complete HTML email for a decline notification
 */
export function createDeclineNotificationEmail(data: SignatureDeclinedData): string {
  const body = getDeclineNotificationBody(data)
  return createEmailHTML(body, getDeclineNotificationSubject(data))
}

/**
 * Document Signed Email Template
 *
 * Sent to document owner (and optionally other signers) when document is fully signed
 */

export interface SignedNotificationData {
  ownerName: string
  documentTitle: string
  projectName?: string
  signers: Array<{
    signer_name: string
    signer_email: string
    signer_type: string
    created_at: string
  }>
  documentUrl: string
  downloadUrl: string
  signedAt: string
}

/**
 * Get the subject line for signed notification
 */
export function getSignedNotificationSubject(data: SignedNotificationData): string {
  return `Document Signed: "${data.documentTitle}"`
}

/**
 * Get the email body content for signed notification
 */
function getSignedNotificationBody(data: SignedNotificationData): string {
  const {
    ownerName,
    documentTitle,
    projectName,
    signers,
    documentUrl,
    downloadUrl,
    signedAt
  } = data

  const projectLine = projectName ? `<p style="margin: 4px 0;"><strong>Project:</strong> ${projectName}</p>` : ''

  const signersHtml = signers.map(s =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.signer_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${s.signer_email}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-transform: capitalize;">${s.signer_type}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${new Date(s.created_at).toLocaleString()}</td>
    </tr>`
  ).join('')

  return `
    <div class="header" style="border-bottom-color: #22c55e;">
      <h1 style="margin: 0; color: #16a34a;">Document Signed Successfully!</h1>
    </div>

    <p>Hi ${ownerName},</p>

    <p>Great news! The following document has been fully signed by all required parties:</p>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #22c55e;">
      <h3 style="margin: 0 0 12px 0; color: #166534;">Document Details</h3>
      <p style="margin: 4px 0;"><strong>Document:</strong> ${documentTitle}</p>
      ${projectLine}
      <p style="margin: 4px 0;"><strong>Completed on:</strong> ${signedAt}</p>
    </div>

    <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 24px 0;">
      <h3 style="margin: 0 0 12px 0; color: #374151;">Signers</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #e5e7eb;">
            <th style="padding: 8px; text-align: left;">Name</th>
            <th style="padding: 8px; text-align: left;">Email</th>
            <th style="padding: 8px; text-align: left;">Role</th>
            <th style="padding: 8px; text-align: left;">Signed</th>
          </tr>
        </thead>
        <tbody>
          ${signersHtml}
        </tbody>
      </table>
    </div>

    <p style="text-align: center;">
      <a href="${downloadUrl}" class="button" style="display: inline-block; padding: 14px 28px; background-color: #22c55e; color: white; border-radius: 6px; text-decoration: none; font-weight: 500; margin-right: 8px;">
        Download Signed PDF
      </a>
      <a href="${documentUrl}" style="display: inline-block; padding: 14px 28px; background-color: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-weight: 500;">
        View Document
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      The signed document has been saved and is available for download at any time from your dashboard.
    </p>
  `
}

/**
 * Generate the complete HTML email for a signed notification
 */
export function createSignedNotificationEmail(data: SignedNotificationData): string {
  const body = getSignedNotificationBody(data)
  return createEmailHTML(body, getSignedNotificationSubject(data))
}

// ============================================
// Company Turn Notification (Customer Signed)
// ============================================

export interface CompanyTurnNotificationData {
  ownerName: string
  documentTitle: string
  projectName?: string
  customerName: string
  customerEmail: string
  signedAt: string
  signingUrl: string
  documentUrl: string
}

/**
 * Get the subject line for company turn notification
 */
export function getCompanyTurnSubject(data: CompanyTurnNotificationData): string {
  return `Action Required: "${data.documentTitle}" needs your company signature`
}

/**
 * Get the email body for company turn notification
 */
function getCompanyTurnBody(data: CompanyTurnNotificationData): string {
  const { ownerName, documentTitle, projectName, customerName, customerEmail, signedAt, signingUrl, documentUrl } = data
  const projectLine = projectName ? `<p style="margin: 4px 0;"><strong>Project:</strong> ${projectName}</p>` : ''

  return `
    <div class="header" style="border-bottom-color: #f59e0b;">
      <h1 style="margin: 0; color: #d97706;">Customer Has Signed - Your Turn!</h1>
    </div>

    <p>Hi ${ownerName},</p>

    <p>Great news! Your customer has signed the document. The document now requires your company signature to complete.</p>

    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #f59e0b;">
      <h3 style="margin: 0 0 12px 0; color: #92400e;">Document Details</h3>
      <p style="margin: 4px 0;"><strong>Document:</strong> ${documentTitle}</p>
      ${projectLine}
    </div>

    <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #22c55e;">
      <h4 style="margin: 0 0 8px 0; color: #166534;">Customer Signature Received</h4>
      <p style="margin: 4px 0;"><strong>Name:</strong> ${customerName}</p>
      <p style="margin: 4px 0;"><strong>Email:</strong> ${customerEmail}</p>
      <p style="margin: 4px 0;"><strong>Signed:</strong> ${signedAt}</p>
    </div>

    <p style="text-align: center; margin: 32px 0;">
      <a href="${signingUrl}" class="button" style="display: inline-block; padding: 16px 32px; background-color: #f59e0b; color: white; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
        Sign as Company Representative
      </a>
    </p>

    <p style="color: #6b7280; font-size: 14px; text-align: center;">
      Or <a href="${documentUrl}" style="color: #3b82f6;">view the document details</a> in your dashboard first.
    </p>

    <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
      Once you sign, both parties will receive a confirmation email with the fully executed document.
    </p>
  `
}

/**
 * Generate the complete HTML email for company turn notification
 */
export function createCompanyTurnEmail(data: CompanyTurnNotificationData): string {
  const body = getCompanyTurnBody(data)
  return createEmailHTML(body, getCompanyTurnSubject(data))
}
