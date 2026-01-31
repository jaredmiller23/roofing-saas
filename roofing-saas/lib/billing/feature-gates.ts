/**
 * Feature Gating
 *
 * Controls access to features based on subscription plan.
 * Used by:
 * - API routes to restrict endpoints
 * - UI components to show/hide features
 * - Usage tracking to enforce limits
 */

import { getSubscription } from './subscription';
import { PLANS, isUnlimited } from './plans';
import { getGracePeriodStatus } from './grace-period';
import type {
  PlanFeatures,
  FeatureAccess,
  UsageStats,
} from './types';

// =============================================================================
// Feature Access Checks
// =============================================================================

/**
 * Check if a tenant can use a specific feature
 */
export async function canUseFeature(
  tenantId: string,
  feature: keyof PlanFeatures
): Promise<FeatureAccess> {
  const subscription = await getSubscription(tenantId);

  // No subscription = no access
  if (!subscription) {
    return {
      allowed: false,
      reason: 'No active subscription',
    };
  }

  // Check subscription status
  if (!['active', 'trialing'].includes(subscription.status)) {
    // Check if in grace period
    const gracePeriodStatus = await getGracePeriodStatus(tenantId);

    if (gracePeriodStatus.isInGracePeriod) {
      // Allow access during grace period, but with a warning
      const plan = PLANS[subscription.plan_tier];
      const hasFeature = plan.features[feature];

      if (!hasFeature) {
        return {
          allowed: false,
          reason: `${feature} requires ${getRequiredPlan(feature)} plan or higher`,
        };
      }

      // Feature is available, but in grace period
      return {
        allowed: true,
        warning: `Your subscription has payment issues. Please update your payment method within ${gracePeriodStatus.daysRemaining} days to avoid losing access.`,
      };
    }

    // Grace period expired or not in grace period
    if (gracePeriodStatus.gracePeriodEndsAt) {
      return {
        allowed: false,
        reason: 'Grace period expired. Please upgrade your subscription to restore access.',
      };
    }

    return {
      allowed: false,
      reason: getStatusMessage(subscription.status),
    };
  }

  // Check plan feature
  const plan = PLANS[subscription.plan_tier];
  const hasFeature = plan.features[feature];

  if (!hasFeature) {
    return {
      allowed: false,
      reason: `${feature} requires ${getRequiredPlan(feature)} plan or higher`,
    };
  }

  return { allowed: true };
}

/**
 * Get status-specific message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case 'past_due':
      return 'Payment is past due. Please update your payment method.';
    case 'canceled':
      return 'Subscription has been canceled.';
    case 'unpaid':
      return 'Payment failed. Please update your payment method.';
    case 'incomplete':
      return 'Subscription setup incomplete. Please complete payment.';
    default:
      return 'Subscription is not active.';
  }
}

/**
 * Get the minimum plan required for a feature
 */
function getRequiredPlan(feature: keyof PlanFeatures): string {
  // Check each plan in order
  if (PLANS.starter.features[feature]) return 'Starter';
  if (PLANS.professional.features[feature]) return 'Professional';
  return 'Enterprise';
}

// =============================================================================
// Usage Limit Checks
// =============================================================================

/**
 * Check if tenant can add more users
 */
export async function checkUserLimit(
  tenantId: string
): Promise<{ allowed: boolean; current: number; limit: number; unlimited: boolean }> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    return { allowed: false, current: 0, limit: 0, unlimited: false };
  }

  const limit = subscription.max_users;
  const current = subscription.users_count;
  const unlimited = isUnlimited(limit);

  return {
    allowed: unlimited || current < limit,
    current,
    limit,
    unlimited,
  };
}

/**
 * Check if tenant can send more SMS
 */
export async function checkSmsLimit(
  tenantId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; unlimited: boolean }> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    return { allowed: false, remaining: 0, limit: 0, unlimited: false };
  }

  const limit = subscription.max_sms_per_month;
  const used = subscription.sms_used_this_month;
  const unlimited = isUnlimited(limit);
  const remaining = unlimited ? -1 : Math.max(0, limit - used);

  return {
    allowed: unlimited || remaining > 0,
    remaining,
    limit,
    unlimited,
  };
}

/**
 * Check if tenant can send more emails
 */
export async function checkEmailLimit(
  tenantId: string
): Promise<{ allowed: boolean; remaining: number; limit: number; unlimited: boolean }> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    return { allowed: false, remaining: 0, limit: 0, unlimited: false };
  }

  const limit = subscription.max_emails_per_month;
  const used = subscription.emails_used_this_month;
  const unlimited = isUnlimited(limit);
  const remaining = unlimited ? -1 : Math.max(0, limit - used);

  return {
    allowed: unlimited || remaining > 0,
    remaining,
    limit,
    unlimited,
  };
}

// =============================================================================
// Usage Statistics
// =============================================================================

/**
 * Get usage statistics for a tenant
 */
export async function getUsageStats(tenantId: string): Promise<UsageStats> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    return {
      users: { current: 0, limit: 0, unlimited: false },
      sms: { current: 0, limit: 0, unlimited: false },
      emails: { current: 0, limit: 0, unlimited: false },
    };
  }

  return {
    users: {
      current: subscription.users_count,
      limit: subscription.max_users,
      unlimited: isUnlimited(subscription.max_users),
    },
    sms: {
      current: subscription.sms_used_this_month,
      limit: subscription.max_sms_per_month,
      unlimited: isUnlimited(subscription.max_sms_per_month),
    },
    emails: {
      current: subscription.emails_used_this_month,
      limit: subscription.max_emails_per_month,
      unlimited: isUnlimited(subscription.max_emails_per_month),
    },
  };
}

/**
 * Get all feature access for a tenant's current plan
 */
export async function getAllFeatureAccess(
  tenantId: string
): Promise<Record<keyof PlanFeatures, boolean>> {
  const subscription = await getSubscription(tenantId);

  if (!subscription) {
    // No subscription = no features
    return {
      quickbooksIntegration: false,
      claimsTracking: false,
      stormData: false,
      campaigns: false,
      unlimitedMessaging: false,
      customIntegrations: false,
      dedicatedSupport: false,
      aiChat: false,
      aiVoiceAssistant: false,
      aiKnowledgeBase: false,
    };
  }

  if (!['active', 'trialing'].includes(subscription.status)) {
    // Check if in grace period
    const gracePeriodStatus = await getGracePeriodStatus(tenantId);

    if (gracePeriodStatus.isInGracePeriod) {
      // Allow access during grace period
      return PLANS[subscription.plan_tier].features;
    }

    // Not in grace period = no features
    return {
      quickbooksIntegration: false,
      claimsTracking: false,
      stormData: false,
      campaigns: false,
      unlimitedMessaging: false,
      customIntegrations: false,
      dedicatedSupport: false,
      aiChat: false,
      aiVoiceAssistant: false,
      aiKnowledgeBase: false,
    };
  }

  return PLANS[subscription.plan_tier].features;
}

// =============================================================================
// Server Action Helpers
// =============================================================================

/**
 * Require a feature - throws if not available
 */
export async function requireFeature(
  tenantId: string,
  feature: keyof PlanFeatures
): Promise<void> {
  const access = await canUseFeature(tenantId, feature);

  if (!access.allowed) {
    const error = new Error(access.reason || 'Feature not available');
    (error as Error & { code: string }).code = 'FEATURE_NOT_AVAILABLE';
    throw error;
  }
}

/**
 * Require user limit not exceeded - throws if at limit
 */
export async function requireUserLimit(tenantId: string): Promise<void> {
  const check = await checkUserLimit(tenantId);

  if (!check.allowed) {
    const error = new Error(
      `User limit reached (${check.current}/${check.limit}). Upgrade your plan to add more users.`
    );
    (error as Error & { code: string }).code = 'USER_LIMIT_EXCEEDED';
    throw error;
  }
}

/**
 * Require SMS limit not exceeded - throws if at limit
 */
export async function requireSmsLimit(tenantId: string): Promise<void> {
  const check = await checkSmsLimit(tenantId);

  if (!check.allowed) {
    const error = new Error(
      `SMS limit reached (${check.limit}/month). Upgrade your plan for more SMS.`
    );
    (error as Error & { code: string }).code = 'SMS_LIMIT_EXCEEDED';
    throw error;
  }
}
