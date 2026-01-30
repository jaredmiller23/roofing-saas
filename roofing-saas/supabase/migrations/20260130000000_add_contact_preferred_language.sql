-- Migration: Add preferred_language to contacts
-- Purpose: ARIA Phase 11 - Multi-language support
-- Rollback: ALTER TABLE contacts DROP COLUMN preferred_language;

-- Add preferred_language column (nullable, defaults to NULL = English/unset)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT NULL;

-- Partial index: only index contacts that have a language preference set
CREATE INDEX IF NOT EXISTS idx_contacts_preferred_language
  ON contacts (preferred_language)
  WHERE preferred_language IS NOT NULL;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
