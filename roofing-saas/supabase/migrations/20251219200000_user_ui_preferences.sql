-- Migration: User UI Preferences
-- Rollback: DROP TABLE IF EXISTS user_ui_preferences;

-- ============================================
-- User UI Preferences Table
-- ============================================
-- Stores per-user UI/UX preferences including navigation style, theme, layout preferences

CREATE TABLE IF NOT EXISTS user_ui_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Navigation preferences
  nav_style VARCHAR(20) DEFAULT 'traditional' CHECK (nav_style IN ('traditional', 'instagram')),

  -- UI mode preferences (may be overridden by auto-detection)
  ui_mode VARCHAR(20) CHECK (ui_mode IN ('field', 'manager', 'full')),
  ui_mode_auto_detect BOOLEAN DEFAULT true,

  -- Theme and layout preferences (for future expansion)
  theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  sidebar_collapsed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One preferences record per user per tenant
  CONSTRAINT unique_user_ui_preferences UNIQUE (tenant_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_ui_prefs_user
  ON user_ui_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_ui_prefs_tenant
  ON user_ui_preferences(tenant_id);

-- RLS Policies
ALTER TABLE user_ui_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see their own preferences
CREATE POLICY "Users can view own UI preferences"
  ON user_ui_preferences
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert own UI preferences"
  ON user_ui_preferences
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update own UI preferences"
  ON user_ui_preferences
  FOR UPDATE
  USING (user_id = auth.uid());

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ui_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ui_prefs_updated_at
  BEFORE UPDATE ON user_ui_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_ui_prefs_updated_at();

-- Add comment
COMMENT ON TABLE user_ui_preferences IS 'User interface preferences including navigation style, UI mode, and layout settings';
COMMENT ON COLUMN user_ui_preferences.nav_style IS 'Navigation style preference: traditional (sidebar) or instagram (bottom nav)';
COMMENT ON COLUMN user_ui_preferences.ui_mode IS 'Preferred UI mode, may be overridden by auto-detection';
COMMENT ON COLUMN user_ui_preferences.ui_mode_auto_detect IS 'Whether to auto-detect UI mode based on device/context';
