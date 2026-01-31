/**
 * Plan Configuration
 *
 * Defines the pricing tiers, features, and limits for each plan.
 * Keep in sync with:
 * - Landing page pricing display (app/page.tsx)
 * - Stripe products/prices in dashboard
 * - Database default values
 */

import type { PlanConfig, PlanTier, PlanFeatures } from './types';

// =============================================================================
// Environment Variables for Stripe Price IDs
// =============================================================================

const STRIPE_PRICES = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_STARTER_YEARLY || '',
  },
  professional: {
    monthly: process.env.STRIPE_PRICE_PROFESSIONAL_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_PROFESSIONAL_YEARLY || '',
  },
  enterprise: {
    monthly: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY || '',
    yearly: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY || '',
  },
};

// =============================================================================
// Plan Definitions
// =============================================================================

export const PLANS: Record<PlanTier, PlanConfig> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    description: 'For solo contractors and small crews',
    priceMonthly: 14900, // $149
    priceYearly: 149000, // $1,490 (save ~2 months)
    stripePriceIdMonthly: STRIPE_PRICES.starter.monthly,
    stripePriceIdYearly: STRIPE_PRICES.starter.yearly,
    maxUsers: 3,
    maxSmsPerMonth: 200,
    maxEmailsPerMonth: 200,
    features: {
      quickbooksIntegration: false,
      claimsTracking: false,
      stormData: false,
      campaigns: false,
      unlimitedMessaging: false,
      customIntegrations: false,
      dedicatedSupport: false,
      aiChat: true,
      aiVoiceAssistant: false,
      aiKnowledgeBase: false,
    },
    featureList: [
      '3 users included',
      'Core CRM & pipeline',
      'Mobile PWA with offline',
      'E-signatures',
      'Territory mapping',
      'SMS/email (200/mo)',
      'ARIA AI chat (basic)',
      'Email support',
    ],
    featured: false,
  },

  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'For growing teams',
    priceMonthly: 29900, // $299
    priceYearly: 299000, // $2,990 (save ~2 months)
    stripePriceIdMonthly: STRIPE_PRICES.professional.monthly,
    stripePriceIdYearly: STRIPE_PRICES.professional.yearly,
    maxUsers: 10,
    maxSmsPerMonth: 1000,
    maxEmailsPerMonth: 1000,
    features: {
      quickbooksIntegration: true,
      claimsTracking: true,
      stormData: true,
      campaigns: true,
      unlimitedMessaging: false,
      customIntegrations: false,
      dedicatedSupport: false,
      aiChat: true,
      aiVoiceAssistant: true,
      aiKnowledgeBase: true,
    },
    featureList: [
      '10 users included',
      'Everything in Starter',
      'Claims/insurance tracking',
      'Storm data integration',
      'Campaigns & automation',
      'QuickBooks integration',
      'ARIA AI (full suite)',
      'SMS/email (1,000/mo)',
      'Priority support',
    ],
    featured: true, // Most popular
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large operations',
    priceMonthly: 49900, // $499
    priceYearly: 499000, // $4,990 (save ~2 months)
    stripePriceIdMonthly: STRIPE_PRICES.enterprise.monthly,
    stripePriceIdYearly: STRIPE_PRICES.enterprise.yearly,
    maxUsers: -1, // Unlimited
    maxSmsPerMonth: -1, // Unlimited
    maxEmailsPerMonth: -1, // Unlimited
    features: {
      quickbooksIntegration: true,
      claimsTracking: true,
      stormData: true,
      campaigns: true,
      unlimitedMessaging: true,
      customIntegrations: true,
      dedicatedSupport: true,
      aiChat: true,
      aiVoiceAssistant: true,
      aiKnowledgeBase: true,
    },
    featureList: [
      'Unlimited users',
      'Everything in Professional',
      'Unlimited SMS/email',
      'ARIA AI (unlimited)',
      'Custom integrations',
      'Dedicated success manager',
      'SLA guarantee',
    ],
    featured: false,
  },
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get plan configuration by tier
 */
export function getPlan(tier: PlanTier): PlanConfig {
  return PLANS[tier];
}

/**
 * Get all plans as an array (sorted by price)
 */
export function getAllPlans(): PlanConfig[] {
  return [PLANS.starter, PLANS.professional, PLANS.enterprise];
}

/**
 * Get Stripe price ID for a plan/interval combination
 */
export function getStripePriceId(
  tier: PlanTier,
  interval: 'month' | 'year'
): string {
  const plan = PLANS[tier];
  return interval === 'month'
    ? plan.stripePriceIdMonthly
    : plan.stripePriceIdYearly;
}

/**
 * Get plan tier from Stripe price ID
 */
export function getPlanTierFromPriceId(priceId: string): PlanTier | null {
  for (const [tier, plan] of Object.entries(PLANS)) {
    if (
      plan.stripePriceIdMonthly === priceId ||
      plan.stripePriceIdYearly === priceId
    ) {
      return tier as PlanTier;
    }
  }
  return null;
}

/**
 * Check if a plan has a specific feature
 */
export function planHasFeature(
  tier: PlanTier,
  feature: keyof PlanFeatures
): boolean {
  return PLANS[tier].features[feature];
}

/**
 * Get user limit for a plan (-1 means unlimited)
 */
export function getUserLimit(tier: PlanTier): number {
  return PLANS[tier].maxUsers;
}

/**
 * Get SMS limit for a plan (-1 means unlimited)
 */
export function getSmsLimit(tier: PlanTier): number {
  return PLANS[tier].maxSmsPerMonth;
}

/**
 * Check if a limit value means "unlimited"
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Format price for display
 */
export function formatPrice(cents: number, interval?: 'month' | 'year'): string {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);

  if (interval === 'month') {
    return `${formatted}/mo`;
  } else if (interval === 'year') {
    return `${formatted}/yr`;
  }
  return formatted;
}

// =============================================================================
// Trial Configuration
// =============================================================================

export const TRIAL_CONFIG = {
  /** Duration of free trial in days */
  durationDays: 30,

  /** Plan tier available during trial */
  trialPlanTier: 'professional' as PlanTier,

  /** Grace period after trial/payment failure in days */
  gracePeriodDays: 7,
};

/**
 * Calculate trial end date from start date
 */
export function calculateTrialEndDate(startDate: Date = new Date()): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + TRIAL_CONFIG.durationDays);
  return endDate;
}

/**
 * Calculate days remaining in trial
 */
export function calculateTrialDaysRemaining(trialEndsAt: Date | string): number {
  const endDate = typeof trialEndsAt === 'string' ? new Date(trialEndsAt) : trialEndsAt;
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}
