-- Migration: Add get_tenant_users_with_info RPC function
-- Purpose: Fetch user info (name, avatar) from tenant_users joined with auth.users
--          Used by dashboard queries to avoid expensive fallback queries
-- Called by: lib/dashboard/queries.ts line 108 (fetchUserInfoMap)

-- Drop existing function if it exists (may have different signature)
DROP FUNCTION IF EXISTS public.get_tenant_users_with_info(uuid);

CREATE OR REPLACE FUNCTION public.get_tenant_users_with_info(p_tenant_id uuid)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  avatar_url text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    tu.user_id,
    COALESCE(
      au.raw_user_meta_data->>'full_name',
      au.raw_user_meta_data->>'name',
      au.email,
      'Unknown'
    )::text AS full_name,
    (au.raw_user_meta_data->>'avatar_url')::text AS avatar_url
  FROM public.tenant_users tu
  JOIN auth.users au ON au.id = tu.user_id
  WHERE tu.tenant_id = p_tenant_id
    AND tu.status = 'active';
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_tenant_users_with_info(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_tenant_users_with_info IS 'Fetch user info (name, avatar) for all active users in a tenant. Used by dashboard to resolve user names in activity feeds and leaderboards.';
