-- Migration: User Sessions Tracking
-- Rollback: DROP TABLE IF EXISTS user_sessions;

-- ============================================
-- User Sessions Table
-- ============================================
-- Tracks active user sessions for security and management

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Session identification
  session_token_hash TEXT NOT NULL,  -- Hash of refresh token for identification

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

  -- Session state
  is_current BOOLEAN DEFAULT false,  -- Is this the session making the request?

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,

  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(100)  -- user_action, admin_action, security, expired
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_sessions_user
  ON user_sessions(user_id, revoked_at NULLS FIRST);

CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant
  ON user_sessions(tenant_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token
  ON user_sessions(session_token_hash);

CREATE INDEX IF NOT EXISTS idx_user_sessions_active
  ON user_sessions(user_id, last_active_at DESC)
  WHERE revoked_at IS NULL;

-- RLS Policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions"
  ON user_sessions
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own sessions (for revoking)
CREATE POLICY "Users can update own sessions"
  ON user_sessions
  FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can insert sessions (during login)
CREATE POLICY "Service role can insert sessions"
  ON user_sessions
  FOR INSERT
  WITH CHECK (true);  -- Controlled by service role key

-- Trigger to update last_active_at
CREATE OR REPLACE FUNCTION update_session_last_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_active_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON TABLE user_sessions IS 'Tracks user login sessions for security management';
