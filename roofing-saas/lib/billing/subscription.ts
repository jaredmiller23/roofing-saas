/**
 * Subscription Management
 *
 * Functions for managing tenant subscriptions:
 * - Creating trial subscriptions
 * - Updating subscription status
 * - Handling plan changes
 * - Grace period management
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Json } from '@/lib/types/database.types';
import { stripe } from './stripe';
import { PLANS, TRIAL_CONFIG, calculateTrialEndDate, calculateTrialDaysRemaining } from './plans';
import type {
  Subscription,
  SubscriptionWithPlan,
  SubscriptionStatus,
  PlanTier,
} from './types';
import { logger } from '@/lib/logger';

// =============================================================================
// Get Subscription
// =============================================================================

/**
 * Get subscription for a tenant
 */
export async function getSubscription(
  tenantId: string
): Promise<Subscription | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_deleted', false)
    .single();

  if (error && error.code !== 'PGRST116') {
    logger.error('Error fetching subscription', { tenantId, error });
    throw error;
  }

  return data as Subscription | null;
}

/**
 * Get subscription with plan details
 */
export async function getSubscriptionWithPlan(
  tenantId: string
): Promise<SubscriptionWithPlan | null> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    return null;
  }

  const plan = PLANS[subscription.plan_tier];
  const trialDaysRemaining =
    subscription.status === 'trialing' && subscription.trial_ends_at
      ? calculateTrialDaysRemaining(subscription.trial_ends_at)
      : null;

  return {
    ...subscription,
    plan,
    trialDaysRemaining,
  };
}

// =============================================================================
// Create Trial Subscription
// =============================================================================

/**
 * Create a trial subscription for a new tenant
 * Called during registration
 */
export async function createTrialSubscription(
  tenantId: string
): Promise<Subscription> {
  const supabase = await createAdminClient();

  const trialPlan = PLANS[TRIAL_CONFIG.trialPlanTier];
  const now = new Date();
  const trialEndsAt = calculateTrialEndDate(now);

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      tenant_id: tenantId,
      plan_tier: TRIAL_CONFIG.trialPlanTier,
      plan_name: trialPlan.name,
      price_cents: 0, // Free during trial
      billing_interval: 'month',
      status: 'trialing',
      trial_started_at: now.toISOString(),
      trial_ends_at: trialEndsAt.toISOString(),
      max_users: trialPlan.maxUsers,
      max_sms_per_month: trialPlan.maxSmsPerMonth,
      max_emails_per_month: trialPlan.maxEmailsPerMonth,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error creating trial subscription', { tenantId, error });
    throw error;
  }

  // Log the event
  await logSubscriptionEvent(tenantId, data.id, {
    event_type: 'trial_started',
    new_status: 'trialing',
    new_plan: TRIAL_CONFIG.trialPlanTier,
    initiated_by: 'system',
  });

  // Update tenant's subscription tier
  await supabase
    .from('tenants')
    .update({ subscription_tier: TRIAL_CONFIG.trialPlanTier })
    .eq('id', tenantId);

  logger.info('Created trial subscription', {
    tenantId,
    subscriptionId: data.id,
    trialEndsAt: trialEndsAt.toISOString(),
  });

  return data as Subscription;
}

// =============================================================================
// Update Subscription
// =============================================================================

// Extended Stripe subscription type for webhook data
export interface StripeSubscriptionData {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata: Record<string, string>;
  items: { data: Array<{ price: { id: string } }> };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  trial_end: number | null;
}

/**
 * Update subscription from Stripe webhook data
 */
export async function updateSubscriptionFromStripe(
  rawSubscription: StripeSubscriptionData | unknown
): Promise<Subscription> {
  // Cast to our extended type to access period properties
  const stripeSubscription = rawSubscription as StripeSubscriptionData;
  const supabase = await createAdminClient();

  const tenantId = stripeSubscription.metadata?.tenant_id;
  if (!tenantId) {
    throw new Error('No tenant_id in subscription metadata');
  }

  // Get plan tier from price
  const planTier = (stripeSubscription.metadata?.plan_tier as PlanTier) || 'starter';
  const plan = PLANS[planTier];

  // Map Stripe status to our status
  const status = mapStripeStatus(stripeSubscription.status);

  // Get current subscription for comparison
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('status, plan_tier')
    .eq('tenant_id', tenantId)
    .single();

  // Build update object
  const updateData = {
    stripe_subscription_id: stripeSubscription.id,
    stripe_customer_id:
      typeof stripeSubscription.customer === 'string'
        ? stripeSubscription.customer
        : stripeSubscription.customer?.id,
    stripe_price_id: stripeSubscription.items.data[0]?.price.id,
    plan_tier: planTier,
    plan_name: plan.name,
    price_cents: plan.priceMonthly,
    status,
    current_period_start: new Date(
      stripeSubscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      stripeSubscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: stripeSubscription.cancel_at_period_end,
    canceled_at: stripeSubscription.canceled_at
      ? new Date(stripeSubscription.canceled_at * 1000).toISOString()
      : null,
    max_users: plan.maxUsers,
    max_sms_per_month: plan.maxSmsPerMonth,
    max_emails_per_month: plan.maxEmailsPerMonth,
  };

  // Handle trial end
  if (stripeSubscription.trial_end) {
    Object.assign(updateData, {
      trial_ends_at: new Date(stripeSubscription.trial_end * 1000).toISOString(),
    });
  }

  // Upsert subscription
  const { data, error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        tenant_id: tenantId,
        ...updateData,
      },
      {
        onConflict: 'tenant_id',
      }
    )
    .select()
    .single();

  if (error) {
    logger.error('Error updating subscription from Stripe', { tenantId, error });
    throw error;
  }

  // Log status change if different
  if (currentSub?.status !== status) {
    await logSubscriptionEvent(tenantId, data.id, {
      event_type: 'subscription_updated',
      previous_status: currentSub?.status,
      new_status: status,
      previous_plan: currentSub?.plan_tier,
      new_plan: planTier,
      initiated_by: 'stripe_webhook',
    });
  }

  // Update tenant's subscription tier
  await supabase
    .from('tenants')
    .update({ subscription_tier: planTier })
    .eq('id', tenantId);

  logger.info('Updated subscription from Stripe', {
    tenantId,
    subscriptionId: data.id,
    status,
    planTier,
  });

  return data as Subscription;
}

/**
 * Map Stripe subscription status to our status
 */
function mapStripeStatus(
  stripeStatus: string
): SubscriptionStatus {
  const statusMap: Record<string, SubscriptionStatus> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
  };

  return statusMap[stripeStatus] || 'incomplete';
}

// =============================================================================
// Cancel Subscription
// =============================================================================

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(
  tenantId: string,
  userId: string
): Promise<Subscription> {
  const subscription = await getSubscription(tenantId);

  if (!subscription?.stripe_subscription_id) {
    throw new Error('No active Stripe subscription to cancel');
  }

  // Cancel in Stripe (at period end)
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // Update local record
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: true,
    })
    .eq('id', subscription.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Log event
  await logSubscriptionEvent(tenantId, subscription.id, {
    event_type: 'subscription_canceled',
    previous_status: subscription.status,
    new_status: subscription.status,
    initiated_by: 'user',
    user_id: userId,
  });

  logger.info('Subscription scheduled for cancellation', {
    tenantId,
    subscriptionId: subscription.id,
  });

  return data as Subscription;
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(
  tenantId: string
): Promise<Subscription> {
  const subscription = await getSubscription(tenantId);

  if (!subscription?.stripe_subscription_id) {
    throw new Error('No Stripe subscription to reactivate');
  }

  // Reactivate in Stripe
  await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    cancel_at_period_end: false,
  });

  // Update local record
  const supabase = await createAdminClient();
  const { data, error } = await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('id', subscription.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  logger.info('Subscription reactivated', {
    tenantId,
    subscriptionId: subscription.id,
  });

  return data as Subscription;
}

// =============================================================================
// Event Logging
// =============================================================================

/**
 * Log a subscription event
 */
export async function logSubscriptionEvent(
  tenantId: string,
  subscriptionId: string,
  event: {
    event_type: string;
    stripe_event_id?: string;
    stripe_event_type?: string;
    previous_status?: string;
    new_status?: string;
    previous_plan?: string;
    new_plan?: string;
    amount_cents?: number;
    metadata?: Record<string, unknown>;
    initiated_by: 'user' | 'stripe_webhook' | 'system' | 'admin';
    user_id?: string;
  }
): Promise<void> {
  const supabase = await createAdminClient();

  await supabase.from('subscription_events').insert({
    tenant_id: tenantId,
    subscription_id: subscriptionId,
    event_type: event.event_type,
    stripe_event_id: event.stripe_event_id,
    stripe_event_type: event.stripe_event_type,
    previous_status: event.previous_status,
    new_status: event.new_status,
    previous_plan: event.previous_plan,
    new_plan: event.new_plan,
    amount_cents: event.amount_cents,
    metadata: (event.metadata ?? null) as Json | null,
    initiated_by: event.initiated_by,
    user_id: event.user_id,
  });
}

// =============================================================================
// Status Checks
// =============================================================================

/**
 * Check if subscription is active (paid or trialing)
 */
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return ['active', 'trialing'].includes(subscription.status);
}

/**
 * Check if subscription is in trial
 */
export function isSubscriptionTrialing(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return subscription.status === 'trialing';
}

/**
 * Check if subscription has payment issues
 */
export function hasPaymentIssue(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  return ['past_due', 'unpaid', 'incomplete'].includes(subscription.status);
}
