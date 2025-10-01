/**
 * Twilio Client Configuration
 * Handles SMS sending, receiving, and tracking
 */

import twilio from 'twilio'
import { logger } from '@/lib/logger'

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER

if (!accountSid || !authToken) {
  logger.warn('Twilio credentials not configured')
}

export const twilioClient = accountSid && authToken
  ? twilio(accountSid, authToken)
  : null

/**
 * Check if Twilio is properly configured
 */
export function isTwilioConfigured(): boolean {
  return !!(accountSid && authToken && twilioPhoneNumber)
}

/**
 * Get Twilio phone number
 */
export function getTwilioPhoneNumber(): string | null {
  return twilioPhoneNumber || null
}

export { accountSid, authToken, twilioPhoneNumber }
