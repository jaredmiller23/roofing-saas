/**
 * Billing System Types
 *
 * TypeScript types for the Stripe billing integration.
 */

// =============================================================================
// Plan Types
// =============================================================================

export type PlanTier = 'starter' | 'professional' | 'enterprise';
export type BillingInterval = 'month' | 'year';

export interface PlanFeatures {
  quickbooksIntegration: boolean;
  claimsTracking: boolean;
  stormData: boolean;
  campaigns: boolean;
  unlimitedMessaging: boolean;
  customIntegrations: boolean;
  dedicatedSupport: boolean;
}

export interface PlanConfig {
  id: PlanTier;
  name: string;
  description: string;
  priceMonthly: number; // in cents
  priceYearly: number; // in cents
  stripePriceIdMonthly: string;
  stripePriceIdYearly: string;
  maxUsers: number; // -1 for unlimited
  maxSmsPerMonth: number; // -1 for unlimited
  maxEmailsPerMonth: number; // -1 for unlimited
  features: PlanFeatures;
  featureList: string[];
  featured: boolean;
}

// =============================================================================
// Subscription Types
// =============================================================================

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'incomplete'
  | 'incomplete_expired';

export interface Subscription {
  id: string;
  tenant_id: string;

  // Stripe IDs
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;

  // Plan
  plan_tier: PlanTier;
  plan_name: string;
  price_cents: number;
  billing_interval: BillingInterval;

  // Status
  status: SubscriptionStatus;

  // Trial
  trial_started_at: string | null;
  trial_ends_at: string | null;
  trial_used: boolean;

  // Billing
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;

  // Limits
  max_users: number;
  max_sms_per_month: number;
  max_emails_per_month: number;

  // Usage
  users_count: number;
  sms_used_this_month: number;
  emails_used_this_month: number;
  ai_tokens_used_this_month: number;
  ai_cost_this_month_cents: number;
  usage_reset_at: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
}

export interface SubscriptionWithPlan extends Subscription {
  plan: PlanConfig;
  trialDaysRemaining: number | null;
}

// =============================================================================
// Usage Types
// =============================================================================

export interface UsageStats {
  users: {
    current: number;
    limit: number;
    unlimited: boolean;
  };
  sms: {
    current: number;
    limit: number;
    unlimited: boolean;
  };
  emails: {
    current: number;
    limit: number;
    unlimited: boolean;
  };
}

export interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  /** Warning message when access is allowed but there's an issue (e.g., grace period) */
  warning?: string;
}

// =============================================================================
// Event Types
// =============================================================================

export type SubscriptionEventType =
  | 'trial_started'
  | 'trial_ended'
  | 'trial_extended'
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'payment_succeeded'
  | 'payment_failed'
  | 'invoice_paid'
  | 'grace_period_started';

export interface SubscriptionEvent {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  event_type: SubscriptionEventType;
  stripe_event_id: string | null;
  stripe_event_type: string | null;
  previous_status: SubscriptionStatus | null;
  new_status: SubscriptionStatus | null;
  previous_plan: PlanTier | null;
  new_plan: PlanTier | null;
  amount_cents: number | null;
  currency: string;
  metadata: Record<string, unknown>;
  initiated_by: 'user' | 'stripe_webhook' | 'system' | 'admin';
  user_id: string | null;
  created_at: string;
}

// =============================================================================
// Invoice Types
// =============================================================================

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Invoice {
  id: string;
  tenant_id: string;
  subscription_id: string | null;
  stripe_invoice_id: string;
  stripe_payment_intent_id: string | null;
  invoice_number: string | null;
  status: InvoiceStatus;
  amount_due_cents: number;
  amount_paid_cents: number;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  due_date: string | null;
  paid_at: string | null;
  hosted_invoice_url: string | null;
  invoice_pdf_url: string | null;
  line_items: LineItem[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LineItem {
  id: string;
  description: string;
  amount: number;
  quantity: number;
}

// =============================================================================
// Checkout Types
// =============================================================================

export interface CreateCheckoutParams {
  tenantId: string;
  userId: string;
  planTier: PlanTier;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  checkoutUrl: string;
  sessionId: string;
}

// =============================================================================
// Portal Types
// =============================================================================

export interface CreatePortalParams {
  tenantId: string;
  returnUrl: string;
}

export interface PortalSession {
  portalUrl: string;
}
