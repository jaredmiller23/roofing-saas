/**
 * Stripe Webhook Handler
 *
 * Main router for Stripe webhook events.
 * Verifies signatures and dispatches to specific handlers.
 */

import { stripe } from '../stripe';
import type { StripeEvent } from '../stripe';
import { handleSubscriptionEvent } from './subscription';
import { handleInvoiceEvent } from './invoice';
import { logger } from '@/lib/logger';

// =============================================================================
// Webhook Verification
// =============================================================================

/**
 * Verify Stripe webhook signature
 */
export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<{ valid: boolean; event?: StripeEvent; error?: string }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return { valid: false, error: 'Webhook secret not configured' };
  }

  try {
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return { valid: true, event };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    logger.error('Webhook signature verification failed', { error: message });
    return { valid: false, error: message };
  }
}

// =============================================================================
// Event Router
// =============================================================================

/**
 * Route webhook event to appropriate handler
 */
export async function handleWebhookEvent(
  event: StripeEvent
): Promise<{ success: boolean; message: string }> {
  const eventType = event.type;

  logger.info('Processing Stripe webhook', {
    eventId: event.id,
    eventType,
  });

  try {
    switch (eventType) {
      // Checkout events
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(event);

      // Subscription lifecycle events
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
      case 'customer.subscription.trial_will_end':
        return await handleSubscriptionEvent(event);

      // Invoice events
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.upcoming':
      case 'invoice.finalized':
        return await handleInvoiceEvent(event);

      // Customer events
      case 'customer.created':
      case 'customer.updated':
        return await handleCustomerEvent(event);

      // Unhandled events (log but don't fail)
      default:
        logger.debug('Unhandled webhook event type', { eventType });
        return { success: true, message: `Event ${eventType} acknowledged` };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Webhook handler error', {
      eventId: event.id,
      eventType,
      error: message,
    });
    throw error;
  }
}

// =============================================================================
// Checkout Handler
// =============================================================================

async function handleCheckoutSessionCompleted(
  event: StripeEvent
): Promise<{ success: boolean; message: string }> {
  const session = event.data.object as {
    id: string;
    mode: string;
    subscription?: string;
    customer?: string;
    metadata?: Record<string, string>;
  };

  // Only handle subscription checkouts
  if (session.mode !== 'subscription') {
    return { success: true, message: 'Non-subscription checkout ignored' };
  }

  const tenantId = session.metadata?.tenant_id;
  if (!tenantId) {
    logger.warn('Checkout session missing tenant_id', { sessionId: session.id });
    return { success: false, message: 'Missing tenant_id in metadata' };
  }

  // The subscription.created/updated events will handle the actual subscription
  // This is just for logging/acknowledgment
  logger.info('Checkout session completed', {
    sessionId: session.id,
    tenantId,
    subscriptionId: session.subscription,
  });

  return {
    success: true,
    message: 'Checkout session processed',
  };
}

// =============================================================================
// Customer Handler
// =============================================================================

async function handleCustomerEvent(
  event: StripeEvent
): Promise<{ success: boolean; message: string }> {
  const customer = event.data.object as {
    id: string;
    metadata?: Record<string, string>;
  };

  const tenantId = customer.metadata?.tenant_id;

  logger.info('Customer event processed', {
    eventType: event.type,
    customerId: customer.id,
    tenantId,
  });

  return {
    success: true,
    message: `Customer ${event.type} processed`,
  };
}

// =============================================================================
// Idempotency Check
// =============================================================================

/**
 * Check if an event has already been processed
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  // Import here to avoid circular dependency
  const { createAdminClient } = await import('@/lib/supabase/server');
  const supabase = await createAdminClient();

  const { data } = await supabase
    .from('subscription_events')
    .select('id')
    .eq('stripe_event_id', eventId)
    .single();

  return Boolean(data);
}
