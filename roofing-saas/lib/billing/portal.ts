/**
 * Stripe Customer Portal Management
 *
 * Creates portal sessions for customers to:
 * - View and download invoices
 * - Update payment methods
 * - Cancel subscriptions
 * - View billing history
 */

import { stripe } from './stripe';
import { getStripeCustomerId } from './checkout';
import type { CreatePortalParams, PortalSession } from './types';
import { logger } from '@/lib/logger';

// =============================================================================
// Portal Session Creation
// =============================================================================

/**
 * Create a Stripe Customer Portal session
 */
export async function createPortalSession(
  params: CreatePortalParams
): Promise<PortalSession> {
  const { tenantId, returnUrl } = params;

  // Get Stripe customer ID
  const customerId = await getStripeCustomerId(tenantId);

  if (!customerId) {
    throw new Error('No Stripe customer found for this tenant');
  }

  // Create portal session
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  logger.info('Created Stripe portal session', {
    tenantId,
    customerId,
  });

  return {
    portalUrl: session.url,
  };
}

// =============================================================================
// Portal Configuration
// =============================================================================

/**
 * Get or create the Stripe Customer Portal configuration
 *
 * Note: This is typically done once in the Stripe dashboard,
 * but can be programmatically created/updated if needed.
 */
export async function ensurePortalConfiguration(): Promise<string> {
  // Check for existing configurations
  const { data: configs } = await stripe.billingPortal.configurations.list({
    limit: 1,
    is_default: true,
  });

  if (configs.length > 0) {
    return configs[0].id;
  }

  // Create a default configuration if none exists
  const config = await stripe.billingPortal.configurations.create({
    business_profile: {
      headline: 'Job Clarity CRM - Manage Your Subscription',
    },
    features: {
      subscription_cancel: {
        enabled: true,
        mode: 'at_period_end',
        proration_behavior: 'none',
      },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ['price', 'quantity'],
        proration_behavior: 'create_prorations',
        products: [], // Will be filled from Stripe products
      },
      payment_method_update: {
        enabled: true,
      },
      invoice_history: {
        enabled: true,
      },
    },
  });

  logger.info('Created Stripe portal configuration', {
    configId: config.id,
  });

  return config.id;
}
