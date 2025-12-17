-- =====================================================
-- FIX SIGNATURE DOCUMENTS MISSING COLUMNS
-- Date: 2025-12-17
-- Issue: signature_documents table exists but missing some expected columns
-- =====================================================

-- Add missing columns to signature_documents table if they don't exist
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure we have all the status check constraints
DO $$
BEGIN
    -- Drop existing constraint if it exists (to replace with updated version)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signature_documents_status_check') THEN
        ALTER TABLE signature_documents DROP CONSTRAINT signature_documents_status_check;
    END IF;

    -- Add the constraint with all expected status values
    ALTER TABLE signature_documents
    ADD CONSTRAINT signature_documents_status_check
    CHECK (status IN ('draft', 'sent', 'viewed', 'signed', 'expired', 'declined'));
EXCEPTION
    WHEN OTHERS THEN
        -- Constraint might already exist with same values, ignore
        NULL;
END $$;

-- Ensure document_type constraint exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'signature_documents_document_type_check') THEN
        ALTER TABLE signature_documents DROP CONSTRAINT signature_documents_document_type_check;
    END IF;

    ALTER TABLE signature_documents
    ADD CONSTRAINT signature_documents_document_type_check
    CHECK (document_type IN ('contract', 'estimate', 'change_order', 'waiver', 'other'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Create missing indexes (IF NOT EXISTS will prevent duplicates)
CREATE INDEX IF NOT EXISTS idx_signature_docs_tenant_status
ON signature_documents(tenant_id, status)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_signature_docs_created
ON signature_documents(created_at DESC)
WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_signature_docs_project
ON signature_documents(project_id)
WHERE is_deleted = false;

-- Enable RLS if not already enabled
ALTER TABLE signature_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist (will fail silently if they exist)
DO $$
BEGIN
    -- Check if policies exist and create them if they don't
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'signature_documents'
        AND policyname = 'Users can view signature documents in their tenant'
    ) THEN
        CREATE POLICY "Users can view signature documents in their tenant"
        ON signature_documents FOR SELECT
        USING (tenant_id = get_user_tenant_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'signature_documents'
        AND policyname = 'Users can insert signature documents in their tenant'
    ) THEN
        CREATE POLICY "Users can insert signature documents in their tenant"
        ON signature_documents FOR INSERT
        WITH CHECK (tenant_id = get_user_tenant_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'signature_documents'
        AND policyname = 'Users can update signature documents in their tenant'
    ) THEN
        CREATE POLICY "Users can update signature documents in their tenant"
        ON signature_documents FOR UPDATE
        USING (tenant_id = get_user_tenant_id());
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'signature_documents'
        AND policyname = 'Users can delete signature documents in their tenant'
    ) THEN
        CREATE POLICY "Users can delete signature documents in their tenant"
        ON signature_documents FOR DELETE
        USING (tenant_id = get_user_tenant_id());
    END IF;
END $$;

-- Create updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_signature_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_signature_documents_updated_at ON signature_documents;
CREATE TRIGGER update_signature_documents_updated_at
    BEFORE UPDATE ON signature_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_signature_documents_updated_at();