-- Migration: User Notification Preferences
-- Rollback: DROP TABLE IF EXISTS user_notification_preferences;

-- ============================================
-- User Notification Preferences Table
-- ============================================
-- Stores per-user notification settings for email, SMS, and push notifications

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

  -- One preferences record per user per tenant
  CONSTRAINT unique_user_notification_preferences UNIQUE (tenant_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_prefs_user
  ON user_notification_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_tenant
  ON user_notification_preferences(tenant_id);

-- RLS Policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own notification preferences"
  ON user_notification_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own notification preferences"
  ON user_notification_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own notification preferences"
  ON user_notification_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_notification_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_prefs_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_prefs_updated_at();

-- Add comment
COMMENT ON TABLE user_notification_preferences IS 'User notification preferences for email, SMS, and push notifications';
