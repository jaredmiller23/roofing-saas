/**
 * Twilio Voice Utilities
 * Handles voice calls via Twilio with logging and recording
 */

import { twilioClient, isTwilioConfigured, getTwilioPhoneNumber } from './client'
import { TwilioError } from './errors'
import { logger } from '@/lib/logger'
import { withRetry, type RetryOptions } from '@/lib/api/retry'

// Call parameters
export interface MakeCallParams {
  to: string
  from?: string
  url?: string // TwiML URL for call instructions
  record?: boolean
  recordingStatusCallback?: string
  statusCallback?: string
  statusCallbackMethod?: 'GET' | 'POST'
}

// Call response
export interface CallResponse {
  sid: string
  to: string
  from: string
  status: string
  direction: string
  duration?: number
}

/**
 * Make an outbound call via Twilio
 * Includes automatic retry logic for transient failures
 */
export async function makeCall(params: MakeCallParams): Promise<CallResponse> {
  if (!isTwilioConfigured()) {
    throw new TwilioError('Twilio not configured. Please add credentials to environment variables.')
  }

  const startTime = Date.now()
  logger.debug('Making outbound call', {
    to: params.to,
    from: params.from || getTwilioPhoneNumber(),
    record: params.record,
  })

  const retryOptions: RetryOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
  }

  try {
    const call = await withRetry(async () => {
      return await twilioClient!.calls.create({
        to: params.to,
        from: params.from || getTwilioPhoneNumber()!,
        url: params.url || getDefaultTwiMLUrl(),
        record: params.record,
        recordingStatusCallback: params.recordingStatusCallback,
        statusCallback: params.statusCallback,
        statusCallbackMethod: params.statusCallbackMethod || 'POST',
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      })
    }, retryOptions)

    const duration = Date.now() - startTime
    logger.info('Call initiated successfully', {
      callSid: call.sid,
      to: params.to,
      from: call.from,
      status: call.status,
      duration,
    })

    return {
      sid: call.sid,
      to: call.to,
      from: call.from,
      status: call.status,
      direction: call.direction,
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('Failed to make call', {
      error,
      to: params.to,
      duration,
    })
    throw error instanceof TwilioError ? error : new TwilioError((error as Error).message)
  }
}

/**
 * Get call details by SID
 */
export async function getCallDetails(callSid: string): Promise<CallResponse | null> {
  if (!isTwilioConfigured()) {
    throw new TwilioError('Twilio not configured')
  }

  try {
    const call = await twilioClient!.calls(callSid).fetch()

    return {
      sid: call.sid,
      to: call.to,
      from: call.from,
      status: call.status,
      direction: call.direction,
      duration: call.duration ? parseInt(call.duration) : undefined,
    }
  } catch (error) {
    logger.error('Failed to fetch call details', { error, callSid })
    return null
  }
}

/**
 * Get call recordings for a call
 */
export async function getCallRecordings(callSid: string): Promise<Array<{
  sid: string
  duration: number
  url: string
}>> {
  if (!isTwilioConfigured()) {
    throw new TwilioError('Twilio not configured')
  }

  try {
    const recordings = await twilioClient!.calls(callSid).recordings.list()

    return recordings.map((recording) => ({
      sid: recording.sid,
      duration: parseInt(recording.duration || '0'),
      url: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
    }))
  } catch (error) {
    logger.error('Failed to fetch call recordings', { error, callSid })
    return []
  }
}

/**
 * Generate TwiML for a simple call
 */
export function generateSimpleTwiML(message?: string): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  ${message ? `<Say>${message}</Say>` : '<Say>Hello, this is a call from your roofing company.</Say>'}
  <Pause length="1"/>
</Response>`
  return twiml
}

/**
 * Generate TwiML for call forwarding to a number
 */
export function generateForwardTwiML(forwardTo: string, timeout: number = 30): string {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial timeout="${timeout}" callerId="${getTwilioPhoneNumber()}">
    <Number>${forwardTo}</Number>
  </Dial>
</Response>`
  return twiml
}

/**
 * Generate TwiML for voicemail
 */
export function generateVoicemailTwiML(
  greeting?: string,
  maxLength: number = 120
): string {
  const defaultGreeting = 'Please leave a message after the beep.'
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${greeting || defaultGreeting}</Say>
  <Record maxLength="${maxLength}" transcribe="true" transcribeCallback="/api/voice/transcribe" />
</Response>`
  return twiml
}

/**
 * Get default TwiML URL for calls
 * This should point to your API endpoint that returns TwiML
 */
function getDefaultTwiMLUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/voice/twiml`
}

/**
 * Format phone number for Twilio (E.164 format)
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // If it's a US number without country code, add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }

  // If it already has country code, add +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  // Otherwise return as-is with + prefix if not present
  return phone.startsWith('+') ? phone : `+${digits}`
}

/**
 * Validate phone number format
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Must be 10 digits (US) or 11 digits (US with country code)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}
