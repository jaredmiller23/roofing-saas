-- Migration: User Deactivation System
-- Rollback: ALTER TABLE tenant_users DROP COLUMN status, DROP COLUMN deactivated_at, DROP COLUMN deactivated_by, DROP COLUMN deactivation_reason;

-- ============================================
-- Add status columns to tenant_users
-- ============================================
-- Enables soft-disable of users while preserving audit trail

-- Add status column with check constraint
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'deactivated', 'suspended', 'pending'));

-- Add deactivation tracking columns
ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Index for efficient status filtering
CREATE INDEX IF NOT EXISTS idx_tenant_users_status
  ON tenant_users(tenant_id, status);

-- Function to automatically set deactivated_at timestamp
CREATE OR REPLACE FUNCTION set_deactivation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'deactivated' AND OLD.status != 'deactivated' THEN
    NEW.deactivated_at = NOW();
  ELSIF NEW.status = 'active' AND OLD.status = 'deactivated' THEN
    -- Clear deactivation fields on reactivation
    NEW.deactivated_at = NULL;
    NEW.deactivated_by = NULL;
    NEW.deactivation_reason = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic timestamp management
DROP TRIGGER IF EXISTS trigger_set_deactivation_timestamp ON tenant_users;
CREATE TRIGGER trigger_set_deactivation_timestamp
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_deactivation_timestamp();

-- Add comment
COMMENT ON COLUMN tenant_users.status IS 'User status: active, deactivated, suspended, or pending';
COMMENT ON COLUMN tenant_users.deactivated_at IS 'Timestamp when user was deactivated';
COMMENT ON COLUMN tenant_users.deactivated_by IS 'User ID of admin who deactivated this user';
COMMENT ON COLUMN tenant_users.deactivation_reason IS 'Reason for deactivation (optional)';
