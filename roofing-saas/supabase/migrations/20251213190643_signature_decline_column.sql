-- Migration: Add decline_reason column to signature_documents
-- Rollback: ALTER TABLE signature_documents DROP COLUMN IF EXISTS decline_reason; ALTER TABLE signature_documents DROP COLUMN IF EXISTS declined_at;

-- Add decline_reason column to store reason when document is declined
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS decline_reason TEXT;

-- Add declined_at timestamp to track when document was declined
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- Add comment for documentation
COMMENT ON COLUMN signature_documents.decline_reason IS 'Reason provided by signer when declining the document';
COMMENT ON COLUMN signature_documents.declined_at IS 'Timestamp when the document was declined';
