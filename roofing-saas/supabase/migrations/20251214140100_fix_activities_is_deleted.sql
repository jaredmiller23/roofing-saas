-- Migration: Add missing is_deleted column to activities table
-- This column is referenced by indexes and functions but may not exist
-- Rollback: ALTER TABLE activities DROP COLUMN IF EXISTS is_deleted;

-- Add is_deleted column if it doesn't exist
ALTER TABLE activities
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create index for soft delete filtering if not exists
CREATE INDEX IF NOT EXISTS idx_activities_not_deleted
  ON activities(tenant_id)
  WHERE is_deleted = false;

-- Comment for documentation
COMMENT ON COLUMN activities.is_deleted IS 'Soft delete flag for activities';
