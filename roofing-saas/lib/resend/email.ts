/**
 * Email Sending Utilities
 * Handles email delivery via Resend with retry logic and templates
 */

import { resendClient, isResendConfigured, getFromAddress } from './client'
import { EmailError, EmailConfigurationError, EmailValidationError } from './errors'
import { logger } from '@/lib/logger'
import { withRetry, type RetryOptions } from '@/lib/api/retry'

// Email sending parameters
export interface SendEmailParams {
  to: string | string[]
  subject: string
  html?: string
  text?: string
  from?: string
  replyTo?: string
  cc?: string | string[]
  bcc?: string | string[]
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
  tags?: Array<{ name: string; value: string }>
}

// Email response
export interface EmailResponse {
  id: string
  to: string | string[]
  subject: string
  from: string
}

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate email parameters
 */
function validateEmailParams(params: SendEmailParams): void {
  // Validate recipients
  const recipients = Array.isArray(params.to) ? params.to : [params.to]
  for (const email of recipients) {
    if (!isValidEmail(email)) {
      throw new EmailValidationError(`Invalid email address: ${email}`)
    }
  }

  // Validate subject
  if (!params.subject || params.subject.trim().length === 0) {
    throw new EmailValidationError('Email subject is required')
  }

  // Validate content
  if (!params.html && !params.text) {
    throw new EmailValidationError('Email must have either HTML or text content')
  }

  // Validate CC/BCC if provided
  if (params.cc) {
    const ccList = Array.isArray(params.cc) ? params.cc : [params.cc]
    for (const email of ccList) {
      if (!isValidEmail(email)) {
        throw new EmailValidationError(`Invalid CC email address: ${email}`)
      }
    }
  }

  if (params.bcc) {
    const bccList = Array.isArray(params.bcc) ? params.bcc : [params.bcc]
    for (const email of bccList) {
      if (!isValidEmail(email)) {
        throw new EmailValidationError(`Invalid BCC email address: ${email}`)
      }
    }
  }
}

/**
 * Send an email via Resend
 * Includes automatic retry logic for transient failures
 */
export async function sendEmail(params: SendEmailParams): Promise<EmailResponse> {
  if (!isResendConfigured()) {
    throw new EmailConfigurationError('Resend not configured. Please add RESEND_API_KEY to environment variables.')
  }

  // Validate parameters
  validateEmailParams(params)

  const startTime = Date.now()
  logger.debug('Sending email', {
    to: params.to,
    subject: params.subject,
    hasHtml: !!params.html,
    hasText: !!params.text,
  })

  const retryOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
  }

  try {
    const result = await withRetry(async () => {
      return await resendClient!.emails.send({
        from: params.from || getFromAddress(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        cc: params.cc,
        bcc: params.bcc,
        attachments: params.attachments,
        tags: params.tags,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
    }, retryOptions)

    if (result.error) {
      throw new EmailError(result.error.message || 'Failed to send email')
    }

    const duration = Date.now() - startTime
    logger.info('Email sent successfully', {
      emailId: result.data?.id,
      to: params.to,
      subject: params.subject,
      duration,
    })

    return {
      id: result.data!.id,
      to: params.to,
      subject: params.subject,
      from: params.from || getFromAddress(),
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Failed to send email', {
      error,
      to: params.to,
      subject: params.subject,
      duration,
    })
    throw error instanceof EmailError ? error : new EmailError((error as Error).message)
  }
}

/**
 * Send bulk emails with rate limiting
 * Adds delay between sends to avoid rate limits
 */
export async function sendBulkEmails(
  recipients: Array<{ to: string; subject: string; html?: string; text?: string }>,
  delayMs: number = 100
): Promise<EmailResponse[]> {
  const results: EmailResponse[] = []
  const errors: Array<{ recipient: string; error: Error }> = []

  for (const recipient of recipients) {
    try {
      const result = await sendEmail(recipient)
      results.push(result)

      // Rate limiting delay
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    } catch (error) {
      logger.error('Failed to send bulk email', {
        to: recipient.to,
        error,
      })
      errors.push({
        recipient: recipient.to,
        error: error as Error,
      })
    }
  }

  if (errors.length > 0) {
    logger.warn('Bulk email completed with errors', {
      total: recipients.length,
      successful: results.length,
      failed: errors.length,
      errors,
    })
  }

  return results
}

/**
 * Replace template variables in email content
 * Variables format: {{variable_name}}
 */
export function replaceEmailVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content

  for (const [key, value] of Object.entries(variables)) {
    // Match {{key}} with optional whitespace
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(regex, value)
  }

  return result
}

/**
 * Create a simple HTML email wrapper
 * Adds basic styling and responsive layout
 */
export function createEmailHTML(body: string, title?: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${title ? `<title>${title}</title>` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      border-bottom: 2px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 20px;
    }
    .content {
      padding: 20px 0;
    }
    .footer {
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
      margin-top: 40px;
      font-size: 12px;
      color: #6b7280;
    }
    a {
      color: #3b82f6;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #3b82f6;
      color: white !important;
      border-radius: 6px;
      text-decoration: none;
      margin: 16px 0;
    }
  </style>
</head>
<body>
  <div class="content">
    ${body}
  </div>
  <div class="footer">
    <p>This email was sent from Roofing SaaS. If you have questions, please contact us.</p>
  </div>
</body>
</html>
  `.trim()
}
