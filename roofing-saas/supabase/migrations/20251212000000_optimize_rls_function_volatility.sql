-- Migration: Optimize RLS Function Volatility
-- Date: 2025-12-12
-- Purpose: Mark get_user_tenant_id() as STABLE to cache results within queries
-- Impact: Massive performance improvement for RLS policies (called once per query instead of once per row)
-- Rollback: See DROP and CREATE statements at end of file

-- ==============================================================================
-- OPTIMIZE get_user_tenant_id() FUNCTION
-- ==============================================================================

-- Recreate with STABLE volatility (CREATE OR REPLACE preserves RLS policy dependencies)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE  -- ← KEY CHANGE: Was VOLATILE, now STABLE
SECURITY DEFINER
AS $function$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
$function$;

-- Add comment explaining the optimization
COMMENT ON FUNCTION public.get_user_tenant_id() IS
'Returns the tenant_id for the current user. Marked as STABLE for RLS performance - result is cached within a single query.';

-- ==============================================================================
-- EXPLANATION
-- ==============================================================================

-- BEFORE (VOLATILE):
-- - Function called for EVERY row in query result
-- - Query 1000 contacts = 1000 function calls
-- - Poor performance at scale
--
-- AFTER (STABLE):
-- - Function called ONCE per query
-- - Query 1000 contacts = 1 function call
-- - Result cached for entire query duration
--
-- Why STABLE is safe here:
-- - Function only reads data (doesn't modify)
-- - Returns same value within a single query/transaction
-- - Depends on session state (auth.uid()), not database state
-- - Perfect for RLS policies

-- ==============================================================================
-- ROLLBACK INSTRUCTIONS
-- ==============================================================================

-- To rollback this migration (restore VOLATILE):
/*

DROP FUNCTION IF EXISTS public.get_user_tenant_id();

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS uuid
LANGUAGE sql
VOLATILE
SECURITY DEFINER
AS $function$
  SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid() LIMIT 1
$function$;

*/
