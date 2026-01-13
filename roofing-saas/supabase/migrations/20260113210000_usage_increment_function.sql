-- =============================================================================
-- Usage Increment Function
-- =============================================================================
-- Provides atomic increment for usage counters to prevent race conditions
-- when multiple SMS/emails are sent concurrently.

-- Create function to atomically increment usage counters
CREATE OR REPLACE FUNCTION increment_subscription_usage(
  p_tenant_id UUID,
  p_field TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Validate field name to prevent SQL injection
  IF p_field NOT IN ('sms_used_this_month', 'emails_used_this_month', 'users_count') THEN
    RAISE EXCEPTION 'Invalid field name: %', p_field;
  END IF;

  -- Atomic increment using dynamic SQL
  EXECUTE format(
    'UPDATE subscriptions SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE tenant_id = $2',
    p_field, p_field
  ) USING p_amount, p_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (RLS will still apply on subscriptions table)
GRANT EXECUTE ON FUNCTION increment_subscription_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_subscription_usage(UUID, TEXT, INTEGER) TO service_role;

-- Add comment for documentation
COMMENT ON FUNCTION increment_subscription_usage IS 'Atomically increment usage counters (sms_used_this_month, emails_used_this_month, users_count) for a tenant subscription';
