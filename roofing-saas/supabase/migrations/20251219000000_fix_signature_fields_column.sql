-- Migration: Fix missing signature_fields column on signature_documents
-- The column should have been added by 20251213180000 but it's missing

-- Add signature_fields column if it doesn't exist
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS signature_fields JSONB DEFAULT '[]';

-- Add comment explaining the column
COMMENT ON COLUMN signature_documents.signature_fields IS 'Array of field placements for document signing. Each field contains: id, type, label, page, x, y, width, height, required, assignedTo';

-- Create index for querying documents by field types (partial index for non-empty arrays)
CREATE INDEX IF NOT EXISTS idx_signature_documents_fields_gin
ON signature_documents USING GIN (signature_fields)
WHERE signature_fields != '[]'::jsonb;
