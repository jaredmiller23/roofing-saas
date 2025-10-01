-- =====================================================
-- TERRITORY VISIBILITY DIAGNOSTIC SCRIPT
-- Run this in Supabase SQL Editor to diagnose why territories aren't showing
-- =====================================================

-- 1. Check if territories exist in the database (bypassing RLS)
SELECT
  '1. All territories in database (bypassing RLS)' as check_name,
  id,
  name,
  tenant_id,
  created_by,
  is_deleted,
  created_at
FROM territories
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check current user's auth ID
SELECT
  '2. Current authenticated user' as check_name,
  auth.uid() as current_user_id;

-- 3. Check current user's tenant membership
SELECT
  '3. Current user tenant membership' as check_name,
  tenant_id,
  user_id,
  role
FROM tenant_users
WHERE user_id = auth.uid();

-- 4. Check territories visible with RLS (what the app sees)
SELECT
  '4. Territories visible with RLS' as check_name,
  id,
  name,
  tenant_id,
  created_by,
  is_deleted
FROM territories
WHERE is_deleted = false
ORDER BY created_at DESC;

-- 5. Check RLS policies on territories table
SELECT
  '5. RLS policies on territories' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'territories'
ORDER BY policyname;

-- 6. Check RLS policies on tenant_users table
SELECT
  '6. RLS policies on tenant_users' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'tenant_users'
ORDER BY policyname;

-- 7. Verify tenant_id matching
SELECT
  '7. Tenant ID comparison' as check_name,
  (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1) as user_tenant_id,
  (SELECT tenant_id FROM territories ORDER BY created_at DESC LIMIT 1) as latest_territory_tenant_id,
  CASE
    WHEN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1) =
         (SELECT tenant_id FROM territories ORDER BY created_at DESC LIMIT 1)
    THEN 'MATCH ✓'
    ELSE 'MISMATCH ✗'
  END as match_status;

-- 8. Test the exact RLS subquery used in territories policy
SELECT
  '8. Test RLS subquery (should return your tenant_id)' as check_name,
  tenant_id
FROM tenant_users
WHERE user_id = auth.uid();

-- 9. Count territories by tenant
SELECT
  '9. Territory count by tenant' as check_name,
  t.tenant_id,
  COUNT(*) as territory_count,
  tn.name as tenant_name
FROM territories t
LEFT JOIN tenants tn ON tn.id = t.tenant_id
WHERE t.is_deleted = false
GROUP BY t.tenant_id, tn.name;

-- 10. Check if RLS is enabled
SELECT
  '10. RLS status' as check_name,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('territories', 'tenant_users');
