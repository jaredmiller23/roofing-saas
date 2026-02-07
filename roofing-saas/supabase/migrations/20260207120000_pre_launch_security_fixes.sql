-- Pre-launch security fixes (Feb 7, 2026)
-- Identified by 8-agent scorched earth audit
-- Fixes: encryption keys RLS, missing get_user_tenant_id(), legacy backup table

-- ============================================================
-- T1.1: Fix _encryption_keys table missing RLS
-- Risk: Any authenticated user could query encryption keys
-- Origin: 20260201000000_baseline_schema_reconciliation.sql
-- ============================================================

DO $$
BEGIN
  -- Enable RLS if not already enabled
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = '_encryption_keys' AND schemaname = 'public') THEN
    ALTER TABLE IF EXISTS _encryption_keys ENABLE ROW LEVEL SECURITY;

    -- Deny all user access. Service role bypasses RLS via BYPASSRLS.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE tablename = '_encryption_keys'
        AND policyname = 'Deny all user access to encryption keys'
    ) THEN
      CREATE POLICY "Deny all user access to encryption keys"
        ON _encryption_keys
        FOR ALL
        TO authenticated
        USING (false);
    END IF;

    RAISE NOTICE 'T1.1: _encryption_keys RLS enabled with deny-all policy';
  ELSE
    RAISE NOTICE 'T1.1: _encryption_keys table does not exist, skipping';
  END IF;
END $$;

-- ============================================================
-- T1.2: Create get_user_tenant_id() function
-- Risk: 8 signature document RLS policies reference this function
--        but it was never created. Queries fail at runtime.
-- Origin: 20251218000000_add_signature_documents_rls_policies.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id
  FROM public.tenant_users
  WHERE user_id = auth.uid()
    AND status = 'active'
  ORDER BY joined_at DESC
  LIMIT 1;
$$;

-- Grant execute to authenticated users (needed for RLS policy evaluation)
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id() TO anon;

-- ============================================================
-- T1.3: Delete legacy backup table
-- Risk: organizations_backup_20251119 has no RLS, contains tenant data
-- Origin: 20251119000600_merge_organizations_into_contacts.sql
-- ============================================================

DROP TABLE IF EXISTS organizations_backup_20251119;
