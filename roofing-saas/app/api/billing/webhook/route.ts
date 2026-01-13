/**
 * POST /api/billing/webhook
 *
 * Stripe webhook endpoint.
 * Handles all subscription lifecycle events from Stripe.
 *
 * IMPORTANT: This endpoint must NOT use authentication.
 * It validates requests using Stripe's webhook signature.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  handleWebhookEvent,
  isEventProcessed,
} from '@/lib/billing/webhooks/handler';
import { logger } from '@/lib/logger';

// Disable body parsing - we need the raw body for signature verification
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Get signature header
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      logger.warn('Webhook request missing stripe-signature header');
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify signature
    const verification = await verifyWebhookSignature(body, signature);

    if (!verification.valid || !verification.event) {
      logger.warn('Webhook signature verification failed', {
        error: verification.error,
      });
      return NextResponse.json(
        { error: verification.error || 'Invalid signature' },
        { status: 400 }
      );
    }

    const event = verification.event;

    // Check for duplicate processing (idempotency)
    const alreadyProcessed = await isEventProcessed(event.id);
    if (alreadyProcessed) {
      logger.info('Webhook event already processed', { eventId: event.id });
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Process the event
    const result = await handleWebhookEvent(event);

    if (!result.success) {
      logger.error('Webhook processing failed', {
        eventId: event.id,
        eventType: event.type,
        message: result.message,
      });
      // Still return 200 to prevent Stripe retries for permanent failures
      // Stripe will retry on 4xx/5xx responses
    }

    logger.info('Webhook processed successfully', {
      eventId: event.id,
      eventType: event.type,
      message: result.message,
    });

    return NextResponse.json({
      received: true,
      success: result.success,
      message: result.message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Webhook handler error', { error: message });

    // Return 500 to trigger Stripe retry
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Stripe sends HEAD requests to verify endpoint
export async function HEAD() {
  return NextResponse.json({ ok: true });
}
