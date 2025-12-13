-- Migration: Login Activity Log
-- Rollback: DROP TABLE IF EXISTS login_activity;

-- ============================================
-- Login Activity Table
-- ============================================
-- Tracks login attempts for security auditing

CREATE TABLE IF NOT EXISTS login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,  -- Store even if user is deleted

  -- Event type
  event_type VARCHAR(50) NOT NULL,  -- login_success, login_failed, logout, password_reset, mfa_challenge, mfa_verified

  -- Device/Browser information
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),  -- desktop, mobile, tablet
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),

  -- Location (from IP geolocation)
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  location_country VARCHAR(100),
  location_country_code VARCHAR(10),
  location_lat DECIMAL(9,6),
  location_lng DECIMAL(9,6),

  -- Failure details
  failure_reason TEXT,  -- invalid_password, account_locked, mfa_failed, user_not_found, etc.

  -- Additional metadata
  metadata JSONB DEFAULT '{}',

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_login_activity_user
  ON login_activity(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_activity_email
  ON login_activity(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_activity_tenant
  ON login_activity(tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_activity_type
  ON login_activity(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_login_activity_ip
  ON login_activity(ip_address, created_at DESC);

-- Partial index for recent failed attempts (for rate limiting)
CREATE INDEX IF NOT EXISTS idx_login_activity_failed_recent
  ON login_activity(email, created_at DESC)
  WHERE event_type = 'login_failed';

-- RLS Policies
ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

-- Users can view their own login activity
CREATE POLICY "Users can view own login activity"
  ON login_activity
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role can insert login activity (during auth)
CREATE POLICY "Service role can insert login activity"
  ON login_activity
  FOR INSERT
  WITH CHECK (true);  -- Controlled by service role key

-- Admins can view all tenant login activity
CREATE POLICY "Admins can view tenant login activity"
  ON login_activity
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Add comment
COMMENT ON TABLE login_activity IS 'Audit log of login attempts and authentication events';
