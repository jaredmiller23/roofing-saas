// =============================================
// Webhook Security Utilities
// =============================================
// Purpose: Signature verification for webhooks
// Author: Claude Code
// Date: 2025-11-18
// =============================================

import { NextRequest } from 'next/server'
import twilio from 'twilio'
import crypto from 'crypto'

// =================
// Types
// =================

export interface TwilioSignatureVerificationResult {
  valid: boolean
  error?: string
}

export interface ResendSignatureVerificationResult {
  valid: boolean
  error?: string
}

// =================
// Twilio Signature Verification
// =================

/**
 * Verify Twilio webhook signature
 *
 * Ensures the request actually came from Twilio and hasn't been tampered with.
 *
 * @param request - Next.js request object
 * @param params - Form data or query params from the request
 * @returns Verification result with valid boolean and optional error
 */
export async function verifyTwilioSignature(
  request: NextRequest,
  params: Record<string, any>
): Promise<TwilioSignatureVerificationResult> {
  try {
    // Get Twilio auth token from environment
    const authToken = process.env.TWILIO_AUTH_TOKEN

    if (!authToken) {
      return {
        valid: false,
        error: 'TWILIO_AUTH_TOKEN not configured',
      }
    }

    // Get signature from headers
    const signature = request.headers.get('x-twilio-signature')

    if (!signature) {
      return {
        valid: false,
        error: 'Missing x-twilio-signature header',
      }
    }

    // Get full URL (Twilio uses the full URL including protocol and domain)
    const url = request.url

    // Validate the signature
    const isValid = twilio.validateRequest(
      authToken,
      signature,
      url,
      params
    )

    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid Twilio signature - request may be forged',
      }
    }

    return {
      valid: true,
    }
  } catch (error) {
    return {
      valid: false,
      error: `Signature verification error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

/**
 * Parse Twilio webhook form data
 *
 * Converts FormData to a plain object for signature verification
 *
 * @param formData - FormData from the request
 * @returns Plain object with form data
 */
export function parseTwilioFormData(formData: FormData): Record<string, any> {
  const params: Record<string, any> = {}

  formData.forEach((value, key) => {
    params[key] = value.toString()
  })

  return params
}

/**
 * Parse Twilio webhook query params
 *
 * Converts URLSearchParams to a plain object for signature verification
 *
 * @param searchParams - URLSearchParams from the request
 * @returns Plain object with query params
 */
export function parseTwilioQueryParams(searchParams: URLSearchParams): Record<string, any> {
  const params: Record<string, any> = {}

  searchParams.forEach((value, key) => {
    params[key] = value
  })

  return params
}

// =================
// Resend Signature Verification
// =================

/**
 * Verify Resend webhook signature
 *
 * Resend uses HMAC-SHA256 signatures to verify webhook authenticity.
 *
 * @param request - Next.js request object
 * @param payload - Raw request body as string
 * @returns Verification result with valid boolean and optional error
 */
export async function verifyResendSignature(
  request: NextRequest,
  payload: string
): Promise<ResendSignatureVerificationResult> {
  try {
    // Get Resend webhook secret from environment
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET

    if (!webhookSecret) {
      // If no webhook secret is configured, we can't verify
      // In development, this might be okay, but in production it should be set
      if (process.env.NODE_ENV === 'production') {
        return {
          valid: false,
          error: 'RESEND_WEBHOOK_SECRET not configured in production',
        }
      }

      // In development, allow unverified webhooks
      console.warn('⚠️ RESEND_WEBHOOK_SECRET not configured - skipping signature verification')
      return {
        valid: true,
      }
    }

    // Get signature from headers
    const signature = request.headers.get('svix-signature')

    if (!signature) {
      return {
        valid: false,
        error: 'Missing svix-signature header',
      }
    }

    // Resend uses Svix for webhook signatures
    // Signature format: "v1,timestamp signature"
    // We need to extract timestamp and signature
    const signatureParts = signature.split(',')
    if (signatureParts.length < 2) {
      return {
        valid: false,
        error: 'Invalid signature format',
      }
    }

    // Get timestamp from header
    const timestampHeader = request.headers.get('svix-timestamp')
    if (!timestampHeader) {
      return {
        valid: false,
        error: 'Missing svix-timestamp header',
      }
    }

    // Construct the signed content (timestamp.payload)
    const signedContent = `${timestampHeader}.${payload}`

    // Compute HMAC-SHA256
    const hmac = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedContent)
      .digest('base64')

    // Extract signature (remove "v1," prefix)
    const receivedSignature = signatureParts
      .find(part => part.startsWith('v1,'))
      ?.substring(3)

    if (!receivedSignature) {
      return {
        valid: false,
        error: 'No v1 signature found',
      }
    }

    // Compare signatures (timing-safe comparison)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(hmac)
    )

    if (!isValid) {
      return {
        valid: false,
        error: 'Invalid Resend signature - request may be forged',
      }
    }

    // Check timestamp to prevent replay attacks (within 5 minutes)
    const timestamp = parseInt(timestampHeader, 10)
    const now = Math.floor(Date.now() / 1000)
    const maxAge = 5 * 60 // 5 minutes

    if (Math.abs(now - timestamp) > maxAge) {
      return {
        valid: false,
        error: 'Webhook timestamp too old - possible replay attack',
      }
    }

    return {
      valid: true,
    }
  } catch (error) {
    return {
      valid: false,
      error: `Signature verification error: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

// =================
// Helper Functions
// =================

/**
 * Get request body as text
 *
 * Useful for signature verification that requires the raw body
 *
 * @param request - Next.js request object
 * @returns Raw body as string
 */
export async function getRawBody(request: NextRequest): Promise<string> {
  const body = await request.text()
  return body
}

/**
 * Verify webhook and return result
 *
 * Generic helper for webhook endpoints
 *
 * @param verificationResult - Result from signature verification
 * @param onValid - Callback to execute if signature is valid
 * @param onInvalid - Optional callback for invalid signatures
 * @returns Result from onValid or error response
 */
export async function handleWebhookVerification<T>(
  verificationResult: TwilioSignatureVerificationResult | ResendSignatureVerificationResult,
  onValid: () => Promise<T>,
  onInvalid?: (error: string) => void
): Promise<T | { error: string; status: number }> {
  if (!verificationResult.valid) {
    const error = verificationResult.error || 'Invalid webhook signature'

    // Log security event
    console.error('🚨 Webhook security violation:', error)

    // Call optional handler
    if (onInvalid) {
      onInvalid(error)
    }

    // Return 403 Forbidden
    return {
      error: 'Unauthorized',
      status: 403,
    }
  }

  // Signature is valid, proceed
  return onValid()
}
