-- Admin User Impersonation System
-- Allows admins to view the application as another user for support and performance reviews

-- ============================================================================
-- 1. IMPERSONATION LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS impersonation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Who is impersonating whom
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  impersonated_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- When
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_seconds INT GENERATED ALWAYS AS (
    CASE
      WHEN ended_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (ended_at - started_at))::INT
      ELSE NULL
    END
  ) STORED,

  -- Why (optional but recommended)
  reason TEXT,

  -- Context
  ip_address INET,
  user_agent TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired', 'terminated')),

  -- Ensure different users
  CONSTRAINT different_users CHECK (admin_user_id != impersonated_user_id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_impersonation_logs_admin
  ON impersonation_logs(admin_user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_impersonated
  ON impersonation_logs(impersonated_user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_tenant
  ON impersonation_logs(tenant_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_impersonation_logs_status
  ON impersonation_logs(status) WHERE status = 'active';

-- ============================================================================
-- 2. UPDATE ACTIVITIES TABLE FOR ATTRIBUTION
-- ============================================================================

-- Add columns to track impersonated actions
ALTER TABLE activities ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS on_behalf_of UUID REFERENCES auth.users(id);
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_impersonated_action BOOLEAN DEFAULT false;

-- Backfill existing records (performed_by = user_id for historical data)
UPDATE activities
SET performed_by = user_id
WHERE performed_by IS NULL;

-- ============================================================================
-- 3. EFFECTIVE USER ID FUNCTION (Core of RLS)
-- ============================================================================

-- This function returns the user ID that RLS policies should use
-- If admin is impersonating, returns impersonated user ID
-- Otherwise returns the actual authenticated user ID
CREATE OR REPLACE FUNCTION get_effective_user_id()
RETURNS UUID AS $$
DECLARE
  impersonated_user_id UUID;
  is_admin BOOLEAN;
BEGIN
  -- Try to get impersonated user ID from session variable
  -- This is set by middleware when impersonation is active
  BEGIN
    impersonated_user_id := current_setting('app.impersonated_user_id', true)::uuid;
  EXCEPTION
    WHEN OTHERS THEN
      impersonated_user_id := NULL;
  END;

  -- If impersonation is active, validate that current user is admin
  IF impersonated_user_id IS NOT NULL THEN
    -- Check if current authenticated user is an admin
    SELECT EXISTS (
      SELECT 1 FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    ) INTO is_admin;

    -- If admin, return impersonated user ID
    IF is_admin THEN
      RETURN impersonated_user_id;
    END IF;
  END IF;

  -- Default: return actual authenticated user
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_effective_user_id() TO authenticated;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is currently being impersonated
CREATE OR REPLACE FUNCTION is_being_impersonated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.impersonated_user_id', true) IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_being_impersonated() TO authenticated;

-- Function to get admin user ID during impersonation
CREATE OR REPLACE FUNCTION get_admin_user_id()
RETURNS UUID AS $$
DECLARE
  admin_id UUID;
BEGIN
  IF is_being_impersonated() THEN
    BEGIN
      admin_id := current_setting('app.admin_user_id', true)::uuid;
      RETURN admin_id;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN NULL;
    END;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_admin_user_id() TO authenticated;

-- Function to set impersonation session variables
-- Called by server-side code to activate impersonation for current connection
CREATE OR REPLACE FUNCTION set_impersonation_session(
  p_admin_user_id UUID,
  p_impersonated_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  -- Set session variables that get_effective_user_id() reads
  PERFORM set_config('app.impersonated_user_id', p_impersonated_user_id::text, false);
  PERFORM set_config('app.admin_user_id', p_admin_user_id::text, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION set_impersonation_session(UUID, UUID) TO authenticated;

-- ============================================================================
-- 5. RLS POLICIES FOR IMPERSONATION LOGS
-- ============================================================================

ALTER TABLE impersonation_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all impersonation logs in their tenant
CREATE POLICY "Admins can view impersonation logs"
  ON impersonation_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Admins can insert logs (when starting impersonation)
CREATE POLICY "Admins can create impersonation logs"
  ON impersonation_logs FOR INSERT
  WITH CHECK (
    admin_user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Admins can update their own logs (when ending impersonation)
CREATE POLICY "Admins can update own impersonation logs"
  ON impersonation_logs FOR UPDATE
  USING (
    admin_user_id = auth.uid() AND
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- Users can view logs of who impersonated them (for transparency)
CREATE POLICY "Users can view own impersonation history"
  ON impersonation_logs FOR SELECT
  USING (
    impersonated_user_id = auth.uid()
  );

-- ============================================================================
-- 6. UPDATE TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_impersonation_log_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_impersonation_log_updated_at
  BEFORE UPDATE ON impersonation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_impersonation_log_updated_at();

-- ============================================================================
-- 7. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE impersonation_logs IS 'Audit trail for admin user impersonation sessions';
COMMENT ON COLUMN impersonation_logs.admin_user_id IS 'Admin who is performing the impersonation';
COMMENT ON COLUMN impersonation_logs.impersonated_user_id IS 'User being impersonated';
COMMENT ON COLUMN impersonation_logs.reason IS 'Optional reason for impersonation (e.g., "Performance review", "Support ticket #123")';
COMMENT ON COLUMN impersonation_logs.status IS 'active: ongoing, ended: manually stopped, expired: timed out, terminated: force-stopped';

COMMENT ON FUNCTION get_effective_user_id() IS 'Returns impersonated user ID if admin is impersonating, otherwise returns authenticated user ID';
COMMENT ON FUNCTION is_being_impersonated() IS 'Returns true if current session is an impersonation session';
COMMENT ON FUNCTION get_admin_user_id() IS 'Returns admin user ID during impersonation, null otherwise';

-- ============================================================================
-- 8. EXAMPLE RLS POLICY UPDATE (for reference)
-- ============================================================================

-- Example of how to update existing RLS policies to support impersonation
-- This is just an example - actual policies will be updated in a separate migration

COMMENT ON DATABASE postgres IS '
To update existing RLS policies for impersonation support:

1. Find all policies using auth.uid()
2. Replace with get_effective_user_id()

Example:
-- OLD:
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
    )
  );

-- NEW:
CREATE POLICY "Users can view own contacts"
  ON contacts FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users WHERE user_id = get_effective_user_id()
    )
  );
';
