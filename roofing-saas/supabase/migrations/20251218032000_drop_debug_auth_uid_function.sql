-- Drop the temporary debug function that was created for troubleshooting
-- This function is no longer needed after fixing the signature documents issue

DROP FUNCTION IF EXISTS public.get_auth_uid_debug();
