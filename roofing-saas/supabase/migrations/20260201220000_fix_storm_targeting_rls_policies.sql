-- Migration: Fix RLS policies for storm targeting system
-- Applied directly to production on 2026-02-01
--
-- ROOT CAUSE: The original migration (202511030002_storm_targeting_system.sql)
-- defined RLS policies using `tenant_id = auth.uid()` which is INCORRECT.
-- In this multi-tenant system, tenant_id is the organization ID, NOT the user ID.
-- auth.uid() returns the user's personal UUID, not their tenant.
--
-- Additionally, some tables only had service_role policies, completely blocking
-- regular authenticated users.
--
-- The correct pattern (used throughout the codebase) is:
--   tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
-- Or use the helper function:
--   tenant_id = get_user_tenant_id()

-- =====================================================
-- 1. storm_targeting_areas - Was only service_role accessible
-- =====================================================

CREATE POLICY IF NOT EXISTS "tenant_users_select_storm_targeting_areas" ON storm_targeting_areas
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "tenant_users_insert_storm_targeting_areas" ON storm_targeting_areas
  FOR INSERT WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "tenant_users_update_storm_targeting_areas" ON storm_targeting_areas
  FOR UPDATE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY IF NOT EXISTS "tenant_users_delete_storm_targeting_areas" ON storm_targeting_areas
  FOR DELETE USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- =====================================================
-- 2. bulk_import_jobs - Had broken tenant_id = auth.uid() policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view jobs for their tenant" ON bulk_import_jobs;
DROP POLICY IF EXISTS "Users can update their jobs" ON bulk_import_jobs;
DROP POLICY IF EXISTS "Users can create jobs for their tenant" ON bulk_import_jobs;

CREATE POLICY IF NOT EXISTS "tenant_users_select_bulk_import_jobs" ON bulk_import_jobs
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY IF NOT EXISTS "tenant_users_insert_bulk_import_jobs" ON bulk_import_jobs
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY IF NOT EXISTS "tenant_users_update_bulk_import_jobs" ON bulk_import_jobs
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- 3. storm_events - Was only service_role accessible
-- =====================================================

CREATE POLICY IF NOT EXISTS "tenant_users_select_storm_events" ON storm_events
  FOR SELECT USING (tenant_id = get_user_tenant_id());

CREATE POLICY IF NOT EXISTS "tenant_users_insert_storm_events" ON storm_events
  FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());

CREATE POLICY IF NOT EXISTS "tenant_users_update_storm_events" ON storm_events
  FOR UPDATE USING (tenant_id = get_user_tenant_id());

-- =====================================================
-- 4. extracted_addresses - Had duplicate INSERT policy with wrong check
-- =====================================================

-- Remove the broken duplicate (had tenant_id = auth.uid())
DROP POLICY IF EXISTS "Users can insert extracted addresses for their tenant" ON extracted_addresses;

-- Keep: "Users can create extracted addresses for their tenant" which uses get_user_tenant_id()
