-- TEMPORARY DEBUG FUNCTION - REMOVE AFTER FIXING
-- Returns auth.uid() for debugging RLS issues

CREATE OR REPLACE FUNCTION public.get_auth_uid_debug()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT auth.uid()
$$;

COMMENT ON FUNCTION public.get_auth_uid_debug() IS 'TEMPORARY: Debug function to check auth.uid() value. Remove after fixing signature documents issue.';
