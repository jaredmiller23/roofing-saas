-- ============================================
-- User Management Migrations - Run in Supabase SQL Editor
-- ============================================
-- Copy and paste this entire file into:
-- https://supabase.com/dashboard/project/wfifizczqvogbcqamnmw/sql
-- Then click "Run"
-- ============================================

-- Migration 1: User Notification Preferences
-- ============================================

CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Email notifications
  email_new_lead BOOLEAN DEFAULT true,
  email_project_update BOOLEAN DEFAULT true,
  email_task_assigned BOOLEAN DEFAULT true,
  email_message_received BOOLEAN DEFAULT true,
  email_document_signed BOOLEAN DEFAULT true,
  email_daily_digest BOOLEAN DEFAULT false,
  email_weekly_report BOOLEAN DEFAULT true,

  -- SMS notifications
  sms_new_lead BOOLEAN DEFAULT false,
  sms_project_update BOOLEAN DEFAULT false,
  sms_task_assigned BOOLEAN DEFAULT true,
  sms_message_received BOOLEAN DEFAULT true,
  sms_urgent_only BOOLEAN DEFAULT true,

  -- Push notifications (PWA)
  push_enabled BOOLEAN DEFAULT true,
  push_new_lead BOOLEAN DEFAULT true,
  push_project_update BOOLEAN DEFAULT true,
  push_task_assigned BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_user_notification_preferences UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant ON user_notification_preferences(tenant_id);

ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
  ON user_notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences FOR UPDATE USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_prefs_updated_at ON user_notification_preferences;
CREATE TRIGGER notification_prefs_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Migration 2: User Sessions
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  session_token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  location_country VARCHAR(100),
  location_country_code VARCHAR(10),
  is_current BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_reason VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id, revoked_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, last_active_at DESC) WHERE revoked_at IS NULL;

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON user_sessions FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON user_sessions FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Service role can insert sessions"
  ON user_sessions FOR INSERT WITH CHECK (true);

-- Migration 3: Login Activity
-- ============================================

CREATE TABLE IF NOT EXISTS login_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_type VARCHAR(50),
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  location_city VARCHAR(100),
  location_region VARCHAR(100),
  location_country VARCHAR(100),
  location_country_code VARCHAR(10),
  location_lat DECIMAL(9,6),
  location_lng DECIMAL(9,6),
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_activity_user ON login_activity(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_email ON login_activity(email, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_tenant ON login_activity(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_type ON login_activity(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_ip ON login_activity(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_activity_failed_recent ON login_activity(email, created_at DESC) WHERE event_type = 'login_failed';

ALTER TABLE login_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login activity"
  ON login_activity FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can insert login activity"
  ON login_activity FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view tenant login activity"
  ON login_activity FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Migration 4: User Deactivation
-- ============================================

ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
    CHECK (status IN ('active', 'deactivated', 'suspended', 'pending'));

ALTER TABLE tenant_users
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_tenant_users_status ON tenant_users(tenant_id, status);

CREATE OR REPLACE FUNCTION set_deactivation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'deactivated' AND OLD.status != 'deactivated' THEN
    NEW.deactivated_at = NOW();
  ELSIF NEW.status = 'active' AND OLD.status = 'deactivated' THEN
    NEW.deactivated_at = NULL;
    NEW.deactivated_by = NULL;
    NEW.deactivation_reason = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_deactivation_timestamp ON tenant_users;
CREATE TRIGGER trigger_set_deactivation_timestamp
  BEFORE UPDATE ON tenant_users
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION set_deactivation_timestamp();

-- ============================================
-- Done! All migrations applied successfully.
-- ============================================
