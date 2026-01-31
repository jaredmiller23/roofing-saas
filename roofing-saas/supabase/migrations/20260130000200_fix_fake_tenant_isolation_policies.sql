-- Fix fake "tenant_isolation" RLS policies
-- These 5 tables have policies NAMED "tenant_isolation" but the actual qual is just 'true'
-- meaning ANY authenticated user can read/write ANY tenant's data. This migration replaces
-- them with proper tenant_users subquery isolation.
-- Also enables RLS on claim_outcomes and packets which have tenant_id but RLS disabled.

-- ============================================================================
-- Priority 1: Replace fake policies (qual = 'true') with real tenant isolation
-- ============================================================================

-- claims (1 existing row - active data exposed)
DROP POLICY IF EXISTS "claims_tenant_isolation" ON claims;
CREATE POLICY "claims_tenant_isolation" ON claims
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- claim_communications
DROP POLICY IF EXISTS "communications_tenant_isolation" ON claim_communications;
CREATE POLICY "communications_tenant_isolation" ON claim_communications
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- claim_documents
DROP POLICY IF EXISTS "documents_tenant_isolation" ON claim_documents;
CREATE POLICY "documents_tenant_isolation" ON claim_documents
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- claim_supplements
DROP POLICY IF EXISTS "supplements_tenant_isolation" ON claim_supplements;
CREATE POLICY "supplements_tenant_isolation" ON claim_supplements
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- email_drafts
DROP POLICY IF EXISTS "email_drafts_tenant_isolation" ON email_drafts;
CREATE POLICY "email_drafts_tenant_isolation" ON email_drafts
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- ============================================================================
-- Priority 2: Enable RLS on unprotected tenant tables
-- ============================================================================

-- claim_outcomes (has tenant_id, RLS was disabled, 0 rows)
ALTER TABLE claim_outcomes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "claim_outcomes_tenant_isolation" ON claim_outcomes
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );

-- packets (has tenant_id, RLS was disabled, 0 rows)
ALTER TABLE packets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packets_tenant_isolation" ON packets
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  ) WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid())
  );
