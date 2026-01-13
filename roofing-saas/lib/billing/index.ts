/**
 * Billing Module
 *
 * Re-exports all billing-related functions and types.
 */

// Types
export * from './types';

// Plan configuration
export {
  PLANS,
  TRIAL_CONFIG,
  getPlan,
  getAllPlans,
  getStripePriceId,
  getPlanTierFromPriceId,
  planHasFeature,
  getUserLimit,
  getSmsLimit,
  isUnlimited,
  formatPrice,
  calculateTrialEndDate,
  calculateTrialDaysRemaining,
} from './plans';

// Stripe client
export { stripe, isStripeConfigured, getStripeConfig } from './stripe';

// Checkout
export {
  createCheckoutSession,
  getOrCreateStripeCustomer,
  getStripeCustomerId,
  getCheckoutSession,
  getPlanFromCheckoutSession,
  getIntervalFromCheckoutSession,
} from './checkout';

// Portal
export { createPortalSession, ensurePortalConfiguration } from './portal';

// Subscription management
export {
  getSubscription,
  getSubscriptionWithPlan,
  createTrialSubscription,
  updateSubscriptionFromStripe,
  cancelSubscription,
  reactivateSubscription,
  logSubscriptionEvent,
  isSubscriptionActive,
  isSubscriptionTrialing,
  hasPaymentIssue,
} from './subscription';

// Feature gating
export {
  canUseFeature,
  checkUserLimit,
  checkSmsLimit,
  checkEmailLimit,
  getUsageStats,
  getAllFeatureAccess,
  requireFeature,
  requireUserLimit,
  requireSmsLimit,
} from './feature-gates';

// Usage tracking
export {
  incrementSmsUsage,
  incrementEmailUsage,
  updateUserCount,
  resetUsageCounters,
  getCurrentUsage,
} from './usage';
