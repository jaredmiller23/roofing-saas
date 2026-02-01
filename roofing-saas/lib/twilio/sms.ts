/**
 * Twilio SMS API
 * Handles SMS sending with retry logic and rate limiting
 */

import { twilioClient, getTwilioPhoneNumber, isTwilioConfigured } from './client'
import { withRetry, RetryOptions } from '@/lib/api/retry'
import { logger } from '@/lib/logger'
import { TwilioError } from './errors'
import { twilioSpan } from '@/lib/instrumentation'

export interface SendSMSParams {
  to: string
  body: string
  from?: string
}

export interface SMSResponse {
  sid: string
  to: string
  from: string
  body: string
  status: string
  dateCreated: Date
}

/**
 * Send SMS message with retry logic
 */
export async function sendSMS(params: SendSMSParams): Promise<SMSResponse> {
  if (!isTwilioConfigured()) {
    throw new TwilioError('Twilio not configured', {
      details: 'Missing TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER',
    })
  }

  if (!twilioClient) {
    throw new TwilioError('Twilio client not initialized')
  }

  const fromNumber = params.from || getTwilioPhoneNumber()
  if (!fromNumber) {
    throw new TwilioError('No from phone number configured')
  }

  logger.info('Sending SMS', {
    to: params.to,
    from: fromNumber,
    bodyLength: params.body.length,
  })

  const retryOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
  }

  try {
    const message = await twilioSpan(
      'send_sms',
      async () => {
        return await withRetry(async () => {
          return await twilioClient!.messages.create({
            to: params.to,
            from: fromNumber,
            body: params.body,
          })
        }, retryOptions)
      },
      {
        'twilio.to_masked': params.to.slice(-4),
        'twilio.body_length': params.body.length,
      }
    )

    logger.info('SMS sent successfully', {
      sid: message.sid,
      to: message.to,
      status: message.status,
    })

    return {
      sid: message.sid,
      to: message.to,
      from: message.from,
      body: message.body,
      status: message.status,
      dateCreated: message.dateCreated,
    }
  } catch (error) {
    logger.error('Failed to send SMS', { error, params })
    throw new TwilioError('Failed to send SMS', { originalError: error })
  }
}

/**
 * Send SMS to multiple recipients (with rate limiting)
 */
export async function sendBulkSMS(
  recipients: string[],
  body: string
): Promise<{ successful: SMSResponse[]; failed: Array<{ to: string; error: string }> }> {
  const successful: SMSResponse[] = []
  const failed: Array<{ to: string; error: string }> = []

  logger.info('Sending bulk SMS', { recipientCount: recipients.length })

  for (const to of recipients) {
    try {
      const response = await sendSMS({ to, body })
      successful.push(response)

      // Rate limiting: Wait 100ms between messages to avoid carrier limits
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (error) {
      logger.error('Failed to send SMS to recipient', { to, error })
      failed.push({
        to,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  logger.info('Bulk SMS complete', {
    successful: successful.length,
    failed: failed.length,
  })

  return { successful, failed }
}

/**
 * Replace template variables in SMS body
 * Example: "Hi {{first_name}}, ..." with { first_name: "John" }
 * Re-exported from automation/variables for convenience
 */
export { replaceVariablesInString as replaceTemplateVariables } from '@/lib/automation/variables'
