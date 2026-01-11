-- =====================================================
-- GAMIFICATION TENANT ISOLATION FIX
-- Date: 2026-01-11
--
-- Context: Production database has the original gamification tables:
--   - challenges (from archived migration, already has tenant_id)
--   - point_rules (already has tenant_id from 20260111100000)
--   - achievements (already has tenant_id from 20260111100000)
--   - gamification_scores (already has tenant_id)
--   - gamification_activities (already has tenant_id)
--
-- The newer *_configs tables (challenge_configs, reward_configs, etc.)
-- were never created in production.
--
-- This migration:
-- 1. Ensures RLS policies on existing tables use tenant_users lookup
-- 2. Does NOT create new tables or modify non-existent tables
-- =====================================================

-- =====================================================
-- STEP 1: Fix RLS policies on CHALLENGES table
-- =====================================================

-- Drop old policies (if they exist)
DROP POLICY IF EXISTS "Users can view active challenges" ON public.challenges;
DROP POLICY IF EXISTS "Users can view challenges in their tenant" ON public.challenges;
DROP POLICY IF EXISTS "Users can manage challenges in their tenant" ON public.challenges;

-- Create new policies using tenant_users lookup
CREATE POLICY "Users can view challenges in their tenant" ON public.challenges
  FOR SELECT USING (
    tenant_id IS NULL -- System-wide challenges
    OR tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage challenges in their tenant" ON public.challenges
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = auth.uid())
  );

-- =====================================================
-- STEP 2: Verify RLS on POINT_RULES (already fixed in 20260111100000)
-- =====================================================
-- point_rules already has proper RLS from the previous migration
-- No changes needed

-- =====================================================
-- STEP 3: Verify RLS on ACHIEVEMENTS (already fixed in 20260111100000)
-- =====================================================
-- achievements already has proper RLS from the previous migration
-- No changes needed

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '=== Gamification Tenant Isolation Verification ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Tables with tenant_id:';
  RAISE NOTICE '  - challenges (with updated RLS)';
  RAISE NOTICE '  - point_rules (tenant_id added in 20260111100000)';
  RAISE NOTICE '  - achievements (tenant_id added in 20260111100000)';
  RAISE NOTICE '  - gamification_scores (had tenant_id)';
  RAISE NOTICE '  - gamification_activities (had tenant_id)';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTE: The *_configs tables (challenge_configs, reward_configs,';
  RAISE NOTICE '      kpi_definitions, etc.) do not exist in production.';
  RAISE NOTICE '      API routes for rewards and KPIs will return errors until';
  RAISE NOTICE '      those tables are created if needed.';
END $$;
