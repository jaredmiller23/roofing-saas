/**
 * Claims Webhook API
 *
 * POST /api/claims/webhook
 * Receive webhook events from Claims Agent module.
 * Updates project status based on claim changes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { handleClaimWebhook } from '@/lib/claims/sync-service'
import type { ClaimWebhookEvent } from '@/lib/claims/types'

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
    // If no secret configured, skip verification in development
    logger.warn('No webhook secret configured, skipping signature verification')
    return true
  }

  if (!signature) {
    return false
  }

  // Simple HMAC verification (in production, use crypto.timingSafeEqual)
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return signature === `sha256=${expectedSignature}`
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get('x-webhook-signature')

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse the event
    let event: ClaimWebhookEvent
    try {
      event = JSON.parse(rawBody)
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!event.claim_id || !event.event) {
      return NextResponse.json(
        { error: 'Missing required fields: claim_id, event' },
        { status: 400 }
      )
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
      return NextResponse.json({
        success: true,
        message: 'Webhook received but no matching project found',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    })
  } catch (error) {
    logger.error('Claims webhook API error', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/claims/webhook
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    endpoint: 'claims-webhook',
    timestamp: new Date().toISOString(),
  })
}
