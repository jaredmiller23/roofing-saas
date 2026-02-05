-- Migration: Fix RLS policies that exclude 'owner' role from admin operations
-- Rollback: Re-run original migration policies with role = 'admin' only
--
-- Root cause: 9 RLS policies across 4 migration files used role = 'admin'
-- instead of role IN ('admin', 'owner'), preventing tenant owners from
-- performing admin operations (e.g., Fahredin couldn't create substatuses).
--
-- The isAdmin() helper in the app layer correctly treats owner as admin,
-- but the database policies did not. This migration fixes the mismatch.

-- ============================================================================
-- 1. campaigns (from 20251119000100_campaigns_system.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage campaigns" ON campaigns;
CREATE POLICY "Admins can manage campaigns"
  ON campaigns FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 2. campaign_triggers (from 20251119000100_campaigns_system.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage campaign triggers" ON campaign_triggers;
CREATE POLICY "Admins can manage campaign triggers"
  ON campaign_triggers FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    )
  );

-- ============================================================================
-- 3. campaign_steps (from 20251119000100_campaigns_system.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage campaign steps" ON campaign_steps;
CREATE POLICY "Admins can manage campaign steps"
  ON campaign_steps FOR ALL
  USING (
    campaign_id IN (
      SELECT id FROM campaigns WHERE tenant_id IN (
        SELECT tenant_id FROM tenant_users
        WHERE user_id = auth.uid()
          AND role IN ('admin', 'owner')
      )
    )
  );

-- ============================================================================
-- 4. status_substatus_configs (from 20251119000500_substatus_system.sql)
--    Note: Already fixed in production via direct SQL, but this ensures
--    the migration file matches and is idempotent.
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage substatus configs" ON status_substatus_configs;
CREATE POLICY "Admins can manage substatus configs"
  ON status_substatus_configs FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 5. impersonation_logs - SELECT (from 20251119000200_admin_impersonation.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view impersonation logs" ON impersonation_logs;
CREATE POLICY "Admins can view impersonation logs"
  ON impersonation_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 6. impersonation_logs - INSERT (from 20251119000200_admin_impersonation.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can create impersonation logs" ON impersonation_logs;
CREATE POLICY "Admins can create impersonation logs"
  ON impersonation_logs FOR INSERT
  WITH CHECK (
    admin_user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 7. impersonation_logs - UPDATE (from 20251119000200_admin_impersonation.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can update own impersonation logs" ON impersonation_logs;
CREATE POLICY "Admins can update own impersonation logs"
  ON impersonation_logs FOR UPDATE
  USING (
    admin_user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 8. filter_configs (from 20251119000400_configurable_filters.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage filter configs" ON filter_configs;
CREATE POLICY "Admins can manage filter configs"
  ON filter_configs FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );

-- ============================================================================
-- 9. saved_filters (from 20251119000400_configurable_filters.sql)
-- ============================================================================

DROP POLICY IF EXISTS "Admins can manage all filters" ON saved_filters;
CREATE POLICY "Admins can manage all filters"
  ON saved_filters FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role IN ('admin', 'owner')
    )
  );
