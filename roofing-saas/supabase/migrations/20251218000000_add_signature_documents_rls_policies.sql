-- =====================================================
-- ADD RLS POLICIES FOR SIGNATURE_DOCUMENTS
-- Date: 2025-12-18
-- Issue: signature_documents queries fail for authenticated users
-- Cause: RLS enabled but no policies exist
-- =====================================================

-- Ensure RLS is enabled
ALTER TABLE signature_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to ensure clean state)
DROP POLICY IF EXISTS "Users can view signature documents in their tenant" ON signature_documents;
DROP POLICY IF EXISTS "Users can insert signature documents in their tenant" ON signature_documents;
DROP POLICY IF EXISTS "Users can update signature documents in their tenant" ON signature_documents;
DROP POLICY IF EXISTS "Users can delete signature documents in their tenant" ON signature_documents;

-- Create SELECT policy
CREATE POLICY "Users can view signature documents in their tenant"
ON signature_documents FOR SELECT
USING (tenant_id = get_user_tenant_id());

-- Create INSERT policy
CREATE POLICY "Users can insert signature documents in their tenant"
ON signature_documents FOR INSERT
WITH CHECK (tenant_id = get_user_tenant_id());

-- Create UPDATE policy
CREATE POLICY "Users can update signature documents in their tenant"
ON signature_documents FOR UPDATE
USING (tenant_id = get_user_tenant_id());

-- Create DELETE policy
CREATE POLICY "Users can delete signature documents in their tenant"
ON signature_documents FOR DELETE
USING (tenant_id = get_user_tenant_id());

-- Also add policies for the signatures table if not exists
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view signatures in their tenant" ON signatures;
DROP POLICY IF EXISTS "Users can insert signatures" ON signatures;
DROP POLICY IF EXISTS "Users can update signatures" ON signatures;

-- Signatures are accessed via their parent document
-- Use a subquery to check tenant ownership
CREATE POLICY "Users can view signatures in their tenant"
ON signatures FOR SELECT
USING (
  document_id IN (
    SELECT id FROM signature_documents WHERE tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "Users can insert signatures"
ON signatures FOR INSERT
WITH CHECK (
  document_id IN (
    SELECT id FROM signature_documents WHERE tenant_id = get_user_tenant_id()
  )
);

CREATE POLICY "Users can update signatures"
ON signatures FOR UPDATE
USING (
  document_id IN (
    SELECT id FROM signature_documents WHERE tenant_id = get_user_tenant_id()
  )
);
