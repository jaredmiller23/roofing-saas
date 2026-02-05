-- Migration: Add signing_token column to signature_documents for public URL authentication
-- Rollback: ALTER TABLE signature_documents DROP COLUMN IF EXISTS signing_token;

-- Add signing_token column (crypto-random token required to access public signing URLs)
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS signing_token TEXT;

-- Add index for token lookups
CREATE INDEX IF NOT EXISTS idx_signature_documents_signing_token
ON signature_documents (signing_token)
WHERE signing_token IS NOT NULL;

COMMENT ON COLUMN signature_documents.signing_token IS 'Crypto-random token required to access the public signing URL. Generated on send, regenerated on resend.';
