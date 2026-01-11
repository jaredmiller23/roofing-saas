/**
 * Claims Webhook API
 *
 * POST /api/claims/webhook
 * Receive webhook events from Claims Agent module.
 * Updates project status based on claim changes.
 */

import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { handleClaimWebhook } from '@/lib/claims/sync-service'
import type { ClaimWebhookEvent } from '@/lib/claims/types'
import { AuthenticationError, ValidationError, InternalError } from '@/lib/api/errors'
import { successResponse, errorResponse } from '@/lib/api/response'

// Webhook secret for verification
const WEBHOOK_SECRET = process.env.CLAIMS_WEBHOOK_SECRET

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null
): boolean {
  if (!WEBHOOK_SECRET) {
    // SECURITY: Fail in production if webhook secret is not configured
    if (process.env.NODE_ENV === 'production') {
      logger.error('CLAIMS_WEBHOOK_SECRET is required in production')
      return false
    }
    // In development, warn but allow (for testing)
    logger.warn('No webhook secret configured, skipping signature verification (development only)')
    return true
  }

  if (!signature) {
    return false
  }

  // HMAC verification with constant-time comparison to prevent timing attacks
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  // Extract the hash from the signature (format: "sha256=<hash>")
  const signatureHash = signature.replace('sha256=', '')

  // Use constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch {
    // timingSafeEqual throws if buffers are different lengths
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature')

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature')
      throw AuthenticationError('Invalid signature')
    }

    // Parse the event
    let event: ClaimWebhookEvent
    try {
      event = JSON.parse(rawBody)
    } catch {
      throw ValidationError('Invalid JSON payload')
    }

    // Validate required fields
    if (!event.claim_id || !event.event) {
      throw ValidationError('Missing required fields: claim_id, event')
    }

    logger.info('Received claim webhook', {
      claimId: event.claim_id,
      event: event.event,
    })

    // Use admin client for webhook processing (bypasses RLS)
    const supabase = await createAdminClient()

    // Handle the webhook event
    const success = await handleClaimWebhook(
      supabase,
      event.claim_id,
      event.event,
      event.data || {}
    )

    if (!success) {
      // Return 200 even if no project found - webhook was received
      return successResponse({
        success: true,
        message: 'Webhook received but no matching project found',
      })
    }

    return successResponse({
      success: true,
      message: 'Webhook processed successfully',
    })
  } catch (error) {
    logger.error('Claims webhook API error', { error })
    return errorResponse(error instanceof Error ? error : InternalError())
  }
}

/**
 * GET /api/claims/webhook
 * Health check endpoint
 */
export async function GET() {
  return successResponse({
    status: 'healthy',
    endpoint: 'claims-webhook',
    timestamp: new Date().toISOString(),
  })
}
