-- =====================================================
-- FIX: Add proper SELECT policy to tenant_users
-- Date: 2025-10-01 (Evening)
-- Issue: Territories not showing after creation
-- Root Cause: tenant_users SELECT policy was too restrictive
-- =====================================================

-- Drop existing SELECT policies on tenant_users to start fresh
DROP POLICY IF EXISTS "Users can view their own tenant membership" ON tenant_users;
DROP POLICY IF EXISTS "Users can view members of their tenant" ON tenant_users;

-- Add a simple, non-recursive SELECT policy
-- This allows users to query tenant_users to verify their own membership
-- which is needed for RLS policies on other tables (like territories, contacts, etc.)
CREATE POLICY "Users can select their tenant membership"
  ON tenant_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Verification: Check that the policy was created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tenant_users'
    AND policyname = 'Users can select their tenant membership';

  IF policy_count = 1 THEN
    RAISE NOTICE 'SUCCESS: tenant_users SELECT policy created';
  ELSE
    RAISE WARNING 'FAILED: tenant_users SELECT policy not found';
  END IF;
END $$;
