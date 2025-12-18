-- =====================================================
-- FIX NULL is_deleted VALUES IN signature_documents
-- Date: 2025-12-18
-- Issue: Existing documents may have NULL is_deleted
-- which breaks queries using .eq('is_deleted', false)
-- =====================================================

-- Update any NULL is_deleted to false
UPDATE signature_documents
SET is_deleted = false
WHERE is_deleted IS NULL;

-- Alter the column to have NOT NULL constraint with default
-- This prevents future NULL values
ALTER TABLE signature_documents
ALTER COLUMN is_deleted SET DEFAULT false;

ALTER TABLE signature_documents
ALTER COLUMN is_deleted SET NOT NULL;

-- Verify the fix
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM signature_documents
  WHERE is_deleted IS NULL;

  IF null_count = 0 THEN
    RAISE NOTICE 'SUCCESS: No NULL is_deleted values remain';
  ELSE
    RAISE WARNING 'WARNING: % NULL is_deleted values still exist', null_count;
  END IF;
END $$;
