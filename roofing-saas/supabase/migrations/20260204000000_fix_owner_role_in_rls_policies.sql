-- =============================================
-- Fix RLS policies to include 'owner' role alongside 'admin'
-- =============================================
-- Issue: Multiple RLS policies only checked for role = 'admin', excluding
-- the 'owner' role which should have the same administrative privileges.
-- This caused tenant owners (like Fahredin) to be blocked from managing
-- substatuses, filters, campaigns, etc.
--
-- This migration updates all affected policies to check for BOTH admin AND owner roles.
-- =============================================

BEGIN;

-- =============================================
-- 1. status_substatus_configs
-- =============================================
-- Note: This was already fixed via direct SQL, but we include it here
-- to ensure the migration history is complete and idempotent.

DROP POLICY IF EXISTS "Admins can manage substatus configs" ON status_substatus_configs;
CREATE POLICY "Admins can manage substatus configs" ON status_substatus_configs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 2. filter_configs
-- =============================================

DROP POLICY IF EXISTS "Admins can manage filter configs" ON filter_configs;
CREATE POLICY "Admins can manage filter configs" ON filter_configs
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 3. saved_filters
-- =============================================

DROP POLICY IF EXISTS "Admins can manage all filters" ON saved_filters;
CREATE POLICY "Admins can manage all filters" ON saved_filters
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 4. filter_usage_logs
-- =============================================
-- This one includes 'manager' as well, so we add 'owner' to the list

DROP POLICY IF EXISTS "Users can view own filter usage" ON filter_usage_logs;
CREATE POLICY "Users can view own filter usage" ON filter_usage_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner', 'manager')
    )
  );

-- =============================================
-- 5. impersonation_logs - SELECT policy
-- =============================================

DROP POLICY IF EXISTS "Admins can view impersonation logs" ON impersonation_logs;
CREATE POLICY "Admins can view impersonation logs" ON impersonation_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 6. impersonation_logs - UPDATE policy
-- =============================================

DROP POLICY IF EXISTS "Admins can update own impersonation logs" ON impersonation_logs;
CREATE POLICY "Admins can update own impersonation logs" ON impersonation_logs
  FOR UPDATE
  USING (
    admin_user_id = auth.uid()
    AND tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 7. digital_business_cards - DELETE policy
-- =============================================

DROP POLICY IF EXISTS "Admins can delete cards" ON digital_business_cards;
CREATE POLICY "Admins can delete cards" ON digital_business_cards
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 8. digital_business_cards - UPDATE policy
-- =============================================

DROP POLICY IF EXISTS "Users can update their own card, admins can update any" ON digital_business_cards;
CREATE POLICY "Users can update their own card, admins can update any" ON digital_business_cards
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- =============================================
-- 9. business_card_interactions - DELETE policy
-- =============================================

DROP POLICY IF EXISTS "Admins can delete interactions" ON business_card_interactions;
CREATE POLICY "Admins can delete interactions" ON business_card_interactions
  FOR DELETE
  USING (
    card_id IN (
      SELECT id FROM digital_business_cards
      WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
      )
    )
  );

COMMIT;

-- =============================================
-- Summary of changes:
-- - status_substatus_configs: admin -> admin, owner
-- - filter_configs: admin -> admin, owner
-- - saved_filters: admin -> admin, owner
-- - filter_usage_logs: admin, manager -> admin, owner, manager
-- - impersonation_logs (SELECT): admin -> admin, owner
-- - impersonation_logs (UPDATE): admin -> admin, owner
-- - digital_business_cards (DELETE): admin -> admin, owner
-- - digital_business_cards (UPDATE): admin -> admin, owner
-- - business_card_interactions (DELETE): admin -> admin, owner
-- =============================================
