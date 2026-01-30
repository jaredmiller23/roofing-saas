-- =============================================================================
-- AI Usage Tracking
-- =============================================================================
-- Add AI token usage and cost tracking to subscriptions table.
-- Follows existing SMS/email usage tracking pattern.
-- Rollback: ALTER TABLE subscriptions DROP COLUMN ai_tokens_used_this_month, DROP COLUMN ai_cost_this_month_cents;

-- Add AI usage columns
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ai_tokens_used_this_month INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ai_cost_this_month_cents INTEGER DEFAULT 0;

-- Update the increment_subscription_usage function to support AI fields
CREATE OR REPLACE FUNCTION increment_subscription_usage(
  p_tenant_id UUID,
  p_field TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Validate field name to prevent SQL injection
  IF p_field NOT IN (
    'sms_used_this_month',
    'emails_used_this_month',
    'users_count',
    'ai_tokens_used_this_month',
    'ai_cost_this_month_cents'
  ) THEN
    RAISE EXCEPTION 'Invalid field name: %', p_field;
  END IF;

  -- Atomic increment using dynamic SQL
  EXECUTE format(
    'UPDATE subscriptions SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE tenant_id = $2',
    p_field, p_field
  ) USING p_amount, p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-grant permissions
GRANT EXECUTE ON FUNCTION increment_subscription_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_subscription_usage(UUID, TEXT, INTEGER) TO service_role;

COMMENT ON FUNCTION increment_subscription_usage IS 'Atomically increment usage counters (sms, email, user, AI tokens, AI cost) for a tenant subscription';
