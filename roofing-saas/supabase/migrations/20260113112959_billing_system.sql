-- Migration: Billing System for Stripe Integration
-- Creates subscription tracking, events, and invoices tables

-- ============================================================================
-- 1. Subscriptions Table (tenant-level billing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Stripe IDs (null until user subscribes)
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  stripe_price_id VARCHAR(255),

  -- Plan Information
  plan_tier VARCHAR(50) NOT NULL DEFAULT 'starter'
    CHECK (plan_tier IN ('starter', 'professional', 'enterprise')),
  plan_name VARCHAR(100) NOT NULL DEFAULT 'Starter',
  price_cents INTEGER NOT NULL DEFAULT 0,
  billing_interval VARCHAR(20) DEFAULT 'month'
    CHECK (billing_interval IN ('month', 'year')),

  -- Subscription Status
  status VARCHAR(50) NOT NULL DEFAULT 'trialing'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired')),

  -- Trial Period
  trial_started_at TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ,
  trial_used BOOLEAN DEFAULT false,

  -- Billing Period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,

  -- Feature Limits (based on plan)
  max_users INTEGER NOT NULL DEFAULT 3,
  max_sms_per_month INTEGER NOT NULL DEFAULT 200,
  max_emails_per_month INTEGER NOT NULL DEFAULT 200,

  -- Current Usage (reset monthly)
  users_count INTEGER DEFAULT 0,
  sms_used_this_month INTEGER DEFAULT 0,
  emails_used_this_month INTEGER DEFAULT 0,
  usage_reset_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,

  -- Each tenant can only have one active subscription
  CONSTRAINT unique_tenant_subscription UNIQUE (tenant_id)
);

COMMENT ON TABLE subscriptions IS 'Tracks subscription status and billing for each tenant';
COMMENT ON COLUMN subscriptions.status IS 'trialing=free trial, active=paid, past_due=payment failed, canceled=user canceled';
COMMENT ON COLUMN subscriptions.max_users IS '-1 means unlimited (Enterprise tier)';

-- ============================================================================
-- 2. Subscription Events Table (audit log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Event Details
  event_type VARCHAR(100) NOT NULL,
  -- Values: trial_started, trial_ended, subscription_created, subscription_updated,
  --         subscription_canceled, payment_succeeded, payment_failed, invoice_paid,
  --         plan_upgraded, plan_downgraded, trial_extended, grace_period_started

  -- Stripe Event (for idempotency)
  stripe_event_id VARCHAR(255),
  stripe_event_type VARCHAR(100),

  -- State Changes
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  previous_plan VARCHAR(50),
  new_plan VARCHAR(50),

  -- Financial Details
  amount_cents INTEGER,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Context
  metadata JSONB DEFAULT '{}',
  initiated_by VARCHAR(50) DEFAULT 'system',
    -- Values: user, stripe_webhook, system, admin
  user_id UUID REFERENCES auth.users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate webhook processing
  CONSTRAINT unique_stripe_event UNIQUE (stripe_event_id)
);

COMMENT ON TABLE subscription_events IS 'Audit log for all subscription-related events';
COMMENT ON COLUMN subscription_events.stripe_event_id IS 'Used for idempotency when processing Stripe webhooks';

-- ============================================================================
-- 3. Invoices Table (billing history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Stripe IDs
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_payment_intent_id VARCHAR(255),

  -- Invoice Details
  invoice_number VARCHAR(100),
  status VARCHAR(50) NOT NULL
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),

  -- Amounts (in cents)
  amount_due_cents INTEGER NOT NULL,
  amount_paid_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',

  -- Dates
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,

  -- URLs (from Stripe)
  hosted_invoice_url TEXT,
  invoice_pdf_url TEXT,

  -- Detailed breakdown
  line_items JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE invoices IS 'Tracks Stripe invoices for billing history display';

-- ============================================================================
-- 4. Tenant Table Updates
-- ============================================================================

-- Add billing-related columns to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'starter';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.stripe_customer_id IS 'Stripe customer ID for this tenant';
COMMENT ON COLUMN tenants.subscription_tier IS 'Current plan tier (denormalized from subscriptions)';
COMMENT ON COLUMN tenants.grace_period_ends_at IS 'When grace period ends after failed payment/trial expiry';

-- ============================================================================
-- 5. Indexes
-- ============================================================================

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON subscriptions(trial_ends_at)
  WHERE status = 'trialing';

-- Subscription events indexes
CREATE INDEX IF NOT EXISTS idx_subscription_events_tenant ON subscription_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription ON subscription_events(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_stripe ON subscription_events(stripe_event_id);
CREATE INDEX IF NOT EXISTS idx_subscription_events_created ON subscription_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_events_type ON subscription_events(event_type);

-- Invoices indexes
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created ON invoices(created_at DESC);

-- Tenants billing indexes
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer ON tenants(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ============================================================================
-- 6. Row Level Security Policies
-- ============================================================================

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Subscriptions: Users can view their tenant's subscription
CREATE POLICY "Users can view their tenant subscription"
  ON subscriptions FOR SELECT
  USING (tenant_id IN (
    SELECT tu.tenant_id FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
  ));

-- Subscriptions: Only admins/owners can update (for internal operations)
-- Note: Most updates come from webhooks using service role
CREATE POLICY "Admins can update subscriptions"
  ON subscriptions FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tu.tenant_id FROM tenant_users tu
      WHERE tu.user_id = auth.uid()
      AND tu.role IN ('admin', 'owner')
    )
  );

-- Subscription Events: Read-only for users
CREATE POLICY "Users can view their tenant subscription events"
  ON subscription_events FOR SELECT
  USING (tenant_id IN (
    SELECT tu.tenant_id FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
  ));

-- Invoices: Users can view their tenant's invoices
CREATE POLICY "Users can view their tenant invoices"
  ON invoices FOR SELECT
  USING (tenant_id IN (
    SELECT tu.tenant_id FROM tenant_users tu
    WHERE tu.user_id = auth.uid()
  ));

-- ============================================================================
-- 7. Updated_at Trigger
-- ============================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Apply to invoices
DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 8. Helper Function: Get Subscription for Tenant
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tenant_subscription(p_tenant_id UUID)
RETURNS TABLE (
  id UUID,
  status VARCHAR(50),
  plan_tier VARCHAR(50),
  trial_ends_at TIMESTAMPTZ,
  trial_days_remaining INTEGER,
  max_users INTEGER,
  users_count INTEGER,
  max_sms_per_month INTEGER,
  sms_used_this_month INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.status,
    s.plan_tier,
    s.trial_ends_at,
    CASE
      WHEN s.status = 'trialing' AND s.trial_ends_at > NOW()
      THEN EXTRACT(DAY FROM (s.trial_ends_at - NOW()))::INTEGER
      ELSE NULL
    END as trial_days_remaining,
    s.max_users,
    s.users_count,
    s.max_sms_per_month,
    s.sms_used_this_month
  FROM subscriptions s
  WHERE s.tenant_id = p_tenant_id
  AND s.is_deleted = false
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Done
-- ============================================================================

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
