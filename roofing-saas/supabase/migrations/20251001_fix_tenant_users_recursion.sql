-- =====================================================
-- FIX: Remove recursive RLS policy on tenant_users
-- Date: 2025-10-01
-- Issue: "infinite recursion detected in policy for relation tenant_users"
-- =====================================================

-- Drop the recursive policy
DROP POLICY IF EXISTS "Users can view members of their tenant" ON tenant_users;

-- Keep only the simple policy that allows users to see their own membership
-- This is sufficient for get_user_tenant_id() to work
-- (The first policy "Users can view their own tenant membership" is already correct)

-- Verification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'tenant_users';

  RAISE NOTICE 'tenant_users now has % policies (should be 1)', policy_count;
END $$;
