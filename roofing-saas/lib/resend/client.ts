/**
 * Resend Client Configuration
 * Handles email sending via Resend API
 */

import { Resend } from 'resend'
import { logger } from '@/lib/logger'

const apiKey = process.env.RESEND_API_KEY
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@example.com'
const fromName = process.env.RESEND_FROM_NAME || 'Roofing SaaS'

// Initialize Resend client
export const resendClient = apiKey ? new Resend(apiKey) : null

/**
 * Check if Resend is configured
 */
export function isResendConfigured(): boolean {
  return !!(apiKey && fromEmail)
}

/**
 * Get configured from email address
 */
export function getFromEmail(): string {
  return fromEmail
}

/**
 * Get configured from name
 */
export function getFromName(): string {
  return fromName
}

/**
 * Get full from address (Name <email@domain.com>)
 */
export function getFromAddress(): string {
  return `${fromName} <${fromEmail}>`
}

// Log configuration status
if (apiKey) {
  logger.debug('Resend client initialized', {
    fromEmail,
    fromName,
  })
} else {
  logger.warn('Resend not configured - email features will not work')
}
