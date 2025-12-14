-- Migration: Add reminder tracking columns to signature_documents
-- Rollback: ALTER TABLE signature_documents DROP COLUMN IF EXISTS reminder_sent_at; ALTER TABLE signature_documents DROP COLUMN IF EXISTS reminder_count;

-- Add reminder_sent_at to track when the last reminder was sent
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ DEFAULT NULL;

-- Add reminder_count to track how many reminders have been sent (max 3 to avoid spam)
ALTER TABLE signature_documents
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- Add comments explaining the columns
COMMENT ON COLUMN signature_documents.reminder_sent_at IS 'Timestamp of the last reminder email sent for this document';
COMMENT ON COLUMN signature_documents.reminder_count IS 'Number of reminder emails sent for this document (max 3)';

-- Create index for efficient querying of documents needing reminders
-- Documents that are sent but not signed, not expired, and have room for more reminders
CREATE INDEX IF NOT EXISTS idx_signature_documents_reminder_candidates
ON signature_documents (expires_at, reminder_count, status)
WHERE status = 'sent' AND reminder_count < 3;
