/**
 * Subscription Webhook Handlers
 *
 * Handles all subscription-related Stripe webhook events.
 */

import type { StripeEvent, StripeSubscription } from '../stripe';
import { updateSubscriptionFromStripe, logSubscriptionEvent } from '../subscription';
import { PLANS } from '../plans';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/resend/email';
import { getTenantAdminEmail } from '../grace-period';
import { createTrialEndingEmail, getTrialEndingSubject } from '../emails';

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Handle subscription lifecycle events
 */
export async function handleSubscriptionEvent(
  event: StripeEvent
): Promise<{ success: boolean; message: string }> {
  const subscription = event.data.object as StripeSubscription;
  const tenantId = subscription.metadata?.tenant_id;

  if (!tenantId) {
    logger.warn('Subscription event missing tenant_id', {
      eventType: event.type,
      subscriptionId: subscription.id,
    });
    return { success: false, message: 'Missing tenant_id in subscription metadata' };
  }

  switch (event.type) {
    case 'customer.subscription.created':
      return await handleSubscriptionCreated(event, subscription, tenantId);

    case 'customer.subscription.updated':
      return await handleSubscriptionUpdated(event, subscription, tenantId);

    case 'customer.subscription.deleted':
      return await handleSubscriptionDeleted(event, subscription, tenantId);

    case 'customer.subscription.trial_will_end':
      return await handleTrialWillEnd(event, subscription, tenantId);

    case 'customer.subscription.paused':
    case 'customer.subscription.resumed':
      // Update status via the standard update path
      return await handleSubscriptionUpdated(event, subscription, tenantId);

    default:
      return { success: true, message: `Unhandled subscription event: ${event.type}` };
  }
}

// =============================================================================
// Event Handlers
// =============================================================================

/**
 * Handle new subscription created
 */
async function handleSubscriptionCreated(
  event: StripeEvent,
  subscription: StripeSubscription,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  logger.info('Processing subscription.created', {
    subscriptionId: subscription.id,
    tenantId,
    status: subscription.status,
  });

  // Update/create local subscription record
  const localSub = await updateSubscriptionFromStripe(subscription);

  // Log event
  await logSubscriptionEvent(tenantId, localSub.id, {
    event_type: 'subscription_created',
    stripe_event_id: event.id,
    stripe_event_type: event.type,
    new_status: subscription.status,
    new_plan: localSub.plan_tier,
    initiated_by: 'stripe_webhook',
  });

  return {
    success: true,
    message: `Subscription created: ${subscription.id}`,
  };
}

/**
 * Handle subscription updated (status change, plan change, etc.)
 */
async function handleSubscriptionUpdated(
  event: StripeEvent,
  subscription: StripeSubscription,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createAdminClient();

  // Get previous state
  const { data: previousSub } = await supabase
    .from('subscriptions')
    .select('status, plan_tier')
    .eq('tenant_id', tenantId)
    .single();

  logger.info('Processing subscription.updated', {
    subscriptionId: subscription.id,
    tenantId,
    previousStatus: previousSub?.status,
    newStatus: subscription.status,
  });

  // Update local subscription record
  const localSub = await updateSubscriptionFromStripe(subscription);

  // Determine event type based on changes
  let eventType = 'subscription_updated';
  if (previousSub) {
    if (previousSub.status === 'trialing' && subscription.status === 'active') {
      eventType = 'trial_ended';
    } else if (previousSub.plan_tier !== localSub.plan_tier) {
      // Determine upgrade vs downgrade
      const previousPrice = PLANS[previousSub.plan_tier as keyof typeof PLANS]?.priceMonthly || 0;
      const newPrice = PLANS[localSub.plan_tier]?.priceMonthly || 0;
      eventType = newPrice > previousPrice ? 'plan_upgraded' : 'plan_downgraded';
    }
  }

  // Log event
  await logSubscriptionEvent(tenantId, localSub.id, {
    event_type: eventType,
    stripe_event_id: event.id,
    stripe_event_type: event.type,
    previous_status: previousSub?.status,
    new_status: subscription.status,
    previous_plan: previousSub?.plan_tier,
    new_plan: localSub.plan_tier,
    initiated_by: 'stripe_webhook',
  });

  return {
    success: true,
    message: `Subscription updated: ${subscription.id}`,
  };
}

/**
 * Handle subscription deleted (canceled and past period end)
 */
async function handleSubscriptionDeleted(
  event: StripeEvent,
  subscription: StripeSubscription,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  const supabase = await createAdminClient();

  logger.info('Processing subscription.deleted', {
    subscriptionId: subscription.id,
    tenantId,
  });

  // Get current subscription
  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .single();

  if (currentSub) {
    // Update status to canceled
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('id', currentSub.id);

    // Update tenant tier to starter (downgrade)
    await supabase
      .from('tenants')
      .update({ subscription_tier: 'starter' })
      .eq('id', tenantId);

    // Log event
    await logSubscriptionEvent(tenantId, currentSub.id, {
      event_type: 'subscription_canceled',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      previous_status: currentSub.status,
      new_status: 'canceled',
      initiated_by: 'stripe_webhook',
    });
  }

  return {
    success: true,
    message: `Subscription deleted: ${subscription.id}`,
  };
}

/**
 * Handle trial ending soon notification (3 days before)
 */
async function handleTrialWillEnd(
  event: StripeEvent,
  subscription: StripeSubscription,
  tenantId: string
): Promise<{ success: boolean; message: string }> {
  logger.info('Processing subscription.trial_will_end', {
    subscriptionId: subscription.id,
    tenantId,
    trialEnd: subscription.trial_end,
  });

  // Send notification email to tenant admin
  const adminInfo = await getTenantAdminEmail(tenantId);
  if (adminInfo) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.example.com';
    const upgradeUrl = `${baseUrl}/settings?tab=billing`;

    const trialEndDate = subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'soon';

    const html = createTrialEndingEmail({
      tenantName: adminInfo.tenantName,
      daysRemaining: 3,
      upgradeUrl,
      trialEndDate,
    });

    try {
      await sendEmail({
        to: adminInfo.email,
        subject: getTrialEndingSubject(3),
        html,
      });

      logger.info('Sent trial ending email', { tenantId, to: adminInfo.email });
    } catch (emailError) {
      logger.error('Failed to send trial ending email', { tenantId, error: emailError });
    }
  }

  // Log the event
  const supabase = await createAdminClient();
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('tenant_id', tenantId)
    .single();

  if (sub) {
    await logSubscriptionEvent(tenantId, sub.id, {
      event_type: 'trial_ended',
      stripe_event_id: event.id,
      stripe_event_type: event.type,
      metadata: {
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        days_remaining: 3,
      },
      initiated_by: 'stripe_webhook',
    });
  }

  return {
    success: true,
    message: 'Trial ending notification processed',
  };
}
