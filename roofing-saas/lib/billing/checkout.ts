/**
 * Stripe Checkout Session Management
 *
 * Creates Stripe Checkout sessions for:
 * - New subscriptions
 * - Plan upgrades
 * - Trial-to-paid conversions
 */

import Stripe from 'stripe';
import { stripe } from './stripe';
import { getStripePriceId } from './plans';
import type {
  CreateCheckoutParams,
  CheckoutSession,
  PlanTier,
  BillingInterval,
} from './types';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { stripeSpan } from '@/lib/instrumentation';

// =============================================================================
// Checkout Session Creation
// =============================================================================

/**
 * Create a Stripe Checkout session for subscription
 */
export async function createCheckoutSession(
  params: CreateCheckoutParams
): Promise<CheckoutSession> {
  const { tenantId, userId, planTier, billingInterval, successUrl, cancelUrl } =
    params;

  // Get the Stripe price ID for this plan/interval
  const priceId = getStripePriceId(planTier, billingInterval);

  if (!priceId) {
    throw new Error(
      `No Stripe price configured for ${planTier}/${billingInterval}`
    );
  }

  // Get or create Stripe customer
  const customerId = await getOrCreateStripeCustomer(tenantId, userId);

  // Get current subscription to check trial status
  const supabase = await createClient();
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, stripe_subscription_id')
    .eq('tenant_id', tenantId)
    .single();

  // Determine if this is a new subscription or plan change
  const isNewSubscription = !subscription?.stripe_subscription_id;
  const isTrialing = subscription?.status === 'trialing';

  // Build checkout session parameters
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      tenant_id: tenantId,
      user_id: userId,
      plan_tier: planTier,
      billing_interval: billingInterval,
    },
    subscription_data: {
      metadata: {
        tenant_id: tenantId,
        plan_tier: planTier,
      },
    },
    // Allow promotion codes
    allow_promotion_codes: true,
    // Collect billing address
    billing_address_collection: 'required',
  };

  // If user is in trial and has time remaining, preserve it
  if (isTrialing && subscription?.trial_ends_at) {
    const trialEnd = new Date(subscription.trial_ends_at);
    const now = new Date();

    if (trialEnd > now) {
      // Preserve remaining trial time
      sessionParams.subscription_data = {
        ...sessionParams.subscription_data,
        trial_end: Math.floor(trialEnd.getTime() / 1000),
      };
    }
  }

  // Create the checkout session
  const session = await stripeSpan(
    'create_checkout_session',
    () => stripe.checkout.sessions.create(sessionParams),
    { 'stripe.plan_tier': planTier, 'stripe.billing_interval': billingInterval }
  );

  logger.info('Created Stripe checkout session', {
    sessionId: session.id,
    tenantId,
    planTier,
    billingInterval,
    isNewSubscription,
    isTrialing,
  });

  if (!session.url) {
    throw new Error('Failed to create checkout session URL');
  }

  return {
    checkoutUrl: session.url,
    sessionId: session.id,
  };
}

// =============================================================================
// Customer Management
// =============================================================================

/**
 * Get or create a Stripe customer for a tenant
 */
export async function getOrCreateStripeCustomer(
  tenantId: string,
  userId: string
): Promise<string> {
  const supabase = await createAdminClient();

  // Check if tenant already has a Stripe customer ID
  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id, name')
    .eq('id', tenantId)
    .single();

  if (tenant?.stripe_customer_id) {
    return tenant.stripe_customer_id;
  }

  // Get user email for the customer
  const { data: user } = await supabase.auth.admin.getUserById(userId);

  if (!user?.user?.email) {
    throw new Error('User email not found');
  }

  // Create new Stripe customer
  const customer = await stripeSpan(
    'create_customer',
    () => stripe.customers.create({
      email: user.user.email,
      name: tenant?.name || undefined,
      metadata: {
        tenant_id: tenantId,
        user_id: userId,
      },
    })
  );

  // Store customer ID on tenant
  await supabase
    .from('tenants')
    .update({ stripe_customer_id: customer.id })
    .eq('id', tenantId);

  logger.info('Created Stripe customer', {
    customerId: customer.id,
    tenantId,
  });

  return customer.id;
}

/**
 * Get Stripe customer ID for a tenant
 */
export async function getStripeCustomerId(
  tenantId: string
): Promise<string | null> {
  const supabase = await createClient();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single();

  return tenant?.stripe_customer_id || null;
}

// =============================================================================
// Checkout Session Retrieval
// =============================================================================

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string) {
  return stripeSpan(
    'retrieve_checkout_session',
    () => stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })
  );
}

/**
 * Get plan tier from checkout session metadata
 */
export function getPlanFromCheckoutSession(
  session: Awaited<ReturnType<typeof getCheckoutSession>>
): PlanTier {
  const planTier = session.metadata?.plan_tier as PlanTier;
  return planTier || 'starter';
}

/**
 * Get billing interval from checkout session metadata
 */
export function getIntervalFromCheckoutSession(
  session: Awaited<ReturnType<typeof getCheckoutSession>>
): BillingInterval {
  const interval = session.metadata?.billing_interval as BillingInterval;
  return interval || 'month';
}
