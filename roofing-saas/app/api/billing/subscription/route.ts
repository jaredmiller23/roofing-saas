/**
 * GET /api/billing/subscription
 * Returns current subscription status for the authenticated user's tenant.
 *
 * POST /api/billing/subscription
 * Cancel subscription (sets cancel_at_period_end)
 */

import { NextRequest } from 'next/server';
import { getCurrentUser, getUserTenantId } from '@/lib/auth/session';
import {
  getSubscriptionWithPlan,
  cancelSubscription,
  reactivateSubscription,
} from '@/lib/billing/subscription';
import { getUsageStats, getAllFeatureAccess } from '@/lib/billing/feature-gates';
import {
  AuthenticationError,
  AuthorizationError,
  ValidationError,
  InternalError,
} from '@/lib/api/errors';
import { successResponse, errorResponse } from '@/lib/api/response';
import { logger } from '@/lib/logger';

/**
 * GET /api/billing/subscription
 * Get current subscription status with plan details and usage
 */
export async function GET(_request: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      throw AuthenticationError();
    }

    // Get tenant
    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant');
    }

    // Get subscription with plan details
    const subscription = await getSubscriptionWithPlan(tenantId);

    // Get usage stats
    const usage = await getUsageStats(tenantId);

    // Get feature access
    const features = await getAllFeatureAccess(tenantId);

    return successResponse({
      subscription: subscription
        ? {
            id: subscription.id,
            status: subscription.status,
            planTier: subscription.plan_tier,
            planName: subscription.plan_name,
            priceCents: subscription.price_cents,
            billingInterval: subscription.billing_interval,
            trialStartedAt: subscription.trial_started_at,
            trialEndsAt: subscription.trial_ends_at,
            trialDaysRemaining: subscription.trialDaysRemaining,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            canceledAt: subscription.canceled_at,
          }
        : null,
      plan: subscription?.plan
        ? {
            id: subscription.plan.id,
            name: subscription.plan.name,
            description: subscription.plan.description,
            featureList: subscription.plan.featureList,
          }
        : null,
      usage,
      features,
    });
  } catch (error) {
    logger.error('Error fetching subscription', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}

/**
 * POST /api/billing/subscription
 * Cancel or reactivate subscription
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate
    const user = await getCurrentUser();
    if (!user) {
      throw AuthenticationError();
    }

    // Get tenant
    const tenantId = await getUserTenantId(user.id);
    if (!tenantId) {
      throw AuthorizationError('User not associated with any tenant');
    }

    // Parse body
    const body = await request.json();
    const { action } = body;

    if (!action || !['cancel', 'reactivate'].includes(action)) {
      throw ValidationError('Invalid action. Must be "cancel" or "reactivate"');
    }

    let subscription;

    if (action === 'cancel') {
      subscription = await cancelSubscription(tenantId, user.id);
      logger.info('Subscription canceled', { tenantId, userId: user.id });
    } else {
      subscription = await reactivateSubscription(tenantId);
      logger.info('Subscription reactivated', { tenantId, userId: user.id });
    }

    return successResponse({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      message:
        action === 'cancel'
          ? 'Subscription will be canceled at the end of the current billing period'
          : 'Subscription has been reactivated',
    });
  } catch (error) {
    logger.error('Error updating subscription', { error });
    return errorResponse(error instanceof Error ? error : InternalError());
  }
}
