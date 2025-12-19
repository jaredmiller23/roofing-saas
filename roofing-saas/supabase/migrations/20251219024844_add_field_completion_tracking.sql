-- Migration: Add field completion tracking for E-Signature Phase 1.2
-- Date: 2025-12-19
-- Purpose: Store which fields were completed during signing for audit trail and progress recovery

-- Add completed_fields column to signatures table
-- Structure: [{ field_id: string, completed_at: timestamp, value_hash?: string }]
ALTER TABLE signatures
ADD COLUMN IF NOT EXISTS completed_fields JSONB DEFAULT '[]';

-- Add comment explaining the column
COMMENT ON COLUMN signatures.completed_fields IS 'Array of completed field records during signing. Each record contains: field_id, completed_at timestamp, and optional value_hash for audit trail';

-- Add notify_signers_on_complete to signature_documents table
-- Controls whether all signers receive email when document is fully signed
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS notify_signers_on_complete BOOLEAN DEFAULT true;

COMMENT ON COLUMN signature_documents.notify_signers_on_complete IS 'When true, all signers receive notification email when document is fully signed';

-- Create index for querying signatures by completed fields (for progress recovery)
CREATE INDEX IF NOT EXISTS idx_signatures_document_completed
ON signatures (document_id)
WHERE completed_fields != '[]'::jsonb;

-- Rollback (for reference):
-- ALTER TABLE signatures DROP COLUMN IF EXISTS completed_fields;
-- ALTER TABLE signature_documents DROP COLUMN IF EXISTS notify_signers_on_complete;
-- DROP INDEX IF EXISTS idx_signatures_document_completed;
