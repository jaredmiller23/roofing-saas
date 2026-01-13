-- Migration: Add unique constraint to signatures table
-- Purpose: Prevent duplicate signatures from the same signer on the same document
-- Rollback: DROP INDEX IF EXISTS unique_document_signer;

-- Add unique constraint on (document_id, signer_email, signer_type)
-- This prevents the same person from signing the same document multiple times
-- Note: Using unique index instead of constraint for more control

CREATE UNIQUE INDEX IF NOT EXISTS unique_document_signer
ON signatures (document_id, signer_email, signer_type);

-- Add comment for documentation
COMMENT ON INDEX unique_document_signer IS 'Prevents duplicate signatures from the same signer on the same document';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
